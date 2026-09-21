# Architecture Rules For Agents (CLAUDE/CODEX)

Mandatory rules for `sito-file-browser`: a Tauri 2 (Rust) + React 19 / TypeScript desktop app.
All coding agents **must read this file before making any code change**. Any new feature, refactor
or file move follows it; an exception must be called out explicitly in the implementation notes/PR.

## 0) Scope

- Frontend: React 19 + TypeScript under `src/` — the subject of these rules.
- Backend: Tauri 2 (Rust) under `src-tauri/` — follows its own module conventions; only the
  frontend↔backend contract rules below (section 13) apply to it.
- Styling: plain CSS with design tokens (sections 5, 12). Tailwind is intentionally not used.
- Shared libraries: `@sito/ui` (elements/dialog primitives) and `@sito/commands` (hotkeys) — the
  app wraps them; it never couples components to them directly (section 14).

---

## 1) State Management and Data Flow

- Use `Context + Provider` patterns to avoid prop-drilling; each domain exposes a provider and a
  typed access hook (`useSettings`, `useOnboarding`, `useChangelog`, …) that throws outside its
  provider.
- Do not pass shared state through multiple component levels unless it is strictly local UI state.
- Keep business logic out of presentational components.
- Two sanctioned non-React state shapes exist — use them only for their case:
  - **Bridge modules** for code that must be callable from non-React code (`shared/toast.ts`):
    a module-level setter registered by the app root, with a console fallback.
  - **External stores** (`useSyncExternalStore`, e.g. `shared/services/updates`) when several
    unrelated consumers (a launch hook, a toast, a settings row) must share one result that
    should survive dialog unmounts. Expose `getX()` + `useX()`; never mutate from components.

---

## 2) Models and Domain Design

- Define explicit, typed models for domain entities; keep them centralized (`shared/models/`,
  `features/<feature>/types.ts`) and reusable — no ad-hoc object shapes across components.
- Validate incoming external data (IPC, disk, imported TOML/JSON, network) before using it in
  views. Settings loaded from disk are merged over `DEFAULT_SETTINGS` so older files never leave
  a newer key `undefined`.

---

## 3) Manager Classes + Provider Access

- Manager classes encapsulate domain operations/orchestration (`SettingsManager`,
  `FileSystemManager`, `ConnectionsManager`, `SmbManager`). They are instantiated in a provider
  and consumed through it — never as global singletons.
- Side effects and IPC orchestration live in managers/providers/hooks, not in UI leaf
  components. Leaf controls call `manager.doThing()`; they do not `invoke(...)`.

---

## 4) Declarative Registries (Mandatory)

Anything that is a _list of similar things rendered generically_ is **data, not JSX**. The renderer
iterates the registry; adding an item is one entry plus its strings.

Existing registries — extend them, don't bypass them:

| Registry                                       | Where                                                   | Drives                                                 |
| ---------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| `SETTINGS_SCHEMA`                              | `features/settings/schema/schema.ts`                    | Settings dialog rows, search, grouping, modified/reset |
| `SETTINGS_SECTIONS`                            | `features/settings/schema/sections.ts`                  | Settings left nav                                      |
| `ONBOARDING_STEPS`                             | `features/onboarding/steps/steps.ts`                    | Welcome-guide pages                                    |
| Context-menu / quick-bar actions               | `features/directory/actions/`, `shared/contextActions/` | Entry menus, Quick Bar                                 |
| Sidebar groups (`SIDEBAR_GROUP`, `GROUP_META`) | `features/sidebar/constants.ts`                         | Sidebar sections                                       |
| `KEYMAP_ACTION`                                | `shared/keymap/constants.ts`                            | Rebindable hotkeys                                     |

Rules:

- Descriptor fields that are user-facing text are **lazy** (`label: () => t.settings.x`) so they
  honour the active dictionary at render time.
- A descriptor that needs bespoke UI uses the registry's escape hatch (e.g. `SETTING_KIND.CUSTOM`
  with `Control`/`Below` components + `isModified`/`reset`), not a special case in the renderer.
- Never hardcode a menu item, a settings row or a wizard page directly in a component.

---

## 5) Styling Rules (Plain CSS + Global Theme)

- Plain CSS, one file per component/view, mirroring the component tree under `src/styles/`
  (`src/styles/components/<Name>.css`, `src/styles/views/<View>.css`). Each component imports its
  own stylesheet (`import "@/styles/components/PathBar.css"`).
- Theme tokens live in `src/styles/theme.css` (`:root`): `--space-*`, `--size-*`, `--radius-*`,
  `--border-width-*`, `--color-*`, `--shadow-*`, `--font-size-*`, `--blur-*`, `--z-index-*`.
  Shared globals and utility classes (`.shadow`) live in `src/styles/index.css`.
- Section 12 makes token usage mandatory — no literal sizes.
- Scope selectors by the component's root class (`.PathBar …`, `.onboarding_modal …`); never
  redeclare custom properties inside component CSS.
- Per-element opacity overrides (sidebar, dialogs, menus) compose `rgba(var(--color-x-rgb), var(--x-opacity))`
  at the element — a nested `var()` inside a `:root` token would ignore the inline override.

---

## 6) Folder Structure (Required) — Feature-Sliced

There is no top-level `lib/`, `components/`, `hooks/` or `providers/`:

- `app/` — composition root: `App.tsx` (provider wiring, settings hydration, window reveal),
  `AppContent.tsx` (layout shell), `routes.ts`, `hooks/` (app-level hooks such as
  `useAppSettings`, `useUpdateCheck`, `useDockMenu`).
- `shared/` — generic / cross-feature building blocks.
- `features/` — one folder per domain feature, self-contained.

```txt
src/
  app/
    App.tsx  AppContent.tsx  main.tsx  routes.ts
    hooks/<useX>/            # App-level hooks (settings hydration, update check, dock menu…)

  shared/
    components/
      elements/              # Domain-agnostic primitives (Button, Select, Switcher, Checkbox, Tooltip…)
      patterns/              # Compositions of elements (Dialog, DialogHeader, DialogActions, ContextMenu, Popup)
    hooks/  providers/  models/  managers/  utils/
    services/                # Tauri IPC wrappers (api.ts) and external integrations (updates/)
    keymap/                  # Hotkey layer over @sito/commands (scopes, actions, providers)
    contextActions/  search/
    toast.ts  constants.ts

  features/<feature>/
    components/  hooks/  providers/  managers/  steps/ …
    constants.ts  types.ts  utils.ts
    <Feature>.tsx            # The feature screen/view, when it has one
    index.ts                 # PUBLIC API — the only thing other code may import

  lang/                      # i18n dictionaries (en.ts is the canonical shape)
  styles/                    # theme.css, index.css, components/, views/
```

Rules:

- Code that belongs to one domain goes in `features/<feature>/`; promote to `shared/` only when
  reused across features or genuinely generic.
- `shared/components/elements/` is limited to domain-agnostic primitives; reusable compositions go
  in `shared/components/patterns/`; domain compositions stay in their feature even when built on
  shared patterns.
- **A feature must not import another feature's internals.** Cross-feature reuse goes through
  `shared/` or the other feature's public `index.ts` (which re-exports what it deliberately
  shares — e.g. `features/settings` exports `AccentControl`, `FolderHandlerControl`,
  `CustomControlProps` for the onboarding steps). If you need something a feature doesn't
  export, add it to that feature's `index.ts`; do not deep-import.
- `app/` may depend on `features/` and `shared/`; `shared/` must never depend on `features/`.
- Two providers that need each other's context (e.g. settings ↔ onboarding) are layered: the
  state-only provider sits above, and the dialog that needs both contexts is mounted below in
  `App.tsx`. Don't create import cycles between features to solve this.

---

## 7) Unit-Level File Structure (Mandatory)

Any non-trivial component or hook gets its own folder:

```txt
Something/
  Something.tsx|ts      # One component or one hook per file
  constants.ts          # Constants only
  utils.ts              # Reusable helpers only
  types.ts              # Type aliases and interfaces only
  index.ts              # Public exports
```

- One hook per file (`useSomething.ts`); one component per file (`Something.tsx`).
- No reusable helpers/constants/types declared inside component or hook files.
- Support files are siblings of the unit they support; when a unit grows, give it a folder and
  keep existing public imports working via `index.ts` re-exports.

---

## 8) Routing Conventions

- App routes are centralized in `src/app/routes.ts` as a const object (`ROUTES`); never hardcode
  route strings in `navigate(...)`, `<Route path>`, or menu config.
- Dynamic/query routes, if added, get helper functions and centralized query-param keys in the
  same file.

---

## 9) i18n Rules

- All user-facing text lives in `src/lang/en.ts` (`t.<domain>.<key>`), grouped by domain
  (`settings`, `onboarding`, `updates`, `changelog`, …). `TranslationDictionary` is derived from
  `en`; other languages must satisfy it.
- Parameterized strings are functions: `stepOf: (n, total) => …`.
- ESLint enforces `i18next/no-literal-string` in JSX. ARIA roles and other non-copy literals
  opt out inline with `// eslint-disable-next-line i18next/no-literal-string -- <why>`.
- Registries reference strings lazily (`() => t.x.y`), see section 4.

---

## 10) Implementation Discipline

- Clear boundaries: UI layer → provider/hook layer → manager/service layer → IPC.
- Small, composable modules over monolithic files; typed, explicit APIs.
- **Comments explain _why_, not _what_.** Every non-obvious block (an effect, a guard, a CSS
  rule with a trick) carries a short comment stating the reason or the bug it prevents. Keep the
  existing style: full sentences, placed directly above the code.
- Prefer deriving state during render over effects when React sanctions it (the "adjust state on
  prop change" pattern is used for dialog re-open resets).
- Once-per-session guards for launch behaviour use a module flag (survives HMR/StrictMode
  double-runs), not a ref, when re-firing would be user-visible (toasts).
- Temporary test hooks (`FORCE_*_TEST` flags) are allowed while iterating, must be `false` before
  a commit and removed before release.

---

## 11) No Magic Literals — Use Named Constants (Mandatory)

### 11.1) Closed sets of string values → const-object "enum"

```ts
export const VIEW_MODE = { GRID: "grid", LIST: "list" } as const;
export type ViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];
```

- Always `as const`; derive the type from the object; reference `VIEW_MODE.GRID`, never `"grid"`.
- Shared sets in `shared/constants.ts`; feature-only sets in `features/<feature>/constants.ts`.
- Non-rebindable DOM keys go through `KEY` (`KEY.ESCAPE`, `KEY.ENTER`); rebindable actions through
  `KEYMAP_ACTION`.

### 11.2) Single values, formats and thresholds → named constants

- Timeouts, debounce delays, URLs, format lists, ids (`*_TITLE_ID`) live in `constants.ts` as
  `UPPER_SNAKE_CASE`; collections typed `readonly`.
- Compose constants from constants (`RELEASES_API` from `UPDATES_REPO`).

### 11.3) User-facing text is not a constant — it is i18n (section 9).

### 11.4) Allowed bare literals

- `0`, `1`, `-1`, `""`, `true`; local loop/index math. When in doubt, name it.

---

## 12) Design Tokens — No Literal Sizes in CSS (Mandatory)

### 12.1) Use tokens, not literals

- Spacing: `var(--space-*)`. Sizes: `var(--size-*)`. Radius/border/blur: `--radius-*`,
  `--border-width-*`, `--blur-*`. Colors/shadows: `--color-*`, `--shadow-*`. Type: `--font-size-*`.
- Never raw `px`/`rem` for these when a token exists.

```css
/* ❌ */
.panel {
  padding: 16px;
  gap: 10px;
  border-radius: 8px;
}
/* ✅ */
.panel {
  padding: var(--space-4);
  gap: var(--space-2-5);
  border-radius: var(--radius-md);
}
```

### 12.2) Need a value that has no token? Define one — in `theme.css` only

- Reuse before adding: scan the `--space-*` / `--size-*` scale first.
- One-off component dimensions are purpose-named: `--size-<thing>` (`--size-onboarding-width`,
  `--size-changelog-max-height`). Dialog widths always get one.

### 12.3) Allowed literals

- `0`, `100%`, `100vw/vh`, `1fr`, `auto`, ratios/percentages, `line-height` unitless values.
- `transition`/`animation` timings and easings.
- `@media` breakpoints (no token scale yet) and non-spatial one-offs.

---

## 13) Frontend ↔ Backend Contract (Tauri)

- **All `invoke(...)` calls live in `src/shared/services/api.ts`**, one typed wrapper per command,
  with a comment stating what the command does. Features call the wrapper (usually via a manager).
- **Settings are declared in three places that must stay in sync**: the `AppSettings` type
  (`api.ts`), `DEFAULT_SETTINGS` (`shared/constants.ts`), and the Rust struct + `Default`
  (`src-tauri/src/functions/settings.rs`, `#[serde(rename_all = "camelCase", default)]`).
  Adding a setting = those three + a `SETTINGS_SCHEMA` entry (if user-visible) + strings.
  Internal markers (`onboardingSeen`, `lastSeenVersion`) skip the schema entry only.
- Rust field comments mirror the TS ones; TOML files (`settings.toml`, `sidebar.toml`,
  `context_menu.toml`, `cleanup.toml`) are the source of truth and the frontend is their mirror.
- Network access from the webview requires a CSP `connect-src` entry in `tauri.conf.json`
  (currently `https://api.github.com` for the update check). Prefer read-only, fail-silent
  network calls with a timeout (`AbortController`).
- Plugin permissions go in `src-tauri/capabilities/default.json`.
- The `sfb` CLI (`src-tauri/src/bin/sfb.rs`) shares the filesystem cores; keep its identifier in
  step with `tauri.conf.json`.

---

## 14) UI Primitives, Dialogs and Hotkeys

### 14.1) Elements

- ESLint (`no-restricted-syntax`) forbids raw `<button>`, `<input>`, `<select>`, `<textarea>`.
  Use `Button`, `TextInput`/`Slider`, `Select`, `TextArea`, `Switcher`, `Checkbox` from
  `shared/components/elements`. Bespoke looks use the element's `unstyled` prop.
- Elements wrap `@sito/ui`; the app-facing props contract (`ButtonProps`, `variant`) is the
  wrapper's — never import `@sito/ui` from a feature.

### 14.2) Dialogs

- Every modal = `Dialog` + `DialogHeader` (with a `*_TITLE_ID` constant) + body + `DialogActions`.
- `Dialog` centralizes the MODAL hotkey scope, `useModal` registration, drag-by-header and the
  open/close animation — don't reimplement any of it.
- One `styles/components/<Name>Dialog.css` scoped by `.<name>_modal`, with a
  `--size-<name>-width` token. Footer spacing: `margin-top`/`padding-top` + hairline `border-top`
  on `.dialog_actions` when the body has interactive content.
- Rarely-opened dialogs are code-split with `shared/components/patterns/Deferred`: export
  `lazyWhen(() => import("./X"), p => p.visible)` as the folder's default (call sites unchanged),
  or wrap a context-driven dialog in `<MountOnce when={visible}>` from an always-mounted host that
  keeps its launch hooks eager (see `OnboardingDialogHost`, `ChangelogDialogHost`). Plain
  `React.lazy` alone doesn't help — dialogs mount closed, so the chunk would load at startup.
- Stacked modals fight for the MODAL scope: a control that opens another dialog from Settings
  closes Settings first (see `OnboardingReplayControl`, `ChangelogControl`).
- Dialogs that retain content while fading out keep the last shown props in state
  (`ConfirmationDialog`); dialogs that reset on open derive it during render.

### 14.3) Hotkeys

- Hotkeys go through `shared/keymap` (`useHotkey`, `useHotkeys`, `useHotkeyScope`,
  `HOTKEY_SCOPE`), built on `@sito/commands`. Rebindable actions are `KEYMAP_ACTION` entries
  resolved against the live keymap; display them with `formatBinding(keymap[action])`.
- Non-rebindable keys (Escape, Enter, Tab) use `KEY` and, inside dialogs, the MODAL scope.
- Raw `keydown` listeners are allowed only where the keymap layer cannot apply (type-to-find,
  inputs) and must stand down when `useModal().anyOpen`.

---

## 15) Launch Lifecycle (for anything that runs "on start")

- Settings hydrate asynchronously; `useAppSettings` exposes `ready`. Launch behaviour that reads
  settings (welcome guide, update check, what's-new toast) must gate on `settingsReady`.
- The window is hidden until `settingsReady && directory.ready` (with a 4 s fallback); don't
  block or race that reveal. Network checks wait `UPDATE_CHECK_STARTUP_DELAY_MS`.
- First-run vs update is decided by `lastSeenVersion`: `""` → fresh install (welcome guide);
  older than `getVersion()` → what's-new toast. Only one of the two fires.
