// evals/src/checks/d2-git-claims.mts
import { commitByMessage, commitExists } from '../repo-truth.mts';
import { extractCommitClaims } from '../docs-parser.mts';

export type Finding = {
  id: string;
  check: 'D2';
  doc: string;
  line: number;
  claim: string;
  expectedByDoc: 'present' | 'absent';
  actual: 'present' | 'absent';
  status: 'pass' | 'blocker';
  detail: string;
};

export type RunD2Input = {
  repoPath: string;
  doc: string;
  source: string;
};

export async function runD2(input: RunD2Input): Promise<Finding[]> {
  const shaClaims = extractCommitClaims(input.source);
  const findings: Finding[] = [];

  for (const c of shaClaims) {
    const present = await commitExists(input.repoPath, c.sha);
    const actual: 'present' | 'absent' = present ? 'present' : 'absent';
    const ok = actual === c.assertion;
    findings.push({
      id: `D2-${c.sha}-${c.assertion}-line${c.sourceLine}`,
      check: 'D2',
      doc: input.doc,
      line: c.sourceLine,
      claim: c.sourceText.trim(),
      expectedByDoc: c.assertion,
      actual,
      status: ok ? 'pass' : 'blocker',
      detail: ok
        ? `Doc claim of ${c.assertion} verified for ${c.sha}.`
        : `Doc claimed ${c.assertion}; git says ${actual}: ${c.sha}.`,
    });
  }

  // Negative-by-message claims (e.g., "no local commit matching '<msg>' exists").
  const negMsgRe = /no local commit matching `([^`]+)`/gi;
  let m: RegExpExecArray | null;
  while ((m = negMsgRe.exec(input.source))) {
    const fragment = m[1]!;
    const hits = await commitByMessage(input.repoPath, fragment);
    const lineNumber = input.source.slice(0, m.index).split('\n').length;
    if (hits.length > 0) {
      findings.push({
        id: `D2-msg-${lineNumber}`,
        check: 'D2',
        doc: input.doc,
        line: lineNumber,
        claim: `no local commit matching '${fragment}'`,
        expectedByDoc: 'absent',
        actual: 'present',
        status: 'blocker',
        detail: `Doc claimed absence; git found: ${hits[0]}`,
      });
    }
  }

  return findings;
}
