// evals/src/allowlist-apply.mts
import type { Allowlist, AllowlistEntry } from './config.mts';
import type { Finding } from './scorecard.mts';

function matchesPattern(value: string, pattern: string): boolean {
  if (pattern.endsWith('/*')) return value.startsWith(pattern.slice(0, -2));
  if (pattern.includes('*')) {
    const re = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
    return re.test(value);
  }
  return value === pattern;
}

function applies(entry: AllowlistEntry, finding: Finding): boolean {
  if (entry.check !== finding.check) return false;
  if (entry.in_doc && entry.in_doc !== finding.doc) return false;
  if (entry.scope === 'section') {
    const section = (finding as Finding & { section?: string }).section ?? null;
    if (entry.section_heading !== section) return false;
  }
  if (entry.pattern) {
    const candidate =
      (finding as Finding & { cited?: string }).cited ??
      (finding as Finding & { suggestedFix?: string }).suggestedFix ??
      '';
    if (!matchesPattern(candidate, entry.pattern)) return false;
  }
  return true;
}

/**
 * Apply the allowlist to a flat list of findings. Blocker findings matched
 * by an applicable entry are flipped to `status: 'pass'` and tagged with
 * the matching `allowlisted` entry. Pass findings are unchanged.
 */
export function applyAllowlist(findings: Finding[], allowlist: Allowlist): Finding[] {
  return findings.map((f) => {
    if (f.status !== 'blocker') return f;
    const matched = allowlist.entries.find((e) => applies(e, f));
    if (!matched) return f;
    return { ...f, status: 'pass', allowlisted: matched };
  });
}
