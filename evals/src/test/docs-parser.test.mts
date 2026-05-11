// evals/src/test/docs-parser.test.mts
import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseSections, extractCommitClaims, extractCitedPaths } from '../docs-parser.mts';

const fixture = join(import.meta.dirname, 'fixtures', 'sample-doc.md');

describe('docs-parser', () => {
  it('parseSections splits on h2 headings', async () => {
    const src = await readFile(fixture, 'utf8');
    const sections = parseSections(src);
    expect(sections.map((s) => s.heading)).toEqual([null, 'Section A', 'Section B']);
  });

  it('extractCommitClaims finds positive and negative claims', async () => {
    const src = await readFile(fixture, 'utf8');
    const claims = extractCommitClaims(src);
    const present = claims.find((c) => c.sha === 'c7a52cc');
    const absent = claims.find((c) => c.sha === 'deadbeef00000000');
    expect(present?.assertion).toBe('present');
    expect(absent?.assertion).toBe('absent');
  });

  it('extractCitedPaths returns repo-shaped paths only', async () => {
    const src = await readFile(fixture, 'utf8');
    const paths = extractCitedPaths(src);
    expect(paths).toContain('packages/api/srcmd/decoding.mts');
    expect(paths).toContain('packages/api/session.mts');
    expect(paths).toContain('packages/api/exec.mts');
    expect(paths).not.toContain('docs/discovery/00-repo-map.md');
  });

  it('extractCitedPaths roots parameter overrides the default', async () => {
    const src = await readFile(fixture, 'utf8');
    const paths = extractCitedPaths(src, ['custom/']);
    expect(paths).not.toContain('packages/api/srcmd/decoding.mts');
    expect(paths).not.toContain('packages/api/session.mts');
    expect(paths).not.toContain('packages/api/exec.mts');
  });
});
