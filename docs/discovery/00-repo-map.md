# 00 Repo Map

## Evidence boundary

- Repository inspected at `fc57dd5` (`HEAD -> work`), a merge commit over `a1ae6f5`.
- The local Git object database contains app-builder commits through `0ba24b1 chore: release package(s) (#492)` and no local commit whose subject matches `Remove all app-builder stuff (#502)`. `git log --all --grep='Remove all app-builder' --oneline` returned no rows. Therefore this working tree is not notebook-only: it still contains the app-builder packages, routes, prompts, templates, and UI.
- Current README describes two products: AI app builder and TypeScript notebook, and says the project is not under active development (`README.md`). The package README also presents the app-builder/notebook combination (`srcbook/README.md`).

## Packages and applications

| Path | Role | Entrypoints / scripts | Evidence |
| --- | --- | --- | --- |
| `srcbook/` | Published CLI/server wrapper package named `srcbook`. Serves the built web UI and starts the API + WebSocket stack. | `srcbook/bin/cli.mts`, `srcbook/src/cli.mts`, `srcbook/src/server.mts`; package scripts `build`, `start`, `lint`. | `srcbook/package.json`, `srcbook/src/server.mts`, `srcbook/src/cli.mts` |
| `packages/api/` | Express + WebSocket API, persistence, notebook runtime, app-builder runtime, AI integrations, process spawning, TypeScript server support. | `packages/api/index.mts`, `packages/api/dev-server.mts`; package scripts `dev`, `test`, `build`, `lint`, `generate`, `migrate`. | `packages/api/package.json`, `packages/api/server/http.mts`, `packages/api/server/ws.mts` |
| `packages/web/` | React/Vite browser UI for notebooks, settings, app-builder routes, file editor, preview, diff/history UI. | `packages/web/src/main.tsx`, `packages/web/src/routes/*`, Vite config. | `packages/web/package.json`, `packages/web/src/routes/apps/*`, `packages/web/src/components/apps/*` |
| `packages/shared/` | Shared Zod schemas, TypeScript types, utilities, AI provider constants. | `packages/shared/index.mts`. | `packages/shared/src/schemas/cells.mts`, `packages/shared/src/schemas/apps.mts`, `packages/shared/src/types/*` |
| `packages/components/` | Shared React UI components for notebook cells and UI primitives. | `packages/components/src/index.tsx`. | `packages/components/src/components/cells/*`, `packages/components/src/components/ui/*` |

Root build orchestration uses pnpm workspaces and Turbo (`package.json`, `pnpm-workspace.yaml`, `turbo.json`).

## Servers, routes, and runtime entrypoints

- CLI `srcbook start` spawns `node dist/src/server.mjs`; `srcbook open <file>` starts the server if needed, imports a `.src.md`, and opens a browser URL (`srcbook/src/cli.mts`).
- The package server serves static assets from `srcbook/public`, mounts the API router at `/api`, attaches a WebSocket server, and serves `index.html` for all remaining paths (`srcbook/src/server.mts`).
- Express routes in `packages/api/server/http.mts` cover file loading, examples, srcbook CRUD/import/generate, session listing/export, AI health checks/config/secrets, app CRUD/generation/edit/export/versioning, app files/directories, and app preview metadata.
- WebSocket runtime in `packages/api/server/ws.mts` handles notebook cell create/update/delete/rename/format/execute/stop, dependency validation/install, TypeScript server lifecycle, quick-info/definition lookups, AI cell generation/fix-diagnostics, and registers the app-builder channel in `packages/api/server/channels/app.mts`.
- App-builder preview and install processes are mediated by `packages/api/apps/processes.mts`; low-level process spawning is centralized in `packages/api/exec.mts`.

## Data models and persistence

- SQLite/Drizzle tables include `configs`, `secrets`, `secrets_to_sessions`, and app-builder `apps` with JSON-encoded `history` (`packages/api/db/schema.mts`).
- Notebook session state is an in-memory `sessions` object hydrated from directories under `SRCBOOKS_DIR`; session persistence writes `README.md`, code files under `src/`, `package.json`, and optionally `tsconfig.json` (`packages/api/session.mts`, `packages/api/srcbook/index.mts`).
- App-builder state is split between SQLite app rows and filesystem projects under the app directory; app history is also a DB field (`packages/api/apps/app.mts`, `packages/api/apps/disk.mts`, `packages/api/db/schema.mts`).

## Notebook-specific code paths

- Cell schemas define `title`, `markdown`, `package.json`, and `code` cells, plus placeholder cells for AI insertion (`packages/shared/src/schemas/cells.mts`).
- `.src.md` encode/decode logic lives in `packages/api/srcmd/*` and is re-exported from `packages/api/srcmd.mts`.
- Notebook filesystem operations live in `packages/api/srcbook/index.mts` and `packages/api/srcbook/path.mts`.
- Notebook execution runs JavaScript with `node` and TypeScript with local `node_modules/.bin/tsx` from `packages/api/exec.mts`, triggered by WebSocket cell execution in `packages/api/server/ws.mts`.
- Notebook AI paths include full srcbook generation, cell insertion/editing, and diagnostic repair in `packages/api/ai/generate.mts` using prompt files under `packages/api/prompts/`.
- Notebook UI paths include home/session routes, session menu panels, import/export modals, code/markdown/title cell components, package/dependency panels, and Mermaid rendering (`packages/web/src/routes/*`, `packages/web/src/components/*`, `packages/components/src/components/cells/markdown.tsx`).

## App-builder-specific code paths

- App schemas/types: `packages/shared/src/schemas/apps.mts`, `packages/shared/src/types/apps.mts`, `packages/api/apps/schemas.mts`.
- App DB table: `apps` in `packages/api/db/schema.mts`; migrations beginning at `packages/api/drizzle/0010_create_apps.sql`.
- App API/runtime: `packages/api/apps/app.mts`, `packages/api/apps/disk.mts`, `packages/api/apps/processes.mts`, `packages/api/apps/git.mts`, `packages/api/apps/templates/react-typescript/*`.
- App AI loop: `packages/api/prompts/app-builder.txt`, `packages/api/prompts/app-editor.txt`, `packages/api/ai/app-parser.mts`, `packages/api/ai/plan-parser.mts`, `packages/api/ai/generate.mts` functions `generateApp` and `streamEditApp`.
- App UI: `packages/web/src/routes/apps/*`, `packages/web/src/components/apps/*`, `packages/web/src/clients/http/apps.ts`.

## Historical app-builder state

The locally available history does not include the requested post-removal state. Instead, the inspected `fc57dd5` tree is a pre-removal app-builder state. Relevant local app-builder commits include:

- `f41c8ce` — README update to talk about app builder.
- `ac3969a` — app export as zip.
- `6681946` — plan IDs, generation logging, user feedback.
- `84b60dc` — install packages recommended by AI.
- `3948ca0` — managed npm install from app builder.
- `534b222` — git utilities in API.
- `bbbd5d6` — versions in diffs and diff interactivity.
- `a6bfde7` / `51d5265` — streaming LLM app edits, revert/reapply.

Because `#502` is absent locally and there is no remote configured, this repo cannot directly compare current main against a last pre-removal app-builder state. A future discovery pass against upstream should fetch `srcbookdev/srcbook` and compare `#502` with its first parent.

## Test and build commands

- Root: `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm check-format`, `pnpm generate`, `pnpm migrate` (`package.json`).
- API: `pnpm --filter @srcbook/api test`, `pnpm --filter @srcbook/api build`, `pnpm --filter @srcbook/api lint`, `pnpm --filter @srcbook/api check-types`, `pnpm --filter @srcbook/api migrate` (`packages/api/package.json`).
- Web: `pnpm --filter @srcbook/web build`, `pnpm --filter @srcbook/web lint`, `pnpm --filter @srcbook/web check-types` (`packages/web/package.json`).
- CLI package: `pnpm --filter srcbook build`, `pnpm --filter srcbook start`, `pnpm --filter srcbook lint` (`srcbook/package.json`).

## Reusable substrate for notebook skills

- Reusable: `.src.md` codecs, cell schemas, source-file persistence, process execution wrappers, WebSocket streaming of output, AI prompt/model adapters, dependency checks, app-builder plan parsing, git/diff review, zip artifacts.
- Risky as-is: broad shell/filesystem/network access, implicit execution authority, mutable validators, no typed input/output contract, no replayable trace model, mixed app-builder and notebook concerns in shared API surface.
