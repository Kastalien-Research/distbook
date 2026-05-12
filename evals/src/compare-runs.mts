// evals/src/compare-runs.mts
// Pure logic for diffing two scorecard JSONs. No I/O, no async, no side effects.

export type ScorecardLike = {
  summary: { pass: number; blocker: number; allowlisted: number; verdict: 'pass' | 'blocker' };
  blockers: Array<{
    id: string;
    check: string;
    doc: string;
    status: string;
    detail: string;
    [k: string]: unknown;
  }>;
};

export type ScorecardDiff = {
  summaryDelta: { pass: number; blocker: number; allowlisted: number };
  verdictChange: { from: string; to: string } | null;
  newBlockerIds: string[];
  removedBlockerIds: string[];
  persistentBlockerIds: string[];
  perCheckDelta: Record<string, { a: number; b: number; delta: number }>;
};

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

function countByCheck(xs: ScorecardLike['blockers']): Record<string, number> {
  const m: Record<string, number> = {};
  for (const f of xs) m[f.check] = (m[f.check] ?? 0) + 1;
  return m;
}

export function compareScorecards(a: ScorecardLike, b: ScorecardLike): ScorecardDiff {
  const aIds = new Set(a.blockers.map((f) => f.id));
  const bIds = new Set(b.blockers.map((f) => f.id));
  const newBlockerIds = [...bIds].filter((id) => !aIds.has(id));
  const removedBlockerIds = [...aIds].filter((id) => !bIds.has(id));
  const persistentBlockerIds = [...aIds].filter((id) => bIds.has(id));

  const aCounts = countByCheck(a.blockers);
  const bCounts = countByCheck(b.blockers);
  const checks = new Set([...Object.keys(aCounts), ...Object.keys(bCounts)]);
  const perCheckDelta: ScorecardDiff['perCheckDelta'] = {};
  for (const c of checks) {
    const aN = aCounts[c] ?? 0;
    const bN = bCounts[c] ?? 0;
    perCheckDelta[c] = { a: aN, b: bN, delta: bN - aN };
  }

  return {
    summaryDelta: {
      pass: b.summary.pass - a.summary.pass,
      blocker: b.summary.blocker - a.summary.blocker,
      allowlisted: b.summary.allowlisted - a.summary.allowlisted,
    },
    verdictChange:
      a.summary.verdict === b.summary.verdict
        ? null
        : { from: a.summary.verdict, to: b.summary.verdict },
    newBlockerIds,
    removedBlockerIds,
    persistentBlockerIds,
    perCheckDelta,
  };
}

export function formatDiff(diff: ScorecardDiff): string {
  const lines: string[] = [];
  lines.push('=== Scorecard diff ===');
  lines.push(
    `Summary: pass ${signed(diff.summaryDelta.pass)}, blocker ${signed(diff.summaryDelta.blocker)}, allowlisted ${signed(diff.summaryDelta.allowlisted)}`,
  );
  if (diff.verdictChange !== null) {
    lines.push(`Verdict: ${diff.verdictChange.from} → ${diff.verdictChange.to}`);
  }
  lines.push('');
  lines.push('Per-check blocker counts:');
  for (const [check, d] of Object.entries(diff.perCheckDelta)) {
    lines.push(`  ${check}: ${d.a} → ${d.b} (${signed(d.delta)})`);
  }
  if (diff.newBlockerIds.length > 0) {
    lines.push('');
    lines.push('New blockers:');
    for (const id of diff.newBlockerIds) lines.push(`  + ${id}`);
  }
  if (diff.removedBlockerIds.length > 0) {
    lines.push('');
    lines.push('Resolved blockers:');
    for (const id of diff.removedBlockerIds) lines.push(`  - ${id}`);
  }
  return lines.join('\n');
}
