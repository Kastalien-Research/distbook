# 05 Effect-TS Feasibility

## Current async/error handling patterns

The codebase uses ordinary async/await, Promise arrays, callbacks from spawned processes, Express route try/catch blocks, WebSocket handlers, and direct `console.error` logging. Zod is used for schemas, but typed errors are not consistently modeled. Some operations return ad hoc `{ error, result }` objects; others throw; process errors stream through callbacks.

Evidence: `packages/api/server/http.mts`, `packages/api/server/ws.mts`, `packages/api/session.mts`, `packages/api/apps/*`, `packages/api/exec.mts`.

## Current service boundaries

Existing informal boundaries:

- `exec.mts` wraps process spawning.
- `config.mts` wraps configuration/secrets DB access.
- `srcbook/index.mts` wraps notebook filesystem persistence.
- `apps/disk.mts`, `apps/git.mts`, and `apps/processes.mts` wrap app filesystem/Git/process concerns.
- `ai/config.mts` and `ai/generate.mts` wrap model providers and prompt calls.

These boundaries are useful starting points for capability services.

## Where typed errors would materially help

- Distinguishing user validation failures from filesystem/process/model failures.
- Making model parse failures repairable without conflating them with provider outages.
- Making package-install failures resumable and traceable.
- Denying undeclared capabilities before side effects occur.
- Producing reliable execution traces for validators and artifacts.

## Where Effect may be overkill

- Pure UI rendering components.
- Simple CRUD routes that do not perform agent-executed side effects.
- One-off local CLI actions.
- Existing notebook editing operations before the skill runtime exists.

## Proposed capability services

- `FileSystem`: scoped reads/writes/deletes with hashing and path policies.
- `Shell`: deny-by-default command execution with cwd/env restrictions.
- `Network`: host/method allowlist and request logging.
- `PackageManager`: package install/lockfile operations.
- `ModelProvider`: typed model calls with prompt-template IDs and parse contracts.
- `Secrets`: named secret grants, values hidden from traces.
- `ArtifactStore`: content-addressed outputs and retention metadata.
- `NotebookStore`: load/save cells, manifests, versions.
- `ValidatorRunner`: deterministic validation cells with pass/fail evidence.
- `HumanReview`: explicit checkpoint requests and decisions.

## Migration strategy

1. Do not rewrite the app or all API routes.
2. Add a narrow notebook-skill runner package/module with capability interfaces.
3. Wrap existing `exec`, `srcbook`, `config`, and AI functions behind those interfaces only for the runner.
4. Persist a trace object for each skill run.
5. Gradually route notebook execution through the same services when safe.

## Minimal vertical slice

A justified Effect proof should run one notebook skill that:

- Loads a manifest.
- Binds typed input.
- Performs one deterministic file read.
- Performs one model call.
- Writes one artifact.
- Runs one deterministic validator.
- Records a trace.
- Fails if a cell requests undeclared filesystem, shell, network, or model capability.

## Skeptical conclusion

Effect-TS is technically justified only if the product commits to typed capabilities and replayable traces. If the goal remains an ad hoc local notebook and app-builder UI, Effect would add abstraction cost without enough payoff.
