# Size Index Port Plan (SQLite folder-size cache)

## Objetivo

Traer el **índice de tamaños de carpeta en SQLite** que vive en la rama `file_indexing` a la rama
actual `0.2.0`, para que Properties / InfoPanel / la columna "Size" de la lista lean tamaños
**persistidos** (instantáneos) en vez de recalcular con `jwalk` en cada sesión.

Se hace en dos fases:

- **Fase A** — índice persistente con resync por `mtime` al leer (sin watcher en vivo).
- **Fase B** — watcher recursivo (`notify`) que mantiene el índice fresco y emite cambios en vivo.

> No se mergea la rama. `file_indexing` está basada en `e04c331` (0.2.0 está 44 commits adelante;
> file_indexing solo 4) y le faltan features de 0.2.0 (keymap/context_menu/folder_columns/system,
> thumbnails, copy/move con progreso, tabs, settings…). Un merge revertiría todo eso. Se **porta**
> `index.rs` (+ `ignore.rs`, y en B `watcher.rs`) adaptándolo a la estructura de 0.2.0.

Plan creado el 28 de junio de 2026.

## Contexto técnico

- Hoy `get_dir_size` (en `src-tauri/src/filesystem/fs.rs`) es `async fn ... -> u64` y camina con
  `jwalk` en cada llamada. El frontend lo consume vía `fs.getDirSize(path)` en:
  - `useDirSizes` (columna Size de la lista, detrás de `FEATURE_FLAGS.directorySizes`).
  - `useEntrySize` (Properties / InfoPanel) + la cache en memoria `dirSizeCache` (que metimos como
    paliativo y queda **redundante** tras este port).
- En `file_indexing`, `index.rs` ya implementa:
  - Tabla `dir_size(path, parent, own_size, subtree_size, mtime)` en `size_index.db`
    (`app_config_dir`).
  - `get_dir_size(path, index: State, ignore: State) -> Result<u64,String>` con **cache-hit por
    `mtime`** y re-index completo en miss (`delete_subtree` + `index_subtree`).
  - Helpers incrementales para el watcher: `resync_dir`, `bubble`, `subtree_of`, `reconcile`.
  - `init()` que abre la DB y crea el schema; `SizeIndex(Arc<Mutex<Connection>>)` como estado Tauri.
  - `ignore.rs` (`IgnoreList`) para no indexar/observar el propio data dir (evita loop de eventos).

---

## Fase A — Índice persistente (resync por mtime)

### Backend (Rust)

1. **Cargo.toml**: agregar `rusqlite = { version = "0.32", features = ["bundled"] }`. (Mantener todo
   lo demás de 0.2.0; NO tocar `tauri-plugin-fs` ni quitar `image`/`arboard`.)
2. **Portar `src-tauri/src/index.rs`** desde `file_indexing` (casi tal cual). Revisar imports/`dlog!`
   (ver paso 6).
3. **Portar `src-tauri/src/ignore.rs`** (la `IgnoreList`).
4. **`main.rs`**:
   - `mod index; mod ignore;`
   - En `setup`: construir `IgnoreList` con el `app_config_dir` (donde vive `size_index.db`),
     `let size_index = index::init(app.handle())?;`, `app.manage(size_index);`,
     `app.manage(ignore_list);`.
   - **Quitar** `filesystem::fs::get_dir_size` del `generate_handler!` y **agregar**
     `index::get_dir_size` (mismo nombre de comando → el frontend no cambia).
   - (Opcional) `reconcile` al arrancar en un thread, como en `file_indexing`.
5. **`fs.rs`**: eliminar el `get_dir_size` viejo (jwalk) para que no choque el nombre del comando.
   Conservar `entry_total_bytes`/jwalk si los usa el progreso de copy (no relacionado).
6. **`dlog!`**: `index.rs` usa `crate::dlog!`. Portar la macro (está en `main.rs` de `file_indexing`)
   o reemplazar por `println!`/quitar.

### Frontend

7. **Casi sin cambios**: `api.getDirSize` sigue invocando `"get_dir_size"` con `{ path }`. Ahora
   resuelve al instante en cache-hit. (El comando devuelve `Result` → rechaza la promesa en error;
   `useDirSizes`/`useEntrySize` ya tienen `catch`.)
8. **Limpieza**: quitar `dirSizeCache` (en memoria) ya que el índice SQLite la reemplaza —
   `useEntrySize` y `useDirSizes` vuelven a su forma sin la cache JS. (O dejarla como L1 trivial; mi
   recomendación: quitarla para no tener dos caches.)

### Resultado A

- `size_index.db` se vuelve a usar y **persiste entre reinicios**.
- Cache-hit por `mtime` de la carpeta → instantáneo. Miss → re-walk una vez y se cachea.
- **Limitación**: si cambia un archivo **profundo** sin alterar el `mtime` de la carpeta consultada,
  el tamaño queda viejo hasta que algo lo invalide. Eso lo resuelve la Fase B.

### Pruebas A

- `cargo check` + `npm run build`.
- `npm run tauri dev`: abrir una carpeta grande (1ra vez calcula, 2da instantánea); reiniciar la app
  → sigue instantánea (persistió). Properties de carpeta = instantáneo si ya estaba indexada.

---

## Fase B — Watcher en vivo (índice incremental)

### Backend (Rust)

1. **Cargo.toml**: agregar `notify = "6"`.
2. **Portar `src-tauri/src/watcher.rs`** (`DirWatcher` + comando `watch_directory`): observa recursivo,
   y ante cambios usa `index::resync_dir` + `index::bubble` para actualizar `dir_size` y propagar el
   delta a los ancestros, emitiendo un evento `dir-size-changed { path, size }` al frontend.
3. **`main.rs`**: `mod watcher;`, `app.manage(watcher::DirWatcher::new());`, registrar
   `watcher::watch_directory` en `generate_handler!`.
4. **`ignore.rs`**: ya se usa para no observar/escribir-loop el data dir (clave con el watcher).
5. **Coexistencia con el watcher actual**: 0.2.0 ya observa el directorio actual con
   `tauri-plugin-fs` "watch" (para refrescar el listado). El watcher de tamaños es **otro** propósito
   (mantener el índice recursivo). Decidir:
   - **B1**: dejar ambos (fs-plugin para refrescar listado + notify para el índice). Más simple de
     portar, dos watchers.
   - **B2**: unificar todo en un solo watcher. Más limpio pero más trabajo y riesgo. → Empezar con B1.

### Frontend

6. **`useDirSizes`**: tras pedir tamaños, `watch_directory(path)` y `listen('dir-size-changed')` para
   actualizar el mapa en vivo (como en `file_indexing`). Tear-down al cambiar de carpeta.
7. **`StatusBar`**: (opcional) indicador `indexing` mientras reconcilia, como en `file_indexing`.
8. **`api.ts` / `FileSystemManager`**: agregar `watchDirSizes`/`watch_directory` + el `listen`.

### Resultado B

- Tamaños se mantienen frescos automáticamente ante cambios (incluso profundos) sin re-walk completo.
- Updates en vivo en la columna Size y en Properties/InfoPanel.

### Pruebas B

- Crear/borrar/mover archivos dentro de una carpeta abierta (desde la terminal) → el tamaño se
  actualiza solo. Verificar que escribir `size_index.db` **no** dispara un loop (lo cubre `IgnoreList`).

---

## Riesgos y consideraciones

- **`size_index.db` actual (135 MB)**: es de la corrida vieja. Al portar, conviene **borrarlo** una vez
  para que se regenere con el schema actual (o versionar el schema). Está en `app_config_dir`.
- **`.gitignore`**: la DB vive en el data dir del usuario, no en el repo → no hace falta gitignore,
  pero confirmar que nada de `src-tauri/target` ni la DB se commitee.
- **macOS APFS / clonefile**: ya cubierto aparte (copy). No afecta al índice.
- **Tamaño del binario**: `rusqlite` bundled agrega el SQLite estático (acepta el peso).
- **Concurrencia**: `SizeIndex(Arc<Mutex<Connection>>)` serializa accesos; las lecturas pesadas van en
  `spawn_blocking` (ya está así en `index.rs`).
- **Compatibilidad de comando**: mantener el nombre `get_dir_size` y la forma `{ path }` para no tocar
  el frontend en A.

## Checklist de entrega

**Fase A**

- [ ] `rusqlite` en Cargo; `cargo check` ok.
- [ ] `index.rs` + `ignore.rs` portados; `dlog!`/imports resueltos.
- [ ] `main.rs`: manage + `index::get_dir_size` registrado; `fs::get_dir_size` viejo removido.
- [ ] `dirSizeCache` (JS) removido; `useEntrySize`/`useDirSizes` limpios.
- [ ] Borrar `size_index.db` viejo y verificar regeneración + persistencia entre reinicios.

**Fase B**

- [ ] `notify` en Cargo; `watcher.rs` portado; `watch_directory` registrado.
- [ ] `useDirSizes` con `watch_directory` + `listen('dir-size-changed')`.
- [ ] (Opcional) indicador `indexing` en StatusBar.
- [ ] Verificar no-loop con `IgnoreList` al escribir la DB.
