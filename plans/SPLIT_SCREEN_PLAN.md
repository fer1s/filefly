# Split Screen Plan (dos panes lado a lado)

Plan creado el 1 de julio de 2026. **No arrancar todavía** — este documento es solo el diseño.

## Objetivo

Permitir ver **dos carpetas al mismo tiempo**, lado a lado. Un usuario con varios tabs arrastra uno
al borde derecho y se abre un segundo pane; cada pane es un contexto de navegación completo e
independiente (sus propios tabs, historia, selección, preview). Pedido por un usuario.

## Alcance decidido

- **2 panes** exactos (no split recursivo/N).
- **Split vertical** (dos columnas, gutter arrastrable en medio).
- **Tabs por pane**: cada pane tiene su propia tira de tabs, como VS Code / navegadores.
- **Activación por drag**: arrastrar un tab al borde derecho crea el 2º pane con ese tab.

Fuera de alcance (posible futuro): N panes, split horizontal, orientación elegible, arrastrar tabs
entre panes ya existentes (se puede añadir en Fase 3+).

## Diagnóstico de la arquitectura actual (por qué es refactor, no bolt-on)

Hoy todo cuelga de **un único tab activo global**:

- `features/tabs/hooks/useTabs` posee `tabs` + `activeTabId` y deriva UN `path`, UNA historia
  (`goBack/goForward`), `search`, `infoPanelOpen` — todo del `activeTab`.
- `shared/providers/StateProvider` expone eso globalmente, mezclado con lo verdaderamente global
  (fs, volumes, settings, view mode, zoom, sidebar, dateFormat).
- `app/hooks/useDirectoryContents` carga el contenido de ESE único `path`.
- `features/directory/providers/DirectoryProvider` (uno solo, montado en `app/AppContent.tsx`) lee
  `path` del `StateContext` y posee selección / clipboard / preview / rename.
- `app/AppContent.tsx` usa `Routes` (react-router) para elegir Volumes vs Directory según UNA
  location.

Para split necesitamos **dos de casi todo eso**, independientes.

## Idea central: el `Pane`

Un **Pane** es un grupo de tabs que posee un contexto de navegación completo:

```ts
// shared/models
type Pane = {
  id: string;
  tabs: Tab[];        // reutiliza el Tab actual (history/search/infoPanelOpen)
  activeTabId: string;
};
```

La app pasa de "una lista de tabs + activeTabId" a "1–2 panes + `focusedPaneId`".

## Separación de contextos (el corazón del refactor)

Partir el `StateContext` mega-objeto en dos:

- **`StateProvider` (global, se queda):** `fs`, `volumes`, `settings`, `view`/`setView`, `zoom*`,
  `dateFormat`, `sidebarOpacity`, `sidebarWidth`, `startupMode`, `homePath`, `savingSettings`,
  `showHidden`, `showToasts`, `hideSystemRecents`.
- **`PaneProvider` (nuevo, por-pane):** `tabs`, `activeTab`, `path`, `setPath`, `canGoBack`,
  `canGoForward`, `goBack`, `goForward`, `search`/`setSearch`, `infoPanelOpen`/`toggleInfoPanel`,
  `newTab`, `closeTab`, `selectTab`, `refreshDir`, `dirContent`, `accessDenied`. Además envuelve el
  `DirectoryProvider` (selección/clipboard/preview) y corre su propio `useDirectoryContents`.

Regla: cada componente **dentro de un pane** (directory, navigation/PathBar, tabs/TabBar, QuickBar,
InfoPanel, keyboard nav) lee `usePaneContext()` para path/nav/tabs. Lo global sigue en
`useStateContext()`.

### Pane enfocado

- `usePanes` mantiene `focusedPaneId`. Click/focus dentro de un pane lo enfoca.
- **Atajos globales** (Cmd+T nuevo tab, Cmd+W cerrar, ciclar tabs, Cmd+1..9), **clicks del
  sidebar** ("abrir aquí / en nuevo tab") y la lógica que hoy asume "el activo" actúan sobre el
  **pane enfocado**.
- Anillo/borde de foco visual en el pane enfocado (solo visible cuando hay 2).

## Router

Con 2 panes independientes una sola URL no puede representar ambas vistas. **Quitar el
router-decide-vista**: cada `PaneView` deriva Volumes vs Directory de su propio `path` (path vacío
= Volumes; si no, Directory). La derivación de vista ya existe; el router es fino y su rol
desaparece. Revisar todos los `navigate(...)` / `useLocation` / `ROUTES` en `AppContent`,
`useDirectoryContents` y navigation.

## UI / layout

- `app/AppContent.tsx` renderiza 1 o 2 `<PaneView paneId>` en un contenedor flex/grid de columnas.
- **Gutter arrastrable** entre panes: generalizar el patrón ya escrito en
  `features/sidebar/hooks/useSidebarResize` a un hook compartido `shared/hooks/useDragResize`
  (mismo mecanismo: pointer down → clase en body que mata la transición + `col-resize`, pointermove
  → set ratio, clamp). El sidebar y el split lo consumen. Guardar el ratio del split (ej. 0.5).
- `PaneView` = su `TabBar` (los tabs de ese pane) + `PathBar` + `QuickBar` (si Directory) +
  contenido, envuelto en su `DirectoryProvider`.

## Crear / destruir el split

- **Crear (drag)**: los `TabItem` ya deben soportar drag (verificar `features/tabs/components/
  TabItem`). Añadir una **zona de drop en el borde derecho** de la app. Soltar un tab ahí: si no
  existe 2º pane, crearlo y **mover** ese tab (sacarlo de su pane origen). Si el pane origen queda
  sin tabs, colapsar el split.
- **Destruir**: cerrar el último tab de un pane elimina el pane; el otro pasa a ancho completo. Un
  control/atajo "unir" (merge) opcional mueve los tabs del 2º pane al 1º.

## Persistencia

- Hoy `features/tabs/utils.ts` + `constants.ts` guardan `tabs` + `activeTabId` en localStorage
  (`TABS_STORAGE_KEY`, `ACTIVE_TAB_STORAGE_KEY`).
- Migrar a guardar **panes** (`Pane[]`) + `focusedPaneId` + ratio del split. Mantener
  compatibilidad al cargar el formato viejo (un solo pane con esos tabs) para no romper sesiones
  existentes. Interactúa con `startupMode` (restore) — revisar `saveStartupConfig`.

## Fases (incremental, cada una compila y es shippable)

### Fase 1 — Abstracción Pane con UN solo pane (sin cambio visible)

El 70% del riesgo, cero cambio de comportamiento. Sirve para validar la separación de contextos
aislada de la UI de split.

1. Añadir `Pane` a `shared/models`.
2. Crear `app/hooks/usePanes` migrando la lógica de `useTabs` para operar **dentro de un pane**
   (por ahora un array de 1 pane). Exponer ops por-pane (default: el enfocado).
3. Crear `shared/providers/PaneProvider` con el subconjunto por-pane del contexto (path/nav/tabs/
   search/infoPanel/dirContent + `useDirectoryContents` movido aquí).
4. Sacar esos campos de `StateProvider`/`StateContext` (dejar solo lo global).
5. Migrar consumidores: `PathBar` (navigation), `TabBar`/`TabItem`, `Directory`/`DirectoryProvider`,
   `QuickBar`, `InfoPanel`, keyboard nav, sidebar "open" → `usePaneContext()`.
6. `AppContent` monta `<PaneProvider>` único envolviendo el chrome + contenido actuales.
7. Persistencia: adaptar save/load a `Pane[]` de longitud 1 (con fallback al formato viejo).

**Criterio de aceptación:** app se comporta idéntica; `tsc`/`eslint`/`cargo` limpios; sesión se
restaura igual.

### Fase 2 — Renderizar 2 panes + gutter

1. `usePanes` sostiene hasta 2 panes + `focusedPaneId`.
2. `AppContent` renderiza N panes en columnas con gutter arrastrable (`useDragResize` compartido).
3. Foco de pane (click enfoca) + anillo visual.
4. Atajos globales / sidebar / PathBar apuntan al pane enfocado.
5. (Temporal para probar: un atajo/botón "split" que crea el 2º pane clonando el tab activo.)

**Criterio:** con 2 panes se navega independiente en cada uno; selección/preview separadas; foco
correcto.

### Fase 3 — Drag tab al borde + cerrar split + persistencia del layout

1. Zona de drop en el borde derecho; soltar tab crea/llena el 2º pane (mover tab).
2. Colapsar split al vaciar un pane; control "unir".
3. Persistir `Pane[]` + foco + ratio; migración del formato viejo.
4. (Opcional) arrastrar tabs entre panes existentes.

**Criterio:** el flujo del pedido original (arrastrar un tab al lado y ver dos carpetas) funciona de
punta a punta y sobrevive reinicio.

## Reglas de arquitectura a respetar (ARCHITECTURE_RULES.md)

- `PaneProvider` como provider + hook de acceso tipado (sección 2/4). Sin prop-drilling de path.
- `Pane` en `shared/models` (sección 3). Constantes nuevas (claves de storage, ratio default,
  clamps del split) como named constants en el `constants.ts` de su unidad (sección 11); nada de
  literales sueltos.
- Estructura por unidad (sección 7): cada hook/componente nuevo en su carpeta con
  `constants.ts`/`utils.ts`/`types.ts`/`index.ts` según haga falta.
- `useDragResize` va a `shared/hooks/` solo porque lo usan ≥2 features (sidebar + split) —
  promoción legítima a shared (sección 6).
- CSS del gutter y del anillo de foco con tokens de `theme.css` (sección 12).
- i18n para cualquier texto nuevo (botón "unir", tooltips) en `lang/` (sección 9).

## Riesgos / notas

- **Mayor superficie:** partir `StateContext` toca muchos consumidores. Por eso Fase 1 aislada.
- **Router:** quitar `Routes` como selector de vista puede afectar deep-links/estado de location;
  verificar que nada externo dependa de la URL.
- **DirectoryProvider por pane:** confirmar que no haya estado global escondido (watchers de fs,
  refresh) que asuma un solo directorio activo — `useDirectoryContents` monta un watcher por path,
  ahora habrá dos simultáneos.
- **Atajos:** hoy viven en `AppContent` (siempre montados). Con 2 panes deben resolver el pane
  enfocado, no "el activo" global.
- **Persistencia legacy:** no romper sesiones guardadas con el formato de tabs plano.
