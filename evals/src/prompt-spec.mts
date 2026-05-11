import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';
import { z } from 'zod';

const FRONT_MATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n/;

export const RequiredTopicSchema = z.object({
  id: z.string(),
  heading_slugs: z.array(z.string()).min(1),
  description: z.string().optional(),
});

export const PromptSpecSchema = z.object({
  version: z.literal('0'),
  required_topics: z.array(RequiredTopicSchema).default([]),
  required_artifacts: z.array(z.string()).default([]),
});

export type RequiredTopic = z.infer<typeof RequiredTopicSchema>;
export type PromptSpec = z.infer<typeof PromptSpecSchema>;

export async function loadPromptSpec(path: string): Promise<PromptSpec | null> {
  const raw = await readFile(path, 'utf8');
  const m = raw.match(FRONT_MATTER_RE);
  if (!m) return null;
  const fm = yaml.load(m[1]!) as { prompt_spec?: unknown } | null;
  if (!fm || typeof fm !== 'object' || !('prompt_spec' in fm)) return null;
  return PromptSpecSchema.parse(fm.prompt_spec);
}
