# 02 App-builder Archaeology

## Scope note

The inspected repository at `fc57dd5` still contains the app builder. The locally available history has no `Remove all app-builder stuff (#502)` commit and no remote configured, so this memo treats `fc57dd5` as the last locally available pre-removal app-builder state.

## App generation flow

- App creation validates payloads with `CreateAppSchema`/app schemas, inserts a DB app row, creates a Vite project from `packages/api/apps/templates/react-typescript`, initializes a Git repo, asks the model for a plan, applies generated file operations, installs requested packages, and commits generated files.
- Model prompting uses XML-ish project context built by `buildProjectXml` and prompt files `app-builder.txt` / `app-editor.txt`.
- Generated plans are parsed by `packages/api/ai/plan-parser.mts`; project files are parsed/serialized by `packages/api/ai/app-parser.mts`.

Evidence: `packages/api/apps/app.mts`, `packages/api/apps/disk.mts`, `packages/api/ai/generate.mts`, `packages/api/prompts/app-builder.txt`, `packages/api/prompts/app-editor.txt`.

## Prompt-to-code and edit loop

- `generateApp` performs one non-streaming model call for initial generation.
- `streamEditApp` performs streaming app edits and logs generation metadata unless analytics are disabled.
- The HTTP app edit endpoint streams JSON/chunks back to the client and can commit updated files after applying the plan.
- App feedback types are shared with the frontend for user review.

Evidence: `packages/api/ai/generate.mts`, `packages/api/server/http.mts`, `packages/shared/src/types/feedback.mts`, `packages/web/src/components/apps/AiFeedbackModal.tsx`.

## Preview/runtime loop

- App preview uses Vite launched from the app directory.
- Process management ensures at most one Vite/npm-install process per app key and broadcasts logs/status.
- The frontend has dedicated app preview, logs, bottom drawer, file editor, package-install toast, and settings panels.

Evidence: `packages/api/apps/processes.mts`, `packages/api/exec.mts`, `packages/web/src/routes/apps/preview.tsx`, `packages/web/src/components/apps/use-preview.tsx`, `packages/web/src/components/apps/use-logs.tsx`.

## Diff, review, and versioning

- App directories are Git repos initialized by `initRepo`; generated or edited states are committed with author `Srcbook <ai@srcbook.com>`.
- Versioning APIs expose current SHA, checkout, and diff changed files.
- Frontend diff UI uses `@codemirror/merge` and app diff components.

Evidence: `packages/api/apps/git.mts`, `packages/api/server/http.mts`, `packages/web/src/components/apps/diff-modal.tsx`, `packages/web/src/components/apps/use-version.tsx`.

## Project filesystem model

- App projects are Vite React TypeScript projects copied from a template.
- Disk helpers create, update, delete, rename, and recursively load files/directories; binary detection is extension-based.
- Flat project snapshots omit `.git`, `node_modules`, and `package-lock.json` before sending content to the LLM.
- Zip export uses `archiver` over the full app directory.

Evidence: `packages/api/apps/disk.mts`, `packages/api/apps/templates/react-typescript/*`.

## AI provider integration

App builder shares the same model selection path as notebooks. Providers include OpenAI, Anthropic, Gemini, xAI/Grok, OpenRouter, and custom OpenAI-compatible base URLs.

Evidence: `packages/api/ai/config.mts`, `packages/shared/src/ai.mts`, `packages/api/config.mts`, `packages/api/db/schema.mts`.

## Relationship to notebook functionality

Reusable similarities:

- Both are local-first artifacts stored on disk.
- Both can call an LLM with a structured prompt and parse generated code.
- Both run Node/npm processes and stream logs/output to the browser.
- Both need dependency management and human review.

Important differences:

- Notebook cells are ordered human-readable units; app builder operates over a project file tree.
- App builder has Git/diff/version primitives; notebooks currently do not.
- Notebook execution is cell-level; app execution is preview-server-level.

## Reusable pieces for agent-skill notebooks

- `streamEditApp` streaming/logging pattern for repair loops.
- Plan parser ideas for structured model edits, if adapted to cell-role-aware operations.
- Git commit/diff UI as inspiration for human review and promotion.
- Process/log abstractions for execution trace capture.
- Zip/artifact export for skill outputs.

## Pieces that should stay dead or isolated

- App-specific Vite assumptions and React template scaffolding.
- Whole-project prompt context as the default strategy for notebook skills.
- Implicit package installation from model plans without declared capability gates.
- Treating Git history as the only review trace; notebook skill runs need typed execution traces independent of source version history.
