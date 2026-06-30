# Finder Tags Plan (tags nativos de macOS)

Plan creado el 30 de junio de 2026.

## Objetivo

Mostrar, asignar y filtrar **tags de Finder** — los nativos, no un sistema paralelo. Un tag puesto
en la app aparece en Finder y viceversa, porque se leen/escriben los **mismos metadatos** que usa
Finder. Pedido por un usuario; encaja con la naturaleza macOS-first del app.

## Decisión de plataformas (importante)

**macOS-only, con degradación limpia en el resto** — mismo patrón que Recents (`mdfind`).

- Los Finder tags son metadata nativa de Apple (xattr `com.apple.metadata:_kMDItemUserTags` +
  Spotlight `kMDItemUserTags`). No hay equivalente directo en Windows/Linux.
- **No** escribir una implementación Windows/Linux sin poder probarla — código no probado da falsa
  confianza y bugs invisibles. Peor que no tenerlo.
- En Windows/Linux: el backend devuelve tags vacíos y la UI **oculta** todo lo de tags (badges,
  menú, sección de sidebar). La app funciona igual, sin la feature.
- Dejar un **seam** explícito: el módulo de tags detrás de `#[cfg(target_os = "macos")]` con un
  stub `#[cfg(not(target_os = "macos"))]` que retorna vacío + `// TODO(win/linux): tag store
  propio si algún día se prueba`. Así un contribuidor futuro lo agrega sin refactor.

## Formato de los tags (macOS)

`_kMDItemUserTags` es un **plist binario**: array de strings, cada uno `"Nombre\nÍndiceColor"`.

| Índice | Color |
|---|---|
| 0 | (sin color) |
| 1 | Gris |
| 2 | Verde |
| 3 | Morado |
| 4 | Azul |
| 5 | Amarillo |
| 6 | Rojo |
| 7 | Naranja |

Un tag puede no tener color (solo nombre, índice 0). El nombre es libre (tags custom además de los
7 estándar).

## Backend (Rust) — `filesystem/tags.rs`, `#[cfg(macos)]`

Crates: `xattr` (leer/escribir el atributo) + `plist` (parsear/serializar el array binario).

- `struct Tag { name: String, color: u8 }` (serializa a la UI).
- `read_tags(path) -> Vec<Tag>`: leer xattr → parsear plist → split por `\n`.
- `set_tags(path, tags: Vec<Tag>)`: serializar plist binario → escribir xattr (o **borrar** el
  xattr si la lista queda vacía, que es como Finder lo deja "sin tags").
- Comando Tauri `set_file_tags(path, tags)` registrado en `main.rs`.
- `list_all_tags() -> Vec<Tag>`: tags conocidos para el filtro/sidebar. Empezar con los 7 estándar;
  opcional leer `~/Library/.../com.apple.finder` (`FavoriteTagNames`) más adelante.

**Performance — el punto delicado.** Leer xattr por archivo encarece listados grandes. Opciones:
1. **Lazy**: no leer tags en `build_dir_entry`; un comando aparte `get_tags_for(paths)` que la UI
   pide para las filas visibles. (Preferido.)
2. **Batch vía Spotlight**: `mdfind`/`mdls kMDItemUserTags` para la carpeta, evita N syscalls.
   Solo sirve si Spotlight indexa esa ruta.

Empezar con (1) lazy para no tocar el hot path de `read_directory`.

## Frontend

1. **Modelo**: `Tag { name, color }`; el `DirEntry`/fila puede traer `tags?: Tag[]` (poblado lazy).
2. **api.ts / FileSystemManager**: `getFileTags(paths)`, `setFileTags(path, tags)`, `listAllTags()`.
3. **UI fila**: dots de color (los 7 + un dot "outline" para sin-color) junto al nombre. Tokens de
   color nuevos en `theme.css` (`--color-tag-red`, etc., alineados a los de Finder).
4. **Menú contextual**: submenú "Tags ▸" con los 7 colores (toggle) — declarativo, como el resto de
   acciones (registry data-driven, no hardcode).
5. **Filtro / sidebar**: sección "Tags" (macOS-only) que al click hace `mdfind 'kMDItemUserTags ==
   "Rojo"'` y muestra resultados con el mismo path-centinela que Recents (`tags://Rojo`), reusando
   la vista Directory.
6. **i18n**: `t.tags.*`, nombres de color. macOS-only: ocultar la sección si `!isMac`.

## Fases (incremental)

1. **Read-only.** `read_tags` + `get_tags_for(paths)` lazy + dots en las filas. Sin escribir nada.
   Verifica que coinciden con lo que muestra Finder.
2. **Write.** `set_file_tags` + menú contextual de colores. Round-trip con Finder (poner aquí →
   ver en Finder).
3. **Filtro.** Sección de sidebar + vista filtrada vía `mdfind` (path-centinela `tags://`).
4. **Pulido.** Tags custom (nombre libre), `list_all_tags` desde la config de Finder, multi-select
   (taggear varias filas a la vez).

## Caveats

- **Solo macOS.** Otros SO: sin feature, sin crash (stub vacío + UI oculta).
- Plist **binario** — usar crate `plist`, no parse manual.
- Borrar el xattr cuando no quedan tags (no dejar un array vacío).
- Spotlight debe indexar la ruta para que el **filtro** funcione (volúmenes externos / red pueden
  no estar indexados → el filtro saldría vacío aunque los tags existan en el xattr).
- Performance: tags lazy, nunca en el hot path de `read_directory`.

## Estado

**Fases 1 y 2 — HECHAS** (cargo check + tsc + eslint + vite build limpios). Falta pasada manual en
macOS: ver que los dots coinciden con Finder (read) y que togglear un color desde el menú se refleja
en Finder y en la fila (write).

Fase 2 elige **fila de swatches** (como el menú real de Finder) en vez de submenú — el `ContextMenu`
no soporta anidados y es la UX nativa. Las escrituras pasan por un `tagStore` (external store con
`useSyncExternalStore`) para que las filas se actualicen sin refrescar el directorio (el watcher no
dispara confiable con cambios de xattr).

## Checklist

- [x] `filesystem/tags.rs` (`#[cfg(macos)]`: `read` vía xattr+plist; stub vacío en el resto) +
      comando `get_tags_for` registrado.
- [x] crates `xattr` + `plist` en `Cargo.toml` (gated a `cfg(target_os = "macos")`).
- [x] api `getFileTags` + manager `getFileTags`.
- [x] Modelo `Tag` + tokens de color en `theme.css`.
- [x] Dots en las filas (`TagDots` + `useDirectoryTags`, lazy por slice renderizado).
- [x] **Fase 2** — `set_file_tags` (write/clear xattr) + `tagStore` reactivo + `TagPicker` (fila de
      swatches, macOS-only, oculta en directorio vacío / Trash) + i18n `t.tags.*`.
- [x] **Fase 3** — filtro + sidebar: `find_tagged(tag)` (mdfind, scope $HOME) + path-centinela
      `tags://<color>` reusando la vista Directory (loadDirectory branch, watcher/goUp/properties/
      terminal off, tabLabel, PathBar label). Sección "Tags" en el sidebar (7 colores, macOS-only).
      Constantes de color movidas a `shared/constants.ts` (las usan directory **y** sidebar → §6).
- [x] **Fase 4** — `list_all_tags` (mdfind + lee xattr, agrega por nombre, locale-agnóstico) +
      `TagsProvider` app-level (estado de tags subido de DirectoryProvider a nivel app, para que
      sidebar y directory compartan y reaccionen). Sidebar **dinámico** (tags reales, no 7 fijos) →
      custom y localizados ("Rojo", "Trabajo") aparecen y filtran solos. Picker: input "Add a tag…"
      (custom) + checklist de tags nombrados + estado intermedio en multi-select (swatch `partial`).

Pendiente menor: al **escribir** desde los swatches de color se guarda el nombre en inglés
("Red"); en un Finder en español convive con "Rojo". La lectura/filtro/sidebar sí son
locale-correctos (muestran el nombre real guardado).
