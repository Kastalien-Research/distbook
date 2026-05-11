// evals/src/config.mts
import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';
import { z } from 'zod';

const ConfigSchema = z.object({
  prompt_path: z.string(),
  required_files: z.object({
    discovery: z.array(z.string()),
    spec: z.array(z.string()),
  }),
  boundaries: z.array(
    z.object({
      topic: z.string(),
      commit: z.string(),
      keywords: z.array(z.string()),
    }),
  ),
  analysis_refs: z.object({
    default: z.string(),
    per_doc: z.record(z.string(), z.string()).default({}),
  }),
});

const AllowlistEntrySchema = z.object({
  check: z.string(),
  in_doc: z.string().optional(),
  scope: z.enum(['section', 'doc', 'global']),
  section_heading: z.string().optional(),
  pattern: z.string().optional(),
  reason: z.string(),
  approved_by: z.string(),
  approved_at: z.string(),
});

const AllowlistSchema = z.object({
  entries: z.array(AllowlistEntrySchema),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Allowlist = z.infer<typeof AllowlistSchema>;
export type AllowlistEntry = z.infer<typeof AllowlistEntrySchema>;

export async function loadConfig(path: string): Promise<Config> {
  const raw = await readFile(path, 'utf8');
  return ConfigSchema.parse(yaml.load(raw));
}

export async function loadAllowlist(path: string): Promise<Allowlist> {
  const raw = await readFile(path, 'utf8');
  return AllowlistSchema.parse(yaml.load(raw));
}
