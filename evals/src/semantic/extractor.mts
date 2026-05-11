// evals/src/semantic/extractor.mts
import { Agent, run } from '@openai/agents';
import { z } from 'zod';

export const ClaimSchema = z
  .discriminatedUnion('kind', [
    z.object({
      kind: z.literal('commit-exists'),
      sha: z.string(),
      assertion: z.enum(['present', 'absent']),
    }),
    z.object({
      kind: z.literal('commit-by-message'),
      messageFragment: z.string(),
      assertion: z.enum(['present', 'absent']),
    }),
    z.object({
      kind: z.literal('path-exists'),
      path: z.string(),
      assertion: z.enum(['present', 'absent']),
    }),
    z.object({ kind: z.literal('pr-exists'), number: z.number() }),
    z.object({
      kind: z.literal('boundary-anchor'),
      commit: z.string(),
      topic: z.string(),
    }),
  ])
  .and(z.object({ sourceLine: z.number(), sourceText: z.string() }));

export type Claim = z.infer<typeof ClaimSchema>;

const ExtractionOutput = z.object({ claims: z.array(ClaimSchema) });

const extractor = new Agent({
  name: 'claim-extractor',
  model: 'gpt-5.4-mini-2026-03-17',
  instructions:
    'Extract structured claim records from prose. Do not verify any claim. ' +
    'Do not infer beyond text. If a sentence does not contain a checkable claim, omit it. ' +
    'For commit/PR/path mentions, capture them verbatim with their assertion polarity.',
  outputType: ExtractionOutput,
});

export async function extractClaims(sectionText: string): Promise<Claim[]> {
  const result = await run(extractor, sectionText);
  if (result.finalOutput == null) {
    throw new Error('claim-extractor returned no output');
  }
  return result.finalOutput.claims;
}
