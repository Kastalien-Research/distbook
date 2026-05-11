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
  });

  it('loads allowlist.yaml as empty array initially', async () => {
    const allow = await loadAllowlist(join(ROOT, 'allowlist.yaml'));
    expect(allow.entries).toEqual([]);
  });
});
