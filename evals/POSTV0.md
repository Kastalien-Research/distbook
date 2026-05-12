# Eval Harness — Items Noted For Later

Things we discussed and decided to defer past v0. Not bugs; not blockers. Captured here so we don't lose them.

## Cell execution semantics

- **Parallel cell execution.** Cells run sequentially in declaration order. At v1 scale (hundreds of docs, plus the semantic extraction call) we'd want a `Promise.all` over independent checks.
- **Shared cache across checks.** D4, D6, F7 all do their own `git`/`fs` calls. No memoization. Two checks asking `pathExistsAtRef(repo, 'HEAD', 'X')` invoke `git cat-file -e X` twice.
- **`process.env` is fully inherited by cells.** A misbehaving cell can `console.log(process.env)` and leak secrets into `cellOutputs`. v1 should accept an explicit allow-list in `RunNotebookInput`.

## Schema design

- **`BaseFinding` shared interface.** Each check defines its own `Finding`. The scorecard's zod schema is permissive (`.passthrough()`) which absorbs the variation, but a `BaseFinding` interface would give a compile-time contract.
- **F7's `suggestedFix` vs canonical `cited`.** `applyAllowlist` matches `entry.pattern` against `cited` first, falling back to `suggestedFix`. F7 should also populate `cited` (currently only `suggestedFix`) so allowlist matching is uniform.
- **Malformed `prompt_spec` fails the run rather than emitting a blocker.** `loadPromptSpec` returns `null` for missing front-matter but throws `ZodError` for present-but-invalid YAML (e.g., `version: '1'`, missing `heading_slugs`). Cell `15-c1.ts` handles the `null` case but does not catch the throw — a malformed spec aborts the notebook run with an unhandled error. This is deliberate fail-hard behavior: prompt-spec authoring errors should be loud, not silent. Document here so it is not later mistaken for an oversight.
- **`getPromptSpec()` return type is `Promise<unknown>`.** Forces casts at every callsite (`10-d1.ts`, `15-c1.ts`). Tightening to `Promise<PromptSpec | null>` is blocked by `invokeCheck`'s dynamic-import boundary. Worth a refactor that imports `PromptSpec` directly into `00-config.ts` and types the function.

## Toolchain

- **zod v3 → v4 migration.** Catalog pinned to `^3.25.40`. `@openai/agents@^0.3.9` is the last version that accepts v3. Newer `@openai/agents` releases require v4. A v1 migration touches all 11 zod-importing files across `packages/{api,web,shared}`.
- **Notebook decoder is built, not source.** `@srcbook/api/srcmd/decoding.mjs` requires `pnpm --filter @srcbook/api build` (and `@srcbook/shared build`) before evals can use it. Adding evals as a CI workspace requires a build step ordering.

## Forcing functions / UX

- **`suggest-allowlist` error UX.** Raw ZodError dump on wrong-file input is noisy. A `'not a valid scorecard: ...'` wrapper would help.
- **`compare-runs --verbose` filter for zero-delta rows.** `formatDiff` emits all checks present in either side's `perCheckDelta`, including zero-delta rows. For long scorecards this is noisy; a filter would clean up the output.

## Style / consistency

- **Fixture vs inline test data.** Norm: ">3 lines → fixture file; otherwise inline." Not enforced.
- **`runD3` is async with no awaits.** Deliberate for `Promise.all` parity with the other `runD*` checks; documented inline.
- **D5 is sync.** Plan-spec divergence from the other `runD*` signatures. Deliberate.
- **`formatEntriesYaml` defensive quoting.** Currently `reason` and `approved_by` are bare scalars. If they ever contain `:` or `#`, YAML breaks. Safe today (always `TODO`), worth quoting if dynamic content lands.
- **`formatEntriesYaml` snapshot test.** Untested today. A snapshot would catch quoting regressions.

## Allowlist authoring (v0 ships empty)

The production notebook produces ~22 D4 blockers against spec-cited paths that are intentionally proposal-state (`packages/api/notebook-skills/*` is the canonical example — not built yet, but referenced in spec). These need section-scoped `allowlist.yaml` entries to flip from blocker → pass-with-annotation.

The schema (`evals/src/config.mts:AllowlistEntrySchema`) requires `reason`, `approved_by`, `approved_at` per entry. Author them once the spec sections stabilize.

## POSTV1 carryover

- **CLI should run the docs/ guard before invoking the runner.** Today, the sanity test (`setup.test.mts`) is the only forcing function. Someone running `pnpm --filter evals eval:notebook` in a fresh worktree without `docs/` linked will see a cell-execution error, not the helpful "run scripts/link-docs.sh" message. The CLI now has four subcommands but none mirrors the setup check up front.
