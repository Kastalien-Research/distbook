// evals/src/test/sanity.test.mts
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('arithmetic works', () => {
    expect(1 + 1).toBe(2);
  });

  it('node version is 22.6 or higher', () => {
    const [major, minor] = process.versions.node.split('.').map(Number);
    expect(major).toBeGreaterThanOrEqual(22);
    if (major === 22) expect(minor).toBeGreaterThanOrEqual(6);
  });
});
