# Architecture Refactor Plan

## Objetivo

Alinear el frontend React de `sito-file-browser` con `ARCHITECTURE_RULES.md`: estructura de carpetas, rutas centralizadas, providers + managers, estructura por feature, modelos en `lib/` e i18n. Estilos siguen en **CSS plano** (no Tailwind, ya adaptado en las reglas). Sin cambios funcionales: refactor estructural a iso-comportamiento.

Plan creado el 20 de junio de 2026.

## Baseline (estructura actual)

```txt
src/
  App.tsx, AppContent.tsx, main.tsx
  api.ts, constants.ts, toast.ts, types.ts, utils.ts
  components/   (AppBar, AudioPreview, ContextMenu, DetailsPopup, DirEntry,
                 PathBar, Preview, Properties, SearchBar, SideBar, Spinner, Toast)
  context/StateContext.tsx
  pages/        (Directory.tsx [469 LOC], Volumes.tsx)
  styles/       (components/, pages/, index.css)
```

Incumplimientos vs reglas:
- Carpetas: falta `providers/ views/ layouts/ hooks/ lib/{models,utils,services} lang/`; existen `context/` y `pages/`.
- Rutas hardcodeadas (`navigate('/directory')`, `navigate('/')`, `<Route path="directory">`).
- Sin manager classes: logica de fs repartida entre `api.ts` y `pages/Directory.tsx`.
- `Directory.tsx` mezcla estado, helpers, constantes, tipos y varios hooks inline (nav teclado, type-to-find, clipboard, preview).
- Modelos (`types.ts`) y utils sueltos en raiz de `src/`.
- Sin i18n: strings en ingles hardcodeados.

## Reglas de trabajo

1. El usuario ejecuta instalaciones, build y Tauri; el agente no ejecuta scripts.
2. Refactor a **iso-comportamiento**: cada fase no cambia funcionalidad, solo estructura.
3. Preservar imports publicos re-exportando desde `index.ts` locales cuando aplique.
4. Una fase por checkpoint (commit) tras validar build + smoke test.
5. Mover archivos con `git mv` para conservar historial.
6. No mezclar este refactor con features nuevas.

## Estructura objetivo

```txt
src/
  providers/                # StateProvider + hook de acceso (ex context/)
  components/               # UI reutilizable global
  views/                    # Directory, Volumes (ex pages/)
  layouts/                  # shell App (AppBar + SideBar + AppContent)
  hooks/                    # useKeyboardNav, useTypeahead, useClipboard, useWindowState, ...
  lib/
    models/                 # tipos de dominio (DirEntry, Volume, ...)
    services/               # api.ts (invokes Tauri)
    managers/               # FileSystemManager, ClipboardManager
    utils/                  # formatBytes, navigateToPath, path helpers
    routes.ts               # rutas centralizadas (as const)
    constants.ts
  lang/                     # i18n (en, es, ...)
  styles/                   # global.css/index.css + por componente
```

## Fase 1. Andamiaje de carpetas y `lib/` (bajo riesgo)

Estado: pendiente.

- Crear `lib/{models,services,managers,utils}`, `hooks/`, `layouts/`, `lang/`.
- `git mv`: `types.ts -> lib/models/`, `utils.ts -> lib/utils/`, `constants.ts -> lib/constants.ts`, `api.ts -> lib/services/api.ts`, `toast.ts -> lib/toast.ts` (o `lib/services/`).
- Actualizar todos los imports.
- Opcional: `index.ts` en `lib/models` y `lib/utils` para reexport.

Donde probar: build TS/Vite limpio; arranque; sin imports rotos.

## Fase 2. Renombrar `pages/ -> views/` y `context/ -> providers/`

Estado: pendiente.

- `git mv pages views`, `git mv context providers`.
- `StateContext.tsx -> providers/StateProvider.tsx` (mantener `useStateContext` como hook de acceso; renombrar a `useAppState` opcional con reexport).
- Actualizar imports en `App.tsx`, `AppContent.tsx`, vistas y componentes.
- Mover CSS de `styles/pages/ -> styles/views/` (coherencia) y actualizar imports.

Donde probar: arranque, navegacion Volumes/Directory, estilos intactos.

## Fase 3. Rutas centralizadas (`lib/routes.ts`)

Estado: pendiente.

- Crear `lib/routes.ts` con `Routes = { volumes: '/', directory: '/directory' } as const`.
- Reemplazar strings en `App.tsx` (`navigate`), `AppContent.tsx` (`<Route path>`), y cualquier `location.pathname` comparado.
- Si surgen rutas con parametros, exponer helpers (`getX(id)`).

Donde probar: navegacion completa (entrar/salir, atras/adelante, home).

## Fase 4. Providers + Managers (separar logica de dominio)

Estado: pendiente.

- `FileSystemManager` en `lib/managers/`: encapsula `readDirectory`, `copy/move/rename/delete`, `openFile`, resolucion de pinned dirs y volumenes; usa `lib/services/api.ts`.
- `ClipboardManager` (o estado dentro del provider) para copy/cut.
- Exponer via provider(s); las vistas/componentes consumen el manager por el hook, sin llamar `api.ts` directo.
- Sacar de `Directory.tsx`/`App.tsx` la orquestacion (fetch, refresh, side effects) hacia el provider/manager.

Donde probar: todas las operaciones fs (copy/cut/paste/rename/delete/open), refresh, toasts de error.

## Fase 5. Estructura por feature (descomponer `Directory`)

Estado: pendiente.

- Convertir componentes grandes en carpetas `FeatureName/` con `Component.tsx`, `constants.ts`, `utils.ts`, `types.ts`, `index.ts`.
- Extraer hooks de `Directory.tsx` a `hooks/` (uno por archivo):
  - `useSelection` (seleccion + multiseleccion).
  - `useKeyboardNav` (flechas/Enter/Escape, columnas del grid).
  - `useTypeahead` (busqueda por letra).
  - `useClipboardActions` (copy/cut/paste + atajos).
  - `useContextMenu` (estado/posicion del menu).
- `Directory` queda como composicion delgada que orquesta hooks + presentacion.
- Mover helpers/constantes/tipos inline a sus archivos.

Donde probar: seleccion, teclado, type-to-find, menu contextual, preview, rename, todo igual.

## Fase 6. i18n (`lang/`)

Estado: pendiente.

- Elegir libreria ligera o un dictionary + hook propio (`useT`).
- `lang/en.ts`, `lang/es.ts` con claves por dominio.
- Reemplazar strings de UI (menus, Properties, toasts, placeholders) por claves.
- Default idioma + (futuro) selector.

Donde probar: textos visibles correctos en el idioma por defecto; sin claves crudas.

## Fase 7. Layout shell

Estado: pendiente.

- `layouts/AppLayout.tsx`: estructura AppBar + (SideBar + AppContent) que hoy vive en `App.tsx`.
- `App.tsx` queda como wiring de providers + router + layout.

Donde probar: layout identico, sidebar colapsable, toasts.

## Criterio de exito

- Estructura de `src/` coincide con la estructura objetivo de `ARCHITECTURE_RULES.md`.
- Cero rutas hardcodeadas; cero logica de dominio en componentes hoja.
- Un componente/hook por archivo; helpers/constantes/tipos en sus archivos.
- Comportamiento identico al actual en cada checkpoint (refactor iso-comportamiento).
- Estilos siguen en CSS plano, sin regresiones visuales.

## Referencias

- `../ARCHITECTURE_RULES.md`
- `KEYBINDINGS_PLAN.md` (la Fase 5 deja el terreno listo para el keymap configurable).
