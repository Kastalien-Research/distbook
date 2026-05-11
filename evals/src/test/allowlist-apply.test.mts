// evals/src/test/allowlist-apply.test.mts
import { describe, it, expect } from 'vitest';
import { applyAllowlist } from '../allowlist-apply.mts';
import type { Allowlist } from '../config.mts';
import type { Finding } from '../scorecard.mts';

const allowlist: Allowlist = {
  entries: [
    {
      check: 'D4',
      in_doc: 'docs/spec/notebook-skills-runtime-v0.md',
      scope: 'section',
      section_heading: 'Effect-TS architecture proposal',
      pattern: 'packages/api/notebook-skills/*.mts',
      reason: 'Proposal paths.',
      approved_by: 'test',
      approved_at: '2026-05-11',
    },
  ],
};

describe('applyAllowlist', () => {
  it('flips a matching blocker to pass with annotation', () => {
    const findings: Finding[] = [
      {
        id: 'D4-1',
        check: 'D4',
        doc: 'docs/spec/notebook-skills-runtime-v0.md',
        status: 'blocker',
        detail: 'missing',
        cited: 'packages/api/notebook-skills/manifest.mts',
        section: 'Effect-TS architecture proposal',
      } as Finding,
    ];
    const result = applyAllowlist(findings, allowlist);
    expect(result[0]!.status).toBe('pass');
    expect(result[0]!.allowlisted).toBeDefined();
  });

  it('leaves an unrelated blocker unchanged', () => {
    const findings: Finding[] = [
      {
        id: 'D4-2',
        check: 'D4',
        doc: 'other.md',
        status: 'blocker',
        detail: 'x',
        cited: 'a/b.mts',
      } as Finding,
    ];
    const result = applyAllowlist(findings, allowlist);
    expect(result[0]!.status).toBe('blocker');
    expect(result[0]!.allowlisted).toBeUndefined();
  });

  it('leaves pass findings alone', () => {
    const findings: Finding[] = [
      { id: 'X-1', check: 'D2', doc: 'a.md', status: 'pass', detail: 'ok' } as Finding,
    ];
    const result = applyAllowlist(findings, allowlist);
    expect(result[0]!.status).toBe('pass');
  });

  it('respects section scope (no match on different section)', () => {
    const findings: Finding[] = [
      {
        id: 'D4-3',
        check: 'D4',
        doc: 'docs/spec/notebook-skills-runtime-v0.md',
        status: 'blocker',
        detail: 'missing',
        cited: 'packages/api/notebook-skills/manifest.mts',
        section: 'Some other section',
      } as Finding,
    ];
    const result = applyAllowlist(findings, allowlist);
    expect(result[0]!.status).toBe('blocker');
  });
});
