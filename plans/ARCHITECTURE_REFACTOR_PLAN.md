# Architecture Refactor Plan (Feature-Sliced)

## Objetivo

Alinear el frontend con `ARCHITECTURE_RULES.md` (estructura feature-sliced): `app/` (composition root),
`shared/` (genérico/cross-feature) y `features/<feature>/` (auto-contenidos por dominio). Estilos en CSS
plano. Refactor a **iso-comportamiento**: solo estructura, sin cambiar funcionalidad.

Plan reescrito el 21 de junio de 2026 (sustituye al plan previo basado en `lib/ + views/ + providers/` top-level).

## Granularidad de features (decisión)

Features por dominio de pantalla. Ajustable, pero el punto de partida:

- `features/directory` — pantalla de directorio: entradas, menú contextual, preview, properties y sus hooks.
- `features/volumes` — pantalla de volúmenes.
- `features/sidebar` — sidebar (pinned + búsqueda).
- `features/navigation` — barra de ruta (PathBar) e historial.

Lo transversal (estado global, manager, service, modelos, UI genérica) vive en `shared/`. La composición
(App, router, layout, chrome de ventana) en `app/`.

## Estado actual (tras el refactor previo)

```txt
src/
  App.tsx, AppContent.tsx, main.tsx
  components/  (AppBar, AudioPreview, ContextMenu, DetailsPopup, DirEntry, PathBar,
                Preview, Properties, SearchBar, SideBar, Spinner, Toast)
  hooks/       (useSelection, useKeyboardNav, useClipboardShortcuts, useContextMenu)
  lib/         (constants, toast, routes, models/, managers/, services/, utils/)
  providers/   (StateProvider)
  views/       (Directory, Volumes)
  styles/      (components/, views/, index.css)
```

## Estructura objetivo

```txt
src/
  app/
    App.tsx, AppContent.tsx, main.tsx
    AppBar.tsx            # chrome de ventana (min/max/close)
    layout/              # AppLayout (shell AppBar + Sidebar + contenido)
    routes.ts
  shared/
    components/           # ContextMenu, DetailsPopup, Spinner, Toast (UI genérica)
    providers/            # StateProvider (estado global de la app)
    services/             # api.ts (Tauri invoke)
    managers/             # FileSystemManager
    models/               # tipos compartidos
    utils/                # helpers compartidos
    constants.ts          # constantes compartidas (formatos de archivo)
    toast.ts              # bridge de notificaciones
  features/
    directory/
      Directory.tsx, index.ts
      components/          # DirEntry, Preview, AudioPreview, Properties
      hooks/              # useSelection, useKeyboardNav, useClipboardShortcuts, useContextMenu
      constants.ts        # AcceptedPreviewFormats (si se decide local)
    volumes/
      Volumes.tsx, index.ts
    sidebar/
      Sidebar.tsx, index.ts
      components/          # SearchBar
    navigation/
      PathBar.tsx, index.ts
  lang/                   # i18n
  styles/
```

## Reglas de trabajo

1. El usuario ejecuta instalaciones, build y Tauri; el agente no ejecuta scripts.
2. Refactor a iso-comportamiento; una fase por checkpoint (commit) tras build + smoke test.
3. `git mv` para conservar historial.
4. Dependencias: `features` no importan internals de otras features (vía `shared/` o el `index.ts` público);
   `shared/` no depende de `features/`; `app/` puede depender de ambos.
5. No mezclar features nuevas con este refactor.

## Mapeo actual -> objetivo

| Actual                                                                                      | Objetivo                             |
| ------------------------------------------------------------------------------------------- | ------------------------------------ |
| `lib/models/`                                                                               | `shared/models/`                     |
| `lib/services/api.ts`                                                                       | `shared/services/api.ts`             |
| `lib/managers/FileSystemManager.ts`                                                         | `shared/managers/`                   |
| `lib/utils/`                                                                                | `shared/utils/`                      |
| `lib/constants.ts`                                                                          | `shared/constants.ts`                |
| `lib/toast.ts`                                                                              | `shared/toast.ts`                    |
| `lib/routes.ts`                                                                             | `app/routes.ts`                      |
| `providers/StateProvider.tsx`                                                               | `shared/providers/StateProvider.tsx` |
| `components/{ContextMenu,DetailsPopup,Spinner,Toast}`                                       | `shared/components/`                 |
| `components/AppBar`                                                                         | `app/AppBar.tsx`                     |
| `App.tsx, AppContent.tsx, main.tsx`                                                         | `app/`                               |
| `views/Directory.tsx` + `components/{DirEntry,Preview,AudioPreview,Properties}` + `hooks/*` | `features/directory/`                |
| `views/Volumes.tsx`                                                                         | `features/volumes/`                  |
| `components/SideBar` + `components/SearchBar`                                               | `features/sidebar/`                  |
| `components/PathBar`                                                                        | `features/navigation/`               |

## Fase 1. Andamiaje + `shared/`

Estado: completada.

- Crear `app/`, `shared/{components,providers,services,managers,models,utils}`, `features/`.
- `git mv` de `lib/*` y `providers/` a `shared/` según el mapeo; `lib/routes.ts` a `app/`.
- Mover UI genérica (`ContextMenu, DetailsPopup, Spinner, Toast`) a `shared/components/`.
- Actualizar imports.

Donde probar: build limpio; arranque.

## Fase 2. `app/` (composition root)

Estado: completada.

- `git mv` `App.tsx, AppContent.tsx, main.tsx` a `app/`; `components/AppBar` a `app/AppBar.tsx`.
- Ajustar `index.html`/entry si referencia `main.tsx`.
- Actualizar imports.

Donde probar: arranque, ventana/tray, navegación.

## Fase 3. `features/directory`

Estado: completada.

- `git mv` `views/Directory.tsx` a `features/directory/Directory.tsx`.
- Mover `DirEntry, Preview, AudioPreview, Properties` a `features/directory/components/`.
- Mover `hooks/*` a `features/directory/hooks/`.
- `index.ts` exportando `Directory`.
- Actualizar imports (incluye CSS).

Donde probar: directorio completo (selección, teclado, menú, preview, properties, fs ops).

## Fase 4. `features/volumes`, `features/sidebar`, `features/navigation`

Estado: completada.

- `views/Volumes.tsx` a `features/volumes/`.
- `SideBar` (+ `SearchBar`) a `features/sidebar/`.
- `PathBar` a `features/navigation/`.
- `index.ts` por feature; actualizar imports.

Donde probar: volúmenes, sidebar (pinned/colapsable/búsqueda), pathbar (historial/subir).

## Fase 5. `index.ts` públicos + límites de dependencia

Estado: completada.

- Cada feature expone su API por `index.ts`; los consumidores importan del `index.ts`, no de internals.
- Verificar que ninguna feature importe internals de otra; mover lo compartido a `shared/`.

Donde probar: build; arranque.

## Fase 6. i18n (`lang/`)

Estado: completada.

- `lang/en.ts` (+ idiomas) con claves por dominio; hook/util de traducción.
- Reemplazar strings de UI (menús, Properties, toasts, placeholders).

Donde probar: textos correctos en el idioma por defecto.

## Criterio de exito

- `src/` con `app/ + shared/ + features/` según `ARCHITECTURE_RULES.md`.
- Sin imports cruzados entre features; `shared/` sin dependencias a `features/`.
- Un componente/hook por archivo; helpers/constantes/tipos en sus archivos.
- Comportamiento idéntico en cada checkpoint; estilos CSS sin regresiones.

## Referencias

- `../ARCHITECTURE_RULES.md`
- `KEYBINDINGS_PLAN.md`
