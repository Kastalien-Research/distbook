// evals/src/suggest-allowlist.mts

export type SuggestedEntry = {
  check: string;
  in_doc?: string;
  scope: 'section' | 'doc' | 'global';
  section_heading?: string;
  pattern?: string;
  reason: string;
  approved_by: string;
  approved_at: string;
};

export type BlockerLike = {
  id: string;
  check: string;
  doc: string;
  status: string;
  detail: string;
  cited?: string;
  section?: string;
  [k: string]: unknown;
};

function commonPathPrefix(paths: string[]): string | undefined {
  if (paths.length === 0) return undefined;
  if (paths.length === 1) return paths[0];
  const parts = paths.map((p) => p.split('/'));
  const shortest = Math.min(...parts.map((p) => p.length));
  const prefix: string[] = [];
  for (let i = 0; i < shortest; i++) {
    const segment = parts[0]![i];
    if (parts.every((p) => p[i] === segment)) prefix.push(segment!);
    else break;
  }
  if (prefix.length === 0) return undefined;
  return prefix.join('/') + '/*';
}

export function suggestEntries(blockers: BlockerLike[]): SuggestedEntry[] {
  const groups = new Map<string, BlockerLike[]>();
  for (const b of blockers) {
    const key = `${b.check}|${b.doc}|${b.section ?? ''}`;
    const arr = groups.get(key) ?? [];
    arr.push(b);
    groups.set(key, arr);
  }
  const out: SuggestedEntry[] = [];
  for (const [, group] of groups) {
    const first = group[0]!;
    const cited = group.map((b) => b.cited).filter((c): c is string => typeof c === 'string');
    const pattern = cited.length > 0 ? commonPathPrefix(cited) : undefined;
    out.push({
      check: first.check,
      in_doc: first.doc,
      scope: first.section ? 'section' : 'doc',
      ...(first.section ? { section_heading: first.section } : {}),
      ...(pattern ? { pattern } : {}),
      reason: 'TODO — describe why this finding is acceptable',
      approved_by: 'TODO',
      approved_at: new Date().toISOString().slice(0, 10),
    });
  }
  return out;
}

export function formatEntriesYaml(entries: SuggestedEntry[]): string {
  // Minimal YAML emitter — js-yaml is overkill for this fixed shape.
  const lines: string[] = [];
  for (const e of entries) {
    lines.push(`- check: ${e.check}`);
    if (e.in_doc) lines.push(`  in_doc: ${e.in_doc}`);
    lines.push(`  scope: ${e.scope}`);
    if (e.section_heading)
      lines.push(`  section_heading: '${e.section_heading.replace(/'/g, "''")}'`);
    if (e.pattern) lines.push(`  pattern: ${e.pattern}`);
    lines.push(`  reason: ${e.reason}`);
    lines.push(`  approved_by: ${e.approved_by}`);
    lines.push(`  approved_at: '${e.approved_at}'`);
    lines.push('');
  }
  return lines.join('\n');
}
