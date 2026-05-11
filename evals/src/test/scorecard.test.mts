// evals/src/test/scorecard.test.mts
import { describe, it, expect } from 'vitest';
import { ScorecardSchema, buildScorecard } from '../scorecard.mts';

describe('scorecard', () => {
  it('builds a valid scorecard from findings', () => {
    const card = buildScorecard({
      runId: '2026-05-11T00-00-00Z',
      configPath: 'evals/config.yaml',
      allowlistPath: 'evals/allowlist.yaml',
      repoRef: 'HEAD',
      headSha: 'abc1234',
      boundaryCommit: 'c7a52cc',
      promptPath: 'docs/superpowers/prompts/p.md',
      docsEvaluated: ['docs/spec/x.md'],
      findings: [
        { id: 'D2-x', check: 'D2', doc: 'docs/spec/x.md', status: 'pass', detail: 'ok' } as any,
        {
          id: 'D4-y',
          check: 'D4',
          doc: 'docs/spec/x.md',
          status: 'blocker',
          detail: 'missing',
        } as any,
      ],
    });
    expect(ScorecardSchema.parse(card)).toBeTruthy();
    expect(card.summary.blocker).toBe(1);
    expect(card.summary.verdict).toBe('blocker');
    expect(card.blockers).toHaveLength(1);
  });
});
