import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { loadPromptSpec } from '../prompt-spec.mts';

const fixtures = join(import.meta.dirname, 'fixtures');

describe('prompt-spec parser', () => {
  it('extracts prompt_spec from front-matter', async () => {
    const spec = await loadPromptSpec(join(fixtures, 'prompt-with-spec.md'));
    expect(spec).not.toBeNull();
    expect(spec!.required_topics).toHaveLength(2);
    expect(spec!.required_topics[0]!.id).toBe('app-builder-removal');
    expect(spec!.required_topics[0]!.heading_slugs).toContain('app-builder-removal');
    expect(spec!.required_artifacts).toContain('docs/discovery/01-notebook-runtime.md');
  });

  it('returns null when no front-matter present', async () => {
    const spec = await loadPromptSpec(join(fixtures, 'prompt-without-spec.md'));
    expect(spec).toBeNull();
  });

  it('throws when prompt_spec is present but fails schema validation', async () => {
    await expect(loadPromptSpec(join(fixtures, 'prompt-with-invalid-spec.md'))).rejects.toThrow();
  });
});
