# Recents Plan (Finder-style recent files)

## Objetivo

Quitar el grupo **"Recent"** del sidebar (hoy = carpetas visitadas) y reemplazarlo por un ítem
**"Recents"** dentro de **Pinned** que abre un listado de **archivos recientes del sistema**, como
el smart folder de Finder (Spotlight). Opción **A** (Spotlight real) elegida sobre B.

Plan creado el 28 de junio de 2026.

## Idea clave: path centinela

Los Recents no son una carpeta real (no hay `/path`). Para **reusar la vista Directory entera**
(DirEntry, preview, context-menu, doble-click → abre el archivo real), usamos un **path centinela**
`RECENTS`. Cada entrada tiene su path real, así que casi todo funciona; solo desactivamos lo que
no aplica a un listado "sin carpeta".

## Backend (Rust) — chico

1. `functions/recents.rs` (o en `filesystem`): comando `get_recent_files() -> Vec<DirEntry>`.
   - Corre `mdfind` por `kMDItemFSContentChangeDate` reciente, acotado al home, límite ~50.
     Ej: `mdfind -onlyin $HOME 'kMDItemFSContentChangeDate >= $time.today(-30)'` (ajustar query),
     o NSMetadataQuery (más nativo, más código → empezar con `mdfind`).
   - Para cada path: `build_dir_entry` (ya existe en `fs.rs`) → reusar. Ordenar por modified desc.
   - `spawn_blocking` (igual que copy/dir-size) para no bloquear.
2. `main.rs`: registrar `get_recent_files` en `generate_handler!`.

## Frontend

3. **Constante** `RECENTS` (path centinela) en `shared/constants.ts` (ej. `"recents://"` — algo que
   nunca sea un path real).
4. **api.ts** `getRecentFiles(): Promise<DirEntry[]>` → `invoke("get_recent_files")`.
   **FileSystemManager** `getRecentFiles()` (+ ordena si hace falta).
5. **`useDirectoryContents`** (`loadDirectory`): si `target === RECENTS` → `fs.getRecentFiles()` en vez
   de `readDirectory`. El resto del flujo (setDirContent, route → Directory) igual.
6. **Sidebar**: 
   - Quitar el `<SidebarSection title={Recent}>` y `useRecentPaths`/`getRecentPaths` (si quedan sin uso,
     limpiar). `visitedPaths` que se pasaba al SideBar puede dejar de usarse.
   - Agregar "Recents" a los pinned (con su ícono, ej. `faClockRotateLeft`) → `onClick` = `setPath(RECENTS)`.
7. **i18n**: `t.sidebar.recents` ("Recents"); quitar/renombrar `t.sidebar.recent`.

## Puntos del core a manejar (lo delicado)

- **PathBar / PathInput**: hoy muestra `path`. Con `RECENTS` mostraría el centinela → feo. 
  → Mostrar vacío o un label "Recents" (no editable) cuando `path === RECENTS`.
- **goUp**: deshabilitado en modo Recents (no hay padre). `disabled={path === "" || path === RECENTS}`.
- **Watcher** (`useDirectoryContents`): no observar cuando `path === RECENTS` (no es dir real).
- **Route-sync effect**: `RECENTS` no es `""` → va a la ruta Directory (ok). Verificar que no intente
  navegar raro.
- **Zoom por carpeta / columnas / sort persistidos**: `get/setFolderZoom`/columns usan `path`. Con
  `RECENTS` → guardarían bajo "recents://". Aceptable (default), o saltar persistencia si `RECENTS`.
- **`useDirSizes`**: las entradas pueden ser archivos (no dirs) → ya filtra dirs; ok. Para recents,
  probablemente desactivar (no caminar tamaños de carpetas dispersas) → `enabled` false en RECENTS.
- **Selección/refresh**: `refreshDir()` con `RECENTS` → re-pedir `getRecentFiles()`. Ya cubierto por (5).
- **Tabs**: `RECENTS` es un path más en el historial del tab → funciona; el `tabLabel` debería mostrar
  "Recents" (basename de "recents://" sería feo) → caso especial en `tabLabel`.

## Caveats

- **Solo macOS** (`mdfind`). En otros SO, ocultar el pinned "Recents" o devolver vacío.
- Requiere Spotlight indexando el home.
- Rutas dispersas: no hay "subir", no hay watcher; es un listado de solo-lectura navegable por sus items.

## Checklist

- [ ] `get_recent_files` (Rust, mdfind + build_dir_entry + spawn_blocking) registrado.
- [ ] `RECENTS` const + `getRecentFiles` (api + manager).
- [ ] `loadDirectory` ramifica en `RECENTS`.
- [ ] Sidebar: quitar grupo Recent, agregar pinned "Recents"; limpiar `getRecentPaths`/`visitedPaths` si quedan sin uso.
- [ ] PathBar: label "Recents" + goUp disabled; watcher/dirSizes off en RECENTS.
- [ ] `tabLabel` caso especial; i18n `t.sidebar.recents`.
- [ ] macOS-only (ocultar pinned en otros SO).
