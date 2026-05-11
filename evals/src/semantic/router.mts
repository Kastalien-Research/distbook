// evals/src/semantic/router.mts
import { commitExists, commitByMessage, pathExistsAtRef, prExists } from '../repo-truth.mts';
import type { Claim } from './extractor.mts';

export type Finding = {
  id: string;
  check: 'D2' | 'D3' | 'D4';
  doc: string;
  status: 'pass' | 'blocker';
  detail: string;
};

export type RouteInput = {
  repoPath: string;
  doc: string;
  claims: Claim[];
  ref?: string;
};

export async function routeClaims(input: RouteInput): Promise<Finding[]> {
  const ref = input.ref ?? 'HEAD';
  const findings: Finding[] = [];

  for (const c of input.claims) {
    switch (c.kind) {
      case 'commit-exists': {
        const present = await commitExists(input.repoPath, c.sha);
        const ok = (present ? 'present' : 'absent') === c.assertion;
        findings.push({
          id: `D2-${c.sha}-line${c.sourceLine}`,
          check: 'D2',
          doc: input.doc,
          status: ok ? 'pass' : 'blocker',
          detail: ok
            ? `Claim verified: ${c.sha} ${c.assertion}`
            : `Doc said ${c.assertion}; reality: ${present ? 'present' : 'absent'} for ${c.sha}`,
        });
        break;
      }
      case 'commit-by-message': {
        const hits = await commitByMessage(input.repoPath, c.messageFragment);
        const present = hits.length > 0;
        const ok = (present ? 'present' : 'absent') === c.assertion;
        findings.push({
          id: `D2-msg-line${c.sourceLine}`,
          check: 'D2',
          doc: input.doc,
          status: ok ? 'pass' : 'blocker',
          detail: ok
            ? `Message claim verified: "${c.messageFragment}" ${c.assertion}`
            : `Doc said ${c.assertion}; git found: ${hits[0] ?? '(none)'}`,
        });
        break;
      }
      case 'path-exists': {
        const present = await pathExistsAtRef(input.repoPath, ref, c.path);
        const ok = (present ? 'present' : 'absent') === c.assertion;
        findings.push({
          id: `D4-${c.path}-line${c.sourceLine}`,
          check: 'D4',
          doc: input.doc,
          status: ok ? 'pass' : 'blocker',
          detail: ok
            ? `Path ${c.assertion} verified: ${c.path}`
            : `Doc said ${c.assertion}; reality: ${present ? 'present' : 'absent'} for ${c.path}`,
        });
        break;
      }
      case 'pr-exists': {
        const present = await prExists(input.repoPath, c.number);
        findings.push({
          id: `D2-pr-${c.number}-line${c.sourceLine}`,
          check: 'D2',
          doc: input.doc,
          status: present ? 'pass' : 'blocker',
          detail: present
            ? `PR #${c.number} found in history`
            : `PR #${c.number} not found in history`,
        });
        break;
      }
      case 'boundary-anchor': {
        // Boundary checks need cross-paragraph state; defer to D3 module.
        break;
      }
    }
  }
  return findings;
}
