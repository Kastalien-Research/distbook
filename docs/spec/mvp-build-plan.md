# MVP Build Plan: Notebook Skills Runtime

## Goal

Prove the smallest useful loop: an agent can run one notebook skill, bind typed input, execute cells, make one model call, write an artifact, run deterministic validators, fail, repair, and return a trace.

## MVP skill

`repo-readme-generator`: generate `README.generated.md` for a TypeScript package from `package.json` and selected source files.

## Likely files to add or change

- `packages/shared/src/schemas/skills.mts`: manifest, cell role, capability, trace schemas.
- `packages/shared/src/types/skills.mts`: inferred types.
- `packages/api/skills/manifest.mts`: load/validate skill manifests.
- `packages/api/skills/runner.mts`: sequential runner.
- `packages/api/skills/capabilities/*.mts`: filesystem, model provider, artifact store, validator runner.
- `packages/api/skills/trace.mts`: trace event builder and persistence.
- `packages/api/skills/examples/repo-readme-generator/*`: fixture skill.
- `packages/api/test/skills/*.test.mts`: unit/integration tests.
- Optional later: `packages/api/server/http.mts` endpoint and `packages/web` trace UI.

## Implementation order

1. Add shared schemas for manifest, roles, capabilities, trace events, input/output contracts.
2. Add manifest loader and fixture skill.
3. Add in-memory/file-backed trace writer.
4. Add scoped filesystem capability.
5. Add model-provider adapter that can be mocked in tests.
6. Add sequential runner with input validation and capability checks.
7. Add deterministic validator cell support.
8. Add artifact output support.
9. Add repair attempt support limited to model-call/agent-editable transform cells.
10. Add one API or CLI entrypoint.

## Tests to write

- Manifest schema accepts fixture and rejects missing input/output schemas.
- Runner rejects invalid input before side effects.
- Runner rejects undeclared filesystem write.
- Runner records trace events in order.
- Mock model call writes README artifact.
- Validator failure prevents success response.
- Repair attempt appends trace and succeeds when validator passes.
- Existing `.src.md` import/export tests continue passing.

## Acceptance criteria

- A test can run the fixture skill with a mocked model and receive a typed output object.
- The run writes `README.generated.md` or a test artifact path.
- At least one required deterministic validator must pass before success.
- A purposely bad mocked README fails validation.
- A repair attempt produces a new trace segment and passing artifact.
- Undeclared capability requests fail with a typed error and no side effect.
- Existing notebook tests pass.

## Rollback plan

Because the runner is additive, rollback deletes or disables `packages/api/skills/*`, shared skill schemas/types, fixture tests, and any API/CLI route. Existing notebook and app-builder paths should remain untouched until the MVP proves value.
