// evals/src/cli.mts
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runNotebook } from './runner.mts';
import { writeScorecard, ScorecardSchema } from './scorecard.mts';
import { loadConfig, loadAllowlist } from './config.mts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(PKG_ROOT, '..');

function parseArgs(argv: string[]): {
  command: string;
  flags: Record<string, string | true>;
  positional: string[];
} {
  const [command, ...rest] = argv;
  const flags: Record<string, string | true> = {};
  const positional: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else if (rest[i + 1] && !rest[i + 1]!.startsWith('--')) flags[a.slice(2)] = rest[++i]!;
      else flags[a.slice(2)] = true;
    } else {
      positional.push(a);
    }
  }
  return { command: command ?? '', flags, positional };
}

async function cmdRunNotebook(notebookRel: string, flags: Record<string, string | true>) {
  const notebookPath = resolve(PKG_ROOT, notebookRel);
  const env: Record<string, string> = { REPO_PATH: REPO_ROOT };
  if (typeof flags.ref === 'string') env.ANALYSIS_REF = flags.ref;
  if (flags['no-semantic']) env.SEMANTIC_ENABLED = '0';
  const result = await runNotebook({ notebookPath, env });
  const card = ScorecardSchema.parse(result.scorecardJson);
  const out = join(PKG_ROOT, 'runs', `${card.run_id}.json`);
  await writeScorecard(card, out);
  console.log(`scorecard written to ${out}`);
  console.log(
    `verdict: ${card.summary.verdict} (pass=${card.summary.pass} blocker=${card.summary.blocker} allowlisted=${card.summary.allowlisted})`,
  );
  process.exit(card.summary.verdict === 'blocker' ? 1 : 0);
}

async function cmdValidateConfig() {
  await loadConfig(join(PKG_ROOT, 'config.yaml'));
  await loadAllowlist(join(PKG_ROOT, 'allowlist.yaml'));
  console.log('config + allowlist: OK');
}

async function main() {
  const { command, flags, positional } = parseArgs(process.argv.slice(2));
  switch (command) {
    case 'run-notebook':
      if (!positional[0]) throw new Error('usage: run-notebook <path>');
      await cmdRunNotebook(positional[0], flags);
      break;
    case 'validate-config':
      await cmdValidateConfig();
      break;
    default:
      console.error('usage: tsx src/cli.mts <run-notebook|validate-config>');
      process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
