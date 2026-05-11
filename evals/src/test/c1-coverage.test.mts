import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runC1 } from '../checks/c1-coverage.mts';
import { loadPromptSpec } from '../prompt-spec.mts';

const fixtures = join(import.meta.dirname, 'fixtures');

describe('C1 coverage', () => {
  it('flags a required topic that has no matching heading in any doc', async () => {
    const spec = await loadPromptSpec(join(fixtures, 'prompt-with-spec.md'));
    expect(spec).not.toBeNull();
    const docs = [
      {
        path: 'doc-covers-app-builder.md',
        source: await readFile(join(fixtures, 'doc-covers-app-builder.md'), 'utf8'),
      },
      {
        path: 'doc-no-runtime-section.md',
        source: await readFile(join(fixtures, 'doc-no-runtime-section.md'), 'utf8'),
      },
    ];
    const findings = runC1({ promptSpec: spec!, docs });
    const blockers = findings.filter((f) => f.status === 'blocker');
    expect(blockers).toHaveLength(1);
    expect(blockers[0]!.topic).toBe('notebook-runtime');
  });

  it('passes when every required topic has a heading match', async () => {
    const spec = await loadPromptSpec(join(fixtures, 'prompt-with-spec.md'));
    const docs = [
      {
        path: 'a.md',
        source: '## App-builder removal\n\nText.\n## Notebook runtime\n\nText.',
      },
    ];
    const findings = runC1({ promptSpec: spec!, docs });
    expect(findings.every((f) => f.status === 'pass')).toBe(true);
  });

  it('flags every required topic as blocker when docs list is empty', async () => {
    const spec = await loadPromptSpec(join(fixtures, 'prompt-with-spec.md'));
    const findings = runC1({ promptSpec: spec!, docs: [] });
    const blockers = findings.filter((f) => f.status === 'blocker');
    expect(blockers).toHaveLength(spec!.required_topics.length);
  });

  it('returns no findings when required_topics is empty', () => {
    const findings = runC1({
      promptSpec: { version: '0', required_topics: [], required_artifacts: [] },
      docs: [{ path: 'a.md', source: '# Anything' }],
    });
    expect(findings).toEqual([]);
  });
});
