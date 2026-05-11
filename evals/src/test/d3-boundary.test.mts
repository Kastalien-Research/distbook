// evals/src/test/d3-boundary.test.mts
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runD3 } from '../checks/d3-boundary.mts';

describe('D3 boundary', () => {
  it('flags wrong anchor when keyword present but boundary commit absent', async () => {
    const src = await readFile(
      join(import.meta.dirname, 'fixtures', 'docs-with-boundary-bug.md'),
      'utf8',
    );
    const findings = await runD3({
      doc: 'docs-with-boundary-bug.md',
      source: src,
      boundary: {
        topic: 'app_builder_removal',
        commit: 'c7a52cc',
        keywords: ['pre-removal', 'last pre-removal'],
      },
    });
    expect(findings.some((f) => f.status === 'blocker')).toBe(true);
  });

  it('passes when boundary commit is referenced', async () => {
    const findings = await runD3({
      doc: 'ok.md',
      source: '# Doc\n\nThe pre-removal state is `c7a52cc^`.',
      boundary: { topic: 'app_builder_removal', commit: 'c7a52cc', keywords: ['pre-removal'] },
    });
    expect(findings.every((f) => f.status === 'pass')).toBe(true);
  });
});
