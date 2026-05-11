// evals/src/test/scorecard.test.mts
import { describe, it, expect } from 'vitest';
import { ScorecardSchema, buildScorecard } from '../scorecard.mts';

const BASE_INPUT = {
  runId: '2026-05-11T00-00-00Z',
  configPath: 'evals/config.yaml',
  allowlistPath: 'evals/allowlist.yaml',
  repoRef: 'HEAD',
  headSha: 'abc1234',
  boundaryCommit: 'c7a52cc',
  promptPath: 'docs/superpowers/prompts/p.md',
  docsEvaluated: ['docs/spec/x.md'],
};

describe('scorecard', () => {
  it('builds a valid scorecard from findings', () => {
    const card = buildScorecard({
      ...BASE_INPUT,
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

  it('places allowlisted findings in the allowlisted bucket', () => {
    const allowlistEntry = {
      check: 'D4',
      in_doc: 'docs/spec/x.md',
      scope: 'section' as const,
      section_heading: 'Proposals',
      pattern: 'packages/api/foo/*.mts',
      reason: 'Future work.',
      approved_by: 'test',
      approved_at: '2026-05-11',
    };
    const card = buildScorecard({
      ...BASE_INPUT,
      findings: [
        { id: 'D2-x', check: 'D2', doc: 'docs/spec/x.md', status: 'pass', detail: 'ok' } as any,
        {
          id: 'D4-y',
          check: 'D4',
          doc: 'docs/spec/x.md',
          status: 'pass',
          detail: 'allowlisted: Future work.',
          allowlisted: allowlistEntry,
        } as any,
      ],
    });
    expect(ScorecardSchema.parse(card)).toBeTruthy();
    expect(card.summary.blocker).toBe(0);
    expect(card.summary.allowlisted).toBe(1);
    expect(card.summary.verdict).toBe('pass');
    expect(card.allowlisted).toHaveLength(1);
  });
});
