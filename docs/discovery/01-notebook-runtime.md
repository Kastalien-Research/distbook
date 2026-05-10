# 01 Notebook Runtime

## File format and persistence

Srcbook notebooks are directories, not single database records. The persisted representation includes:

- `README.md` generated from notebook prose and code-cell references.
- `package.json` as a first-class cell.
- Source files under `src/`, one per code cell.
- `tsconfig.json` for TypeScript notebooks.
- Import/export text in `.src.md` format via the srcmd codec.

Evidence: `packages/api/session.mts` loads sessions with `decodeDir`, keeps them in an in-memory map, and writes updates through `writeToDisk`, `writeCellToDisk`, `writeReadmeToDisk`, and `moveCodeCellOnDisk`. `packages/api/srcbook/index.mts` writes `README.md`, package/code cells, and TypeScript config. `packages/api/srcmd/encoding.mts` and `packages/api/srcmd/decoding.mts` translate between Markdown and cell objects.

## Cell types and metadata

The current cell model is intentionally small:

- `title`: `id`, `type`, `text`.
- `markdown`: `id`, `type`, `text`.
- `package.json`: `id`, `type`, `source`, `filename`, `status`.
- `code`: `id`, `type`, `source`, `language`, `filename`, `status`.
- `placeholder`: AI-only insertion marker, not part of persisted `CellSchema`.

Evidence: `packages/shared/src/schemas/cells.mts`, `packages/shared/src/types/cells.mts`.

There is no current metadata for cell authority, role, dependency, declared capability, input binding, output schema, validator status, or repair policy.

## Code execution lifecycle

Notebook execution is cell-scoped and WebSocket-driven.

1. Client sends a `cell:exec` message.
2. Server finds session and code cell.
3. Server checks for missing dependencies opportunistically.
4. Server loads secrets associated with the session.
5. Cell status changes to `running`; clients receive `cell:updated`.
6. JavaScript runs via `node`; TypeScript runs via local `node_modules/.bin/tsx`.
7. stdout/stderr chunks are broadcast as `cell:output`.
8. Exit resets the most recent cell status to `idle`.

Evidence: `packages/api/server/ws.mts` and `packages/api/exec.mts`.

The lifecycle does not persist a durable execution trace. Output is streamed to connected clients, and process state is tracked in memory through `packages/api/processes.mts`.

## State and session model

- Session identity is the notebook directory basename.
- The server hydrates sessions from `SRCBOOKS_DIR` on module load.
- Updates mutate in-memory cell arrays and then write selected files to disk.
- There is no transactional notebook-wide execution state or immutable run object.
- TypeScript tooling runs through separate tsserver processes managed in `packages/api/tsserver/*` and `packages/api/tsservers.mts`.

Evidence: `packages/api/session.mts`, `packages/api/types.mts`, `packages/api/tsserver/*`.

## Import/export behavior

- `/api/import` accepts a `.src.md` file path, direct text, or URL and creates a srcbook directory.
- `/api/generate` asks an LLM for `.src.md` text, then imports it.
- Export uses `exportSrcmdText(session)` and the encoder with `inline: true`.
- File import validates only the `.src.md` suffix; URL import fetches arbitrary URLs.

Evidence: `packages/api/server/http.mts`, `packages/api/session.mts`, `packages/api/srcbook/index.mts`, `packages/api/srcmd/*`.

## AI-assisted notebook paths

- `generateSrcbook(query)` calls `generateText` with `srcbook-generator.txt`.
- `generateCells(query, session, insertIdx)` inserts a placeholder into encoded notebook context and decodes returned cells.
- `generateCellEdit(query, session, cell)` rewrites an existing code cell from notebook context.
- `fixDiagnostics(session, cell, diagnostics)` repairs a code cell from tsserver diagnostics.

Evidence: `packages/api/ai/generate.mts` and prompt files in `packages/api/prompts/`.

## Markdown/prose and Mermaid

- Markdown cells render through `marked`/`marked-react`.
- Mermaid code blocks are converted into `<pre className="mermaid">` and rendered with `mermaid.run()`; theme changes reinitialize Mermaid.
- Markdown is user-authorable prose but has no formal authority level separate from executable code.

Evidence: `packages/components/src/components/cells/markdown.tsx`.

## Dependencies and npm/package access

- `package.json` is a cell and can be edited.
- Dependency validation uses `shouldNpmInstall` and `missingUndeclaredDeps` from `packages/api/deps.mts`.
- Notebook dependency installation is exposed over WebSocket and uses `npm install --include=dev` via `packages/api/exec.mts`.
- Formatting may install `prettier` into the notebook directory if missing before running `npx prettier`.

Evidence: `packages/api/server/ws.mts`, `packages/api/deps.mts`, `packages/api/exec.mts`, `packages/api/session.mts`.

## Runtime invariants

Observed invariants:

- Each code cell maps to a real file name compatible with notebook language.
- TypeScript notebooks need a `tsconfig.json`.
- `README.md` is the source of prose ordering and code-cell linkage for exported/imported notebooks.
- Running TypeScript assumes `tsx` is installed in the notebook's `node_modules`.
- Secrets are ambient process environment additions, not typed inputs.

## Out-of-order execution risks

The current runtime permits individual cell execution with no dependency graph. If cells depend on filesystem artifacts, installed packages, previous generated files, external services, or implicit global state, out-of-order execution can fail silently or produce misleading outputs. The runtime does not model cells as replayable steps with declared inputs/outputs.

## Observed seams for notebook skills

- Add role/capability/input/output metadata to cell schema while preserving existing `title`, `markdown`, `package.json`, and `code` cells.
- Convert streamed output into durable run traces.
- Turn `package.json`, dependency install, shell execution, secrets, and model calls into declared capabilities.
- Freeze validator cells or mark them authoritative.
- Reuse `.src.md` import/export as a compatibility path, but introduce a manifest for agent-callable notebooks.
