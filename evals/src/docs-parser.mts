// evals/src/docs-parser.mts

export type Section = {
  heading: string | null; // null = preamble before first h2
  startLine: number;
  text: string;
};

export type CommitClaim = {
  sha: string;
  assertion: 'present' | 'absent';
  sourceLine: number;
  sourceText: string;
};

const REPO_ROOTS = ['packages/', 'srcbook/'];

export function parseSections(src: string): Section[] {
  const lines = src.split('\n');
  const sections: Section[] = [];
  let current: Section = { heading: null, startLine: 1, text: '' };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      sections.push(current);
      current = { heading: h2[1]!, startLine: i + 1, text: '' };
    } else {
      current.text += (current.text ? '\n' : '') + line;
    }
  }
  sections.push(current);
  return sections;
}

const NEGATION_RE =
  /(does not exist|does not contain|does not include|is not present|is not available|no local commit|not in local history)/i;

export function extractCommitClaims(src: string): CommitClaim[] {
  const claims: CommitClaim[] = [];
  const lines = src.split('\n');
  const shaRe = /`([a-f0-9]{6,40})`/g;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    let m: RegExpExecArray | null;
    shaRe.lastIndex = 0;
    while ((m = shaRe.exec(line))) {
      const sha = m[1]!;
      const negated = NEGATION_RE.test(line);
      claims.push({
        sha,
        assertion: negated ? 'absent' : 'present',
        sourceLine: i + 1,
        sourceText: line,
      });
    }
  }
  return claims;
}

export function extractCitedPaths(src: string): string[] {
  const re = /`([^`]+\.(?:mts|ts|tsx|mjs|js|json))`/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const p = m[1]!;
    if (REPO_ROOTS.some((r) => p.startsWith(r))) found.add(p);
  }
  return [...found];
}

export function extractBareFilenames(src: string): string[] {
  const re = /`([a-zA-Z][a-zA-Z0-9_-]*\.(?:mts|ts|tsx|mjs|js|json))`/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    found.add(m[1]!);
  }
  return [...found];
}
