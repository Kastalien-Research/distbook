// evals/src/checks/d5-citation-density.mts

export type Finding = {
  id: string;
  check: 'D5';
  doc: string;
  line: number;
  status: 'pass' | 'blocker';
  detail: string;
};

export type RunD5Input = {
  doc: string;
  source: string;
};

const GROUND_HEURISTICS = /(\bthe repo\b|\bcurrently\b|\bapp[- ]builder\b|`packages\/|`srcbook\/)/i;
const REPO_CITE_RE = /`(packages\/|srcbook\/)[^`]+`/g;
const DOC_CITE_RE = /`docs\/[^`]+`/g;

export function runD5(input: RunD5Input): Finding[] {
  if (!input.doc.startsWith('docs/spec/')) return [];

  const findings: Finding[] = [];
  const lines = input.source.split('\n');

  // Group consecutive non-blank lines into paragraphs.
  let paraStart = 0;
  let paraText = '';
  const paragraphs: Array<{ startLine: number; text: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === '') {
      if (paraText.trim()) paragraphs.push({ startLine: paraStart + 1, text: paraText });
      paraStart = i + 1;
      paraText = '';
    } else {
      if (!paraText) paraStart = i;
      paraText += (paraText ? '\n' : '') + line;
    }
  }
  if (paraText.trim()) paragraphs.push({ startLine: paraStart + 1, text: paraText });

  for (const p of paragraphs) {
    // Skip headings.
    if (p.text.startsWith('#')) continue;
    if (!GROUND_HEURISTICS.test(p.text)) continue;
    const repoCites = (p.text.match(REPO_CITE_RE) ?? []).length;
    const docCites = (p.text.match(DOC_CITE_RE) ?? []).length;
    if (repoCites === 0 && docCites > 0) {
      findings.push({
        id: `D5-${input.doc}-line${p.startLine}`,
        check: 'D5',
        doc: input.doc,
        line: p.startLine,
        status: 'blocker',
        detail: `Repo-grounded paragraph cites only docs/, not a repo path.`,
      });
    } else if (repoCites > 0) {
      findings.push({
        id: `D5-${input.doc}-line${p.startLine}`,
        check: 'D5',
        doc: input.doc,
        line: p.startLine,
        status: 'pass',
        detail: `Repo-grounded paragraph has ${repoCites} repo citation(s).`,
      });
    }
  }
  return findings;
}
