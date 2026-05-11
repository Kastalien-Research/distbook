// evals/src/checks/d4-cited-paths.mts
import { pathExistsAtRef } from '../repo-truth.mts';
import { extractCitedPaths, parseSections } from '../docs-parser.mts';
import type { Allowlist, AllowlistEntry } from '../config.mts';

export type Finding = {
  id: string;
  check: 'D4';
  doc: string;
  cited: string;
  ref: string;
  status: 'pass' | 'blocker';
  allowlisted?: AllowlistEntry;
  detail: string;
};

export type RunD4Input = {
  repoPath: string;
  ref: string;
  doc: string;
  source: string;
  allowlist: Allowlist;
};

function matchesPattern(path: string, pattern: string): boolean {
  // Minimal glob: only handles trailing /* and simple basenames.
  if (pattern.endsWith('/*')) return path.startsWith(pattern.slice(0, -2));
  if (pattern.includes('*')) {
    const re = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
    return re.test(path);
  }
  return path === pattern;
}

function sectionFor(line: number, sections: ReturnType<typeof parseSections>): string | null {
  let current: string | null = null;
  for (const s of sections) {
    if (s.startLine <= line) current = s.heading;
    else break;
  }
  return current;
}

function applicableAllowlist(
  entry: AllowlistEntry,
  doc: string,
  section: string | null,
  path: string,
): boolean {
  if (entry.check !== 'D4') return false;
  if (entry.in_doc && entry.in_doc !== doc) return false;
  if (entry.scope === 'section' && entry.section_heading !== section) return false;
  if (entry.pattern && !matchesPattern(path, entry.pattern)) return false;
  return true;
}

export async function runD4(input: RunD4Input): Promise<Finding[]> {
  const { repoPath, ref, doc, source, allowlist } = input;
  const sections = parseSections(source);
  const paths = extractCitedPaths(source);
  const findings: Finding[] = [];

  // Find each path's first occurrence line for section context.
  const lines = source.split('\n');
  const lineOf: Record<string, number> = {};
  for (const p of paths) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i]!.includes(`\`${p}\``)) {
        lineOf[p] = i + 1;
        break;
      }
    }
  }

  for (const p of paths) {
    const exists = await pathExistsAtRef(repoPath, ref, p);
    const section = sectionFor(lineOf[p] ?? 1, sections);
    if (exists) {
      findings.push({
        id: `D4-${doc}-${p}`,
        check: 'D4',
        doc,
        cited: p,
        ref,
        status: 'pass',
        detail: `${p} exists at ${ref}`,
      });
      continue;
    }
    const allow = allowlist.entries.find((e) => applicableAllowlist(e, doc, section, p));
    if (allow) {
      findings.push({
        id: `D4-${doc}-${p}`,
        check: 'D4',
        doc,
        cited: p,
        ref,
        status: 'pass',
        allowlisted: allow,
        detail: `allowlisted: ${allow.reason}`,
      });
    } else {
      findings.push({
        id: `D4-${doc}-${p}`,
        check: 'D4',
        doc,
        cited: p,
        ref,
        status: 'blocker',
        detail: `cited path missing at ${ref}: ${p}`,
      });
    }
  }
  return findings;
}
