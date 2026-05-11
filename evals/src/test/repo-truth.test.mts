import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { commitExists, commitByMessage, pathExistsAtRef } from '../repo-truth.mts';

const REPO = resolve(import.meta.dirname, '..', '..', '..');

describe('repo-truth', () => {
  it('commitExists returns true for c7a52cc', async () => {
    expect(await commitExists(REPO, 'c7a52cc')).toBe(true);
  });

  it('commitExists returns false for a bogus sha', async () => {
    expect(await commitExists(REPO, 'deadbeef00000000')).toBe(false);
  });

  it('commitByMessage finds the app-builder removal commit', async () => {
    const hits = await commitByMessage(REPO, 'Remove all app-builder stuff');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]).toMatch(/^c7a52cc/);
  });

  it('pathExistsAtRef returns true for a real path at HEAD', async () => {
    expect(await pathExistsAtRef(REPO, 'HEAD', 'packages/api/srcmd/decoding.mts')).toBe(true);
  });

  it('pathExistsAtRef returns false for a missing path at HEAD', async () => {
    expect(await pathExistsAtRef(REPO, 'HEAD', 'packages/does/not/exist.mts')).toBe(false);
  });
});
