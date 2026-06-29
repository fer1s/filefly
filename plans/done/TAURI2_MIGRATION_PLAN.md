# Tauri 1 -> 2 Migration Plan

## Objetivo

Migrar la app de Tauri 1.5 a Tauri 2 manteniendo la paridad funcional actual, y dejar habilitados los plugins necesarios para resolver el bucket "Tauri 2" del `BASELINE_BACKLOG.md` (apertura nativa, acciones de filesystem, estado de ventana, errores backend -> UI).

Plan creado el 20 de junio de 2026.

## Baseline (estado actual)

| Pieza                       | Version / estado                                                       |
| --------------------------- | ---------------------------------------------------------------------- |
| `@tauri-apps/api`           | 1.5.0                                                                  |
| `@tauri-apps/cli`           | 1.5.0                                                                  |
| `tauri` (crate)             | 1.5 (features `path-all`, `protocol-all`, `system-tray`, `window-all`) |
| `tauri-build`               | 1.5                                                                    |
| `tauri-plugin-window-state` | branch v1 (git)                                                        |
| window-vibrancy             | 0.4.2                                                                  |
| window-shadows              | 0.2.1                                                                  |
| Config                      | `tauri.conf.json` con `allowlist`                                      |

Comandos Rust existentes: `hide_window`, `get_volumes`, `read_directory`, `open_file`, `open_in_terminal`, `md_to_html`.

Usos de la API JS:

- `invoke` desde `@tauri-apps/api` (api.ts, AppBar.tsx).
- `convertFileSrc` desde `@tauri-apps/api/tauri` (Preview.tsx, DirEntry.tsx, AudioPreview.tsx).
- `appWindow` / `getCurrent` desde `@tauri-apps/api/window` (AppBar.tsx).
- `homeDir`/`desktopDir`/`documentDir`/`downloadDir`/`pictureDir` desde `@tauri-apps/api/path` (SideBar.tsx).
- Protocolo `asset:` para imagenes/audio.

## Reglas de trabajo

1. El usuario ejecuta instalaciones, build y Tauri; el agente no ejecuta scripts.
2. Llegar primero a PARIDAD funcional con v1; solo despues implementar features nuevas del backlog.
3. Las fases 1-4 forman una sola unidad de migracion: la app no arranca con versiones mezcladas. Se valida al final (Fase 5).
4. Commit/checkpoint al terminar la migracion base (tras Fase 5) y luego uno por feature.
5. No mezclar features nuevas dentro de la migracion base.

## Fase 1. Dependencias

Estado: completada y validada (Tauri 2 compila y corre).

Cambios:

- npm: `@tauri-apps/api` y `@tauri-apps/cli` a `^2`.
- Cargo: `tauri = { version = "2", features = [...] }` y `tauri-build = "2"`.
- Reemplazar features de allowlist (`path-all`, `protocol-all`, `window-all`) por las de v2: `tray-icon` (antes `system-tray`) y `protocol-asset` (para `convertFileSrc`/`asset:`).
- `tauri-plugin-window-state` a la version 2 (crates.io `^2` o branch v2).
- window-vibrancy a `^0.5` (compatible v2). window-shadows: en v2 la sombra es nativa (`"shadow": true` en la config de ventana); evaluar retirar el crate.
- Anadir crates de plugins que se usaran luego: `tauri-plugin-opener`, `tauri-plugin-fs`, `tauri-plugin-dialog` (se instalan ahora pero se cablean en fases posteriores).

Donde probar: solo que `cargo`/`npm` resuelvan dependencias (aun no compila del todo hasta Fase 3).

## Fase 2. Configuracion (`tauri.conf.json` + capabilities)

Estado: completada y validada (Tauri 2 compila y corre).

Cambios:

- Migrar al schema v2:
  - `build.devPath` -> `build.devUrl`; `build.distDir` -> `build.frontendDist`.
  - `build.withGlobalTauri` -> `app.withGlobalTauri`.
  - `tauri.windows` -> `app.windows` (mantener tamano, `transparent`, `decorations`; anadir `"shadow": true` si se retira window-shadows).
  - `tauri.security.csp` -> `app.security.csp` (mantener `asset:`/`asset.localhost`).
  - `tauri.systemTray` -> `app.trayIcon`.
  - `tauri.bundle` -> `bundle` (nivel raiz).
  - `package.productName`/`version` -> `productName`/`version` raiz.
  - Eliminar `tauri.allowlist`.
- Crear `src-tauri/capabilities/default.json` con los permisos equivalentes:
  - core: `core:default`, permisos de `window` (minimize, maximize/toggle, hide, center, close), `path` (resolver dirs estandar), `event`.
  - protocolo asset: permitir `asset:` con el scope actual (`**`).
- Registrar `tauri-build` con la nueva config (sin cambios de comando).

Donde probar: validacion del schema al arrancar; warnings de capabilities en consola.

## Fase 3. Backend Rust

Estado: completada y validada (Tauri 2 compila y corre).

Cambios:

- `main.rs`:
  - `Manager::get_window` -> `get_webview_window`.
  - Registrar plugins: `.plugin(tauri_plugin_opener::init())`, `tauri_plugin_fs::init()`, `tauri_plugin_dialog::init()` (init ahora; uso en fases de features).
  - `setup`, `invoke_handler`, `on_window_event` se mantienen; ajustar tipos de evento de v2 si cambian firmas.
  - vibrancy/shadow: usar API v2 de window-vibrancy; sombra via config.
- `tray.rs`: reescribir de `SystemTray`/`SystemTrayMenu`/`CustomMenuItem` a `tauri::menu::{Menu, MenuItem, PredefinedMenuItem}` + `tauri::tray::TrayIconBuilder`. Mover el manejo de eventos del tray (`on_menu_event` / `on_tray_icon_event`) al builder.
- Comandos (`get_volumes`, `read_directory`, `open_file`, `open_in_terminal`, `md_to_html`, `hide_window`): firmas iguales; verificar imports (`tauri::Window` sigue valido) y que `generate_handler!` no cambie.

Donde probar: `cargo build` limpio; la app arranca, ventana visible, tray funcional (center/hide/quit).

## Fase 4. Frontend (API JS)

Estado: completada y validada (Tauri 2 compila y corre).

Cambios:

- `invoke`: `@tauri-apps/api` -> `@tauri-apps/api/core` (api.ts, AppBar.tsx).
- `convertFileSrc`: `@tauri-apps/api/tauri` -> `@tauri-apps/api/core` (Preview.tsx, DirEntry.tsx, AudioPreview.tsx).
- Ventana (AppBar.tsx): `appWindow`/`getCurrent` -> `getCurrentWindow()` de `@tauri-apps/api/window`; usar la instancia para `minimize`/`toggleMaximize`.
- `path` (SideBar.tsx): el import sigue igual; confirmar que los permisos de `path` en capabilities permiten resolver los dirs (si no, anadirlos).

Donde probar: arranque, volumenes, navegacion, previews de imagen/markdown/audio, items fijados de la sidebar, controles de ventana (min/max/close).

## Fase 5. Smoke test de paridad

Estado: completada y validada. Paridad funcional confirmada en macOS.

Checklist (debe igualar a v1):

- Arranque y puerto 1420.
- Volumes + Drives (con filtro APFS ya aplicado).
- Navegacion: PathBar, atras/adelante/subir, historial.
- Directory: seleccion, multiseleccion, teclado, type-to-find, busqueda.
- Sidebar: pinned navegan, colapsable, persistencia.
- Context menu: visuales y acciones activas (Open, Open in Terminal, Preview).
- Preview: imagen/markdown/audio, prev/next, teclado.
- Tray: center/hide/quit; cerrar oculta (no mata).
- Consola sin errores de permisos ni de API.

Checkpoint: commit "migrate to Tauri 2 (parity)".

## Fase 6+. Bucket Tauri 2 (features nuevas)

Estado: completada. Apertura nativa, Copy/Cut/Rename/Delete (+Paste y atajos), estado real de ventana, Properties y errores backend -> UI implementados y validados por smoke test.

- Apertura nativa de archivos: reemplazar `open_file` (shell) por `tauri-plugin-opener` (open por extension/asociacion del SO); tratar rutas como argumento. Corrige `Open` del menu y doble click.
- Acciones filesystem del menu contextual: `Copy`, `Cut`, `Rename`, `Delete` (con confirmacion via `plugin-dialog`), `Properties` -> con `tauri-plugin-fs`. Al cablear el `onClick`, el item se habilita solo (ya implementado el disabled derivado).
- Estado real de la ventana: con la API window de v2, consultar `isMaximized` y escuchar `onResized`/eventos para alternar `faWindowMaximize`/`faWindowRestore`.
- Errores backend -> UI: propagar `Result`/errores de los comandos a la interfaz en vez de solo `console.error`.

## Criterio de exito

- App corre en Tauri 2 con paridad funcional total respecto a v1.
- Sin errores de capabilities/permisos ni de API JS.
- Tray, ventana transparente sin decoraciones, sombra y protocolo asset funcionando.
- Bucket Tauri 2 del backlog desbloqueado e implementado por checkpoints.

## Referencias

- https://v2.tauri.app/start/migrate/from-tauri-1/
- https://v2.tauri.app/plugin/ (opener, fs, dialog, window-state)
- https://v2.tauri.app/security/capabilities/
