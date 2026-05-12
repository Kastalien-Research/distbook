// evals/src/test/compare-runs.test.mts
import { describe, it, expect } from 'vitest';
import { compareScorecards, type ScorecardLike } from '../compare-runs.mts';

const cardA: ScorecardLike = {
  summary: { pass: 100, blocker: 5, allowlisted: 3, verdict: 'blocker' },
  blockers: [
    { id: 'D2-x', check: 'D2', doc: 'a.md', status: 'blocker', detail: '' },
    { id: 'D4-y', check: 'D4', doc: 'b.md', status: 'blocker', detail: '' },
  ],
};
const cardB: ScorecardLike = {
  summary: { pass: 102, blocker: 4, allowlisted: 3, verdict: 'blocker' },
  blockers: [
    { id: 'D2-x', check: 'D2', doc: 'a.md', status: 'blocker', detail: '' }, // persistent
    { id: 'D4-z', check: 'D4', doc: 'c.md', status: 'blocker', detail: '' }, // new
  ],
};

describe('compareScorecards', () => {
  it('computes summary deltas', () => {
    const diff = compareScorecards(cardA, cardB);
    expect(diff.summaryDelta.pass).toBe(+2);
    expect(diff.summaryDelta.blocker).toBe(-1);
  });

  it('classifies blockers as new, removed, persistent', () => {
    const diff = compareScorecards(cardA, cardB);
    expect(diff.newBlockerIds).toContain('D4-z');
    expect(diff.removedBlockerIds).toContain('D4-y');
    expect(diff.persistentBlockerIds).toContain('D2-x');
  });
});
