# @distbook/evals

Score `docs/discovery/*` and `docs/spec/*` against repo truth. The eval lives
as a Srcbook notebook at `notebooks/eval-discovery-spec.src.md` and runs both
headlessly and interactively in the Srcbook UI.

## Run

```bash
pnpm install
pnpm --filter evals run eval:notebook              # full eval
pnpm --filter evals run eval:notebook -- --no-semantic
pnpm --filter evals run eval:notebook -- --ref 'c7a52cc^'
```

Scorecard JSON lands in `evals/runs/<timestamp>.json`. Exit code 0 if no blockers, 1 otherwise.

If `docs/discovery/` or `docs/spec/` are missing (`docs/` is gitignored at the
parent repo level), run `bash evals/scripts/link-docs.sh` once from the
worktree root to symlink them in. The setup test fails fast with the same
remediation if it's ever needed again.

## Checks

- **D1** required files present
- **D2** git-claim verification (catches "commit X is absent" when present)
- **D3** boundary commit anchoring (catches `fc57dd5` used as pre-removal state when `c7a52cc` is the real boundary)
- **D4** cited path validity at the analysis ref, with `allowlist.yaml` for proposal paths
- **D5** citation density — spec paragraphs need ≥1 repo path citation, not just `docs/`
- **D6** cross-doc anchor accuracy (does the linked heading exist in the target doc)
- **F7** imprecise relative path citations (suggests the full repo path)

## Allowlist

Every blocker can be overridden in `allowlist.yaml`. Each entry requires `check`, `scope` (`section`/`doc`/`global`), `reason`, `approved_by`, `approved_at`. Overrides are PR-reviewed. Filtering happens in the scorecard layer, not per-check.

## Semantic layer

A single `@openai/agents` call (gpt-5.4-mini-2026-03-17) extracts structured claims from prose; verification stays deterministic in `repo-truth.mts`. Skipped when `OPENAI_API_KEY` is unset or `--no-semantic` is passed.

## See also

- `POSTV0.md` — items deliberately deferred past v0 (allowlist authoring, BaseFinding type, zod v4 migration, etc.)
