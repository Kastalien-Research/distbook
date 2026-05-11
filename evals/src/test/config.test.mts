// evals/src/test/config.test.mts
import { describe, it, expect } from 'vitest';
import { join, resolve } from 'node:path';
import { loadConfig, loadAllowlist } from '../config.mts';

const ROOT = resolve(import.meta.dirname, '..', '..');

describe('config', () => {
  it('loads config.yaml with required structure', async () => {
    const cfg = await loadConfig(join(ROOT, 'config.yaml'));
    expect(cfg.boundaries[0]!.commit).toBe('c7a52cc');
    expect(cfg.required_files.discovery.length).toBeGreaterThan(0);
    expect(cfg.repo_roots).toEqual(['packages/', 'srcbook/']);
  });

  it('loads allowlist.yaml with a structurally valid entries array', async () => {
    const allow = await loadAllowlist(join(ROOT, 'allowlist.yaml'));
    expect(Array.isArray(allow.entries)).toBe(true);
    for (const entry of allow.entries) {
      expect(typeof entry.check).toBe('string');
      expect(typeof entry.reason).toBe('string');
      expect(typeof entry.approved_by).toBe('string');
      expect(typeof entry.approved_at).toBe('string');
    }
  });
});
