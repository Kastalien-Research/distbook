import type { PromptSpec, RequiredTopic } from '../prompt-spec.mts';

export type Finding = {
  id: string;
  check: 'C1';
  doc: string;
  topic: string;
  status: 'pass' | 'blocker';
  detail: string;
};

export type RunC1Input = {
  promptSpec: PromptSpec;
  docs: Array<{ path: string; source: string }>;
};

function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function extractHeadings(source: string): string[] {
  return source
    .split('\n')
    .filter((line) => /^#+\s/.test(line))
    .map((line) => slugify(line.replace(/^#+\s+/, '')));
}

function topicMatched(topic: RequiredTopic, allHeadings: Set<string>): boolean {
  return topic.heading_slugs.some((slug) => allHeadings.has(slug.toLowerCase()));
}

export function runC1(input: RunC1Input): Finding[] {
  const allHeadings = new Set<string>();
  for (const doc of input.docs) {
    for (const h of extractHeadings(doc.source)) allHeadings.add(h);
  }
  const findings: Finding[] = [];
  const scannedDocs = input.docs.map((d) => d.path).join(', ');
  for (const topic of input.promptSpec.required_topics) {
    const ok = topicMatched(topic, allHeadings);
    findings.push({
      id: `C1-${topic.id}`,
      check: 'C1',
      doc: '(prompt_spec)',
      topic: topic.id,
      status: ok ? 'pass' : 'blocker',
      detail: ok
        ? `Topic '${topic.id}' satisfied by a heading in evaluated docs.`
        : `Required topic '${topic.id}' has no matching heading. Searched slugs: [${topic.heading_slugs.join(', ')}] across ${scannedDocs}.`,
    });
  }
  return findings;
}
