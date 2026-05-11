// evals/src/scorecard.mts
import { writeFile } from 'node:fs/promises';
import { z } from 'zod';

const FindingSchema = z
  .object({
    id: z.string(),
    check: z.string(),
    doc: z.string(),
    status: z.enum(['pass', 'blocker']),
    detail: z.string(),
    allowlisted: z.unknown().optional(),
  })
  .passthrough();

export const ScorecardSchema = z.object({
  schema_version: z.literal('0'),
  run_id: z.string(),
  config_path: z.string(),
  allowlist_path: z.string(),
  repo_ref: z.string(),
  head_sha: z.string(),
  boundary_commit: z.string(),
  prompt_path: z.string(),
  docs_evaluated: z.array(z.string()),
  summary: z.object({
    pass: z.number(),
    blocker: z.number(),
    allowlisted: z.number(),
    verdict: z.enum(['pass', 'blocker']),
  }),
  blockers: z.array(FindingSchema),
  allowlisted: z.array(FindingSchema),
  passes_count_only: z.number(),
});

export type Scorecard = z.infer<typeof ScorecardSchema>;
export type Finding = z.infer<typeof FindingSchema>;

export type BuildInput = {
  runId: string;
  configPath: string;
  allowlistPath: string;
  repoRef: string;
  headSha: string;
  boundaryCommit: string;
  promptPath: string;
  docsEvaluated: string[];
  findings: Finding[];
};

export function buildScorecard(input: BuildInput): Scorecard {
  const blockers = input.findings.filter((f) => f.status === 'blocker');
  const allowlisted = input.findings.filter((f) => f.allowlisted !== undefined);
  const passes = input.findings.filter((f) => f.status === 'pass' && f.allowlisted === undefined);
  return ScorecardSchema.parse({
    schema_version: '0',
    run_id: input.runId,
    config_path: input.configPath,
    allowlist_path: input.allowlistPath,
    repo_ref: input.repoRef,
    head_sha: input.headSha,
    boundary_commit: input.boundaryCommit,
    prompt_path: input.promptPath,
    docs_evaluated: input.docsEvaluated,
    summary: {
      pass: passes.length,
      blocker: blockers.length,
      allowlisted: allowlisted.length,
      verdict: blockers.length > 0 ? 'blocker' : 'pass',
    },
    blockers,
    allowlisted,
    passes_count_only: passes.length,
  });
}

export async function writeScorecard(card: Scorecard, path: string): Promise<void> {
  await writeFile(path, JSON.stringify(card, null, 2), 'utf8');
}
