// evals/src/checks/d3-boundary.mts

export type Finding = {
  id: string;
  check: 'D3';
  doc: string;
  status: 'pass' | 'blocker';
  detail: string;
};

export type Boundary = {
  topic: string;
  commit: string;
  keywords: string[];
};

export type RunD3Input = {
  doc: string;
  source: string;
  boundary: Boundary;
};

export async function runD3(input: RunD3Input): Promise<Finding[]> {
  const { doc, source, boundary } = input;
  const findings: Finding[] = [];
  const lines = source.split('\n');
  const hasBoundaryRef = source.includes(boundary.commit);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const matchedKeyword = boundary.keywords.find((k) =>
      line.toLowerCase().includes(k.toLowerCase()),
    );
    if (!matchedKeyword) continue;
    if (hasBoundaryRef) {
      findings.push({
        id: `D3-${doc}-line${i + 1}`,
        check: 'D3',
        doc,
        status: 'pass',
        detail: `Keyword "${matchedKeyword}" on line ${i + 1}; boundary commit ${boundary.commit} referenced in doc.`,
      });
    } else {
      findings.push({
        id: `D3-${doc}-line${i + 1}`,
        check: 'D3',
        doc,
        status: 'blocker',
        detail: `Line ${i + 1} references "${matchedKeyword}" but doc does not reference boundary commit ${boundary.commit}.`,
      });
    }
  }
  return findings;
}
