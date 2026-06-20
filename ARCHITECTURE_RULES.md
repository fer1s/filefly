# Architecture Rules For Agents (CLAUDE/CODEX)

This rule set applies to the `sito-file-browser` project: a Tauri + React (TypeScript) desktop app.

## Scope

- Frontend: React 19 + TypeScript under `src/`.
- Backend: Tauri 2 (Rust) under `src-tauri/` — these rules target the React frontend; Rust follows its own module conventions.
- Styling: plain CSS (see section 5). Tailwind is intentionally not used here.

# ARCHITECTURE_RULES

## Mandatory Pre-Work

All coding agents (Codex, Claude, or any automated contributor) **must read this file before making any code change**.

---

## 1) Scope

- These architecture rules are mandatory for this project.
- Any new feature, refactor, or file move must follow this document.
- If an exception is needed, document it explicitly in the implementation notes/PR.

---

## 2) State Management and Data Flow

- Use `Context + Provider` patterns to avoid prop-drilling.
- Do not pass shared state through multiple component levels unless it is strictly local UI state.
- Each domain should expose a provider and a typed access hook when needed.
- Keep business logic out of presentational components.

---

## 3) Models and Domain Design

- Define explicit, typed models for domain entities.
- Keep model definitions centralized and reusable.
- Avoid ad-hoc object shapes spread across components.
- Validate incoming external data (API/local storage/imported JSON) before using it in views.

---

## 4) Manager Classes + Provider Access

- Use manager classes to encapsulate domain operations/state transitions.
- Managers should be instantiated and exposed through providers.
- Components must consume managers/state through provider APIs, not through direct global singletons.
- Keep side effects and orchestration inside managers/providers, not in UI leaf components.

---

## 5) Styling Rules (Plain CSS + Global Theme)

- Use **plain CSS** for component styling. This project does **not** use Tailwind.
- One CSS file per component/view, mirroring the component tree under `src/styles/` (e.g. `src/styles/components/PathBar.css`, `src/styles/pages/Directory.css`). Each component imports its own stylesheet.
- Define theme tokens/variables and shared globals in `src/styles/index.css` (colors, spacing, typography, reusable utility classes like `.shadow`).
- Keep selectors scoped by the component's root class (e.g. `.PathBar ...`) to avoid leakage between components.
- Global CSS should stay minimal and design-token oriented; avoid duplicating tokens in component files.

---

## 6) Folder Structure (Required)

Use this project structure as the default organization:

```txt
src/
  providers/      # App/domain providers and context wiring
  components/     # Reusable global components
  views/          # Route/page-level screens
  layouts/        # Shared layout shells used by views
  hooks/          # Reusable custom hooks
  lib/            # Core logic: models, managers, utils, services, constants
    models/
    utils/
  lang/           # i18n resources (translations, dictionaries)
  styles/         # Global styles (including global.css/theme definitions)
```

Notes:

- `components/` is for shared/global UI blocks, not route-specific page composition.
- `views/` should focus on screen composition and orchestration.
- `layouts/` should hold reusable structures shared between multiple views.

---

## 7) Feature-Level File Structure (Mandatory)

When creating or refactoring hooks/components, use this per-feature structure:

```txt
FeatureName/
  FeatureName.tsx|ts   # Only one component or one hook per file
  constants.ts         # Constants only
  utils.ts             # Reusable helper functions only
  types.ts             # Type aliases and interfaces only
  index.ts             # Public exports
```

Rules:

- One hook per file (`useSomething.ts`).
- One component per file (`Something.tsx`).
- Do not declare reusable helpers/constants/types inside component or hook files.
- Move helper functions to `utils.ts`.
- Move constants to `constants.ts`.
- Move interfaces/types to `types.ts`.
- Keep support files as siblings of the hook/component they support.
- If a hook/component grows, create its own folder and expose public API via `index.ts`.
- Preserve existing public imports by re-exporting from local `index.ts` files.

---

## 8) Routing Conventions (Mandatory)

- Centralize app routes in one shared file (for example: `src/lib/routes.ts`) using constant objects (`as const`).
- Do not hardcode route strings in `navigate(...)`, `<Link to=...>`, `<Route path=...>`, menu config, or sitemap config.
- For dynamic routes and query-based routes, expose helper functions (for example: `getShipRoute(id)`).
- Centralize query parameter keys in route constants (for example: `RouteQueryParam`) and reuse them consistently.

---

## 9) i18n Rules

- Store translation resources in `lang/`.
- Avoid hardcoded user-facing strings in reusable components when i18n is expected.
- Keep translation keys consistent and domain-oriented.

---

## 10) Implementation Discipline

- Prefer clear boundaries: UI layer, provider layer, domain logic layer.
- Prefer small, composable modules over monolithic files.
- Keep APIs typed and explicit.
- New features must follow these rules unless an exception is documented in the implementation notes/PR.
