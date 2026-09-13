# Sito File Browser - Agent Instructions

These instructions apply to the entire repository.

## Required context

Before analyzing or changing code:

1. Read `PROJECT_CONTEXT.md` completely.
2. Read `ARCHITECTURE_RULES.md` completely before any code change.
3. Use the ownership map in `PROJECT_CONTEXT.md` to open only the files relevant to the request.
4. Do not scan the entire repository, every plan, or every feature by default.
5. If the context documents do not identify the owning flow, tell the developer exactly:
   `No conozco este proyecto lo estudio primero?`

The source code is authoritative if a context document has drifted. If a requested architectural
change makes `PROJECT_CONTEXT.md` materially inaccurate, update that document in the same patch.
Do not update it for small implementation details.

## Execution policy

- Do not execute project scripts.
- Do not run builds, tests, lint, formatters, dev servers, package installs, Cargo commands, or the
  `sfb` CLI unless the developer explicitly authorizes that exact execution.
- Read-only/static inspection is allowed: `rg`, `git status`, `git diff`, `git log`, `git show`,
  and direct file reads.
- `git diff --check` is allowed as a static whitespace check. It is not runtime verification.
- When execution would be useful, give the developer the exact command and let them run it.
- Always distinguish static inspection from executed/runtime verification.

## Git and existing work

- Start every task with `git status --short`.
- Treat every pre-existing change not created during the current task as belonging to the
  developer or another agent.
- If any such change exists, ask the developer before editing, staging, reverting, moving, or
  building on it.
- Never discard, overwrite, clean, reset, or restore someone else's changes.
- Keep patches narrow and do not commit unless explicitly requested.

## Debugging and failures

- For behavior or bug reports, trace the real frontend-to-Rust code path before explaining or
  patching.
- If something breaks, ask the developer what is happening and what they were doing when it
  happened. Request the exact visible behavior or error instead of guessing.
- Distinguish a UI loading state from a blocked WebView/Tauri main thread, a backend worker delay,
  an OS permission prompt, and a dead network mount.
- Use the developer's reported reproduction steps as the primary diagnostic sequence.

## Implementation rules

- Do not reinvent an existing flow, manager, provider, hook, component, command, or primitive.
- Search for the current owner and reuse the established seam before adding a parallel path.
- Follow `ARCHITECTURE_RULES.md` for feature slicing, providers/managers, file organization, i18n,
  and token-only CSS.
- Keep orchestration out of presentational components.
- Frontend filesystem calls go through `FileSystemManager` and `src/shared/services/api.ts`.
- Blocking filesystem, process, network, metadata, watcher, and recursive work must not run on
  Tauri's main thread. Use the existing async/worker patterns.
- Settings changes must keep the frontend type, defaults, schema, Rust settings struct/defaults,
  and translations aligned.
- Reuse local wrappers and `@sito/ui` primitives instead of introducing another UI system.
- Preserve platform-specific behavior and report unsupported-platform limits directly.

## Completion

- Review the final diff for scope and accidental changes.
- Report exactly which files changed and why.
- State which verification was static and which, if any, was executed by the developer.
- Do not claim a runtime bug is fixed until the developer has run and confirmed the relevant flow.
