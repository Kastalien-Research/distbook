import { describe, it, expect } from 'vitest';
import { suggestEntries } from '../suggest-allowlist.mts';

describe('suggestEntries', () => {
  it('groups blockers by (check, in_doc, section) and infers a pattern', () => {
    const blockers = [
      {
        id: 'D4-1',
        check: 'D4',
        doc: 'a.md',
        status: 'blocker',
        detail: '',
        cited: 'packages/x/foo.mts',
        section: 'Sec',
      },
      {
        id: 'D4-2',
        check: 'D4',
        doc: 'a.md',
        status: 'blocker',
        detail: '',
        cited: 'packages/x/bar.mts',
        section: 'Sec',
      },
    ];
    const entries = suggestEntries(blockers);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.check).toBe('D4');
    expect(entries[0]!.pattern).toBe('packages/x/*');
  });

  it('emits one entry per (check, doc) when no section context', () => {
    const blockers = [{ id: 'D2-1', check: 'D2', doc: 'a.md', status: 'blocker', detail: '' }];
    const entries = suggestEntries(blockers);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.pattern).toBeUndefined();
  });

  it('returns the path verbatim when there is only one cited path', () => {
    const blockers = [
      {
        id: 'D4-1',
        check: 'D4',
        doc: 'a.md',
        status: 'blocker',
        detail: '',
        cited: 'srcbook/index.mts',
        section: 'Sec',
      },
    ];
    const entries = suggestEntries(blockers);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.pattern).toBe('srcbook/index.mts');
  });
});
