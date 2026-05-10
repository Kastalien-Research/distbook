# 06 Product and UX Inheritance

## What the current product gets right

- Local-first mental model: users run Srcbook locally, own files, and bring API keys (`README.md`, `srcbook/README.md`).
- Notebook balance: prose, code, package metadata, and Mermaid diagrams share one authoring flow.
- Immediate execution: code cells stream stdout/stderr back into the browser.
- Share/export: `.src.md` export provides a portable Markdown-oriented interchange.
- AI assistance: users can generate notebooks, insert cells, edit cells, and repair diagnostics.
- App-builder review: file tree, diff modal, preview, logs, and version history show useful human-review primitives.

## App-builder UX inheritance

The app builder's strongest reusable UX patterns are not app generation itself. They are:

- Preview/log separation from source editing.
- Diff/review before accepting model-written changes.
- Version checkout and commit history.
- Package-install status and runtime logs.
- Feedback collection on AI outputs.

Evidence: `packages/web/src/components/apps/*`, `packages/web/src/routes/apps/*`, `packages/api/apps/git.mts`, `packages/api/apps/processes.mts`.

## Skill-runtime UX direction

The new UI should emphasize execution traces and authority boundaries rather than generic app creation. A human should be able to see:

- What skill was selected and why.
- Input schema and actual bound inputs.
- Requested capabilities and approvals.
- Which cells are instructions, editable implementation, model calls, validators, and artifacts.
- Which cells the agent modified.
- Validator results and failure evidence.
- Artifact outputs and hashes.
- Repair attempts and diffs.

## Pass/fail UX

When a skill passes, show a concise success card with output schema, artifact links, validator summary, trace ID, and any model/provider cost metadata.

When a skill fails, show the failing validator/capability/model call, exact error class, last safe artifact state, whether repair is allowed, and human-review options.

## Product emphasis

For the notebook-skills thesis, the UI should emphasize reusable skills and execution traces over open-ended exploration. Human notebooks remain valuable for authoring and exploration, but an agent-executable notebook must make authority, validation, and replay first-class.
