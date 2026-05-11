// evals/src/test/d5-citation-density.test.mts
import { describe, it, expect } from 'vitest';
import { runD5 } from '../checks/d5-citation-density.mts';

describe('D5 citation density', () => {
  it('flags repo-grounded paragraph that only cites docs', () => {
    const src = `# Spec\n\nObserved fact: the repo already does this and that (\`docs/discovery/00-repo-map.md\`).\n`;
    const findings = runD5({ doc: 'docs/spec/x.md', source: src });
    expect(findings.some((f) => f.status === 'blocker')).toBe(true);
  });

  it('passes when repo path is cited alongside', () => {
    const src = `# Spec\n\nObserved fact: the repo already does this in \`packages/api/session.mts\` (\`docs/discovery/00-repo-map.md\`).\n`;
    const findings = runD5({ doc: 'docs/spec/x.md', source: src });
    expect(findings.every((f) => f.status === 'pass')).toBe(true);
  });

  it('ignores non-spec docs', () => {
    const src = `# Discovery doc\n\nObserved (\`docs/discovery/00-repo-map.md\`).\n`;
    const findings = runD5({ doc: 'docs/discovery/x.md', source: src });
    expect(findings).toHaveLength(0);
  });
});
