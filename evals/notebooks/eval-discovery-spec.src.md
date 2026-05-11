<!-- srcbook:{"language":"typescript"} -->

# Eval: Discovery + Spec docs (D1–D6, F7)

Runs checks D1 through D6 and F7 against the real `docs/discovery/*` and `docs/spec/*` files
declared in `evals/config.yaml`. Aggregates findings, applies the allowlist, and emits a
Scorecard JSON on stdout (cell `90-scorecard.ts`), which the runner picks up.

Pass `SEMANTIC_ENABLED=0` (or `--no-semantic` via the CLI) to skip cell `80-semantic.ts`.

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "js-yaml": "^4.1.0"
  }
}
```

## Configuration and shared helpers

###### 00-config.ts

```typescript
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const exec = promisify(execFile);

export const REPO_PATH = process.env.REPO_PATH ?? process.cwd();
export const ANALYSIS_REF = process.env.ANALYSIS_REF ?? 'HEAD';
export const SEMANTIC_ENABLED = process.env.SEMANTIC_ENABLED !== '0';
export const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-');

export type Finding = {
  id: string;
  check: string;
  doc: string;
  status: 'pass' | 'blocker';
  detail: string;
  [k: string]: unknown;
};

export async function loadConfig(): Promise<Record<string, unknown>> {
  const raw = await readFile(`${REPO_PATH}/evals/config.yaml`, 'utf8');
  return yaml.load(raw) as Record<string, unknown>;
}

export async function loadAllowlist(): Promise<{ entries: unknown[] }> {
  const raw = await readFile(`${REPO_PATH}/evals/allowlist.yaml`, 'utf8');
  return yaml.load(raw) as { entries: unknown[] };
}

export async function readDoc(docPath: string): Promise<string> {
  return readFile(`${REPO_PATH}/${docPath}`, 'utf8');
}

/**
 * Invoke a module from evals/src/ via a child node process.
 * modulePath is relative to evals/src/ without extension,
 * e.g. 'checks/d1-required-files' or 'scorecard'.
 * args is spread if it is an array, otherwise passed as a single argument.
 */
export async function invokeCheck(
  modulePath: string,
  exportName: string,
  args: unknown,
): Promise<unknown> {
  const argsJson = JSON.stringify(args);
  const driver = `
import { ${exportName} } from '${REPO_PATH}/evals/src/${modulePath}.mts';
const args = JSON.parse(process.argv[1]);
const out = Array.isArray(args) ? await ${exportName}(...args) : await ${exportName}(args);
console.log(JSON.stringify(out));
`;
  const { stdout } = await exec(
    'node',
    [
      '--experimental-strip-types',
      '--no-warnings',
      '--input-type=module',
      '-e',
      driver,
      '--',
      argsJson,
    ],
    { env: { ...process.env }, maxBuffer: 50 * 1024 * 1024 },
  );
  return JSON.parse(stdout);
}

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function writeFindings(id: string, findings: Finding[]): Promise<void> {
  await writeFile(`${__dirname}/findings-${id}.json`, JSON.stringify(findings, null, 2), 'utf8');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify({ REPO_PATH, ANALYSIS_REF, SEMANTIC_ENABLED, RUN_ID }));
}
```

## D1 — Required files exist

###### 10-d1.ts

```typescript
import { REPO_PATH, loadConfig, invokeCheck, writeFindings, type Finding } from './00-config.ts';

const cfg = await loadConfig();
const discovery = cfg['required_files'] as Record<string, string[]>;
const required = [...discovery['discovery']!, ...discovery['spec']!];

const findings = (await invokeCheck('checks/d1-required-files', 'runD1', {
  repoPath: REPO_PATH,
  required,
})) as Finding[];

await writeFindings('d1', findings);

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify({ d1Findings: findings.length }));
}
```

## D2 — Git commit claims

###### 20-d2.ts

```typescript
import {
  REPO_PATH,
  loadConfig,
  readDoc,
  invokeCheck,
  writeFindings,
  type Finding,
} from './00-config.ts';

const cfg = await loadConfig();
const required = cfg['required_files'] as Record<string, string[]>;
const docs = [...required['discovery']!, ...required['spec']!];

const all: Finding[] = [];
for (const doc of docs) {
  const source = await readDoc(doc);
  const findings = (await invokeCheck('checks/d2-git-claims', 'runD2', {
    repoPath: REPO_PATH,
    doc,
    source,
  })) as Finding[];
  all.push(...findings);
}

await writeFindings('d2', all);

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify({ d2Findings: all.length }));
}
```

## D3 — Boundary anchoring

###### 30-d3.ts

```typescript
import {
  REPO_PATH,
  loadConfig,
  readDoc,
  invokeCheck,
  writeFindings,
  type Finding,
} from './00-config.ts';

const cfg = await loadConfig();
const required = cfg['required_files'] as Record<string, string[]>;
const docs = [...required['discovery']!, ...required['spec']!];
const boundaries = cfg['boundaries'] as Array<Record<string, unknown>>;
const boundary = boundaries[0]!;

const all: Finding[] = [];
for (const doc of docs) {
  const source = await readDoc(doc);
  const findings = (await invokeCheck('checks/d3-boundary', 'runD3', {
    doc,
    source,
    boundary,
  })) as Finding[];
  all.push(...findings);
}

await writeFindings('d3', all);

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify({ d3Findings: all.length }));
}
```

## D4 — Cited path validity

###### 40-d4.ts

```typescript
import {
  REPO_PATH,
  loadConfig,
  readDoc,
  invokeCheck,
  writeFindings,
  type Finding,
} from './00-config.ts';

const cfg = await loadConfig();
const required = cfg['required_files'] as Record<string, string[]>;
const docs = [...required['discovery']!, ...required['spec']!];
const analysisRefs = cfg['analysis_refs'] as { default?: string; per_doc?: Record<string, string> };
const defaultRef = analysisRefs['default'] ?? 'HEAD';

const all: Finding[] = [];
for (const doc of docs) {
  const source = await readDoc(doc);
  const ref = analysisRefs['per_doc']?.[doc] ?? defaultRef;
  const findings = (await invokeCheck('checks/d4-cited-paths', 'runD4', {
    repoPath: REPO_PATH,
    ref,
    doc,
    source,
  })) as Finding[];
  all.push(...findings);
}

await writeFindings('d4', all);

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify({ d4Findings: all.length }));
}
```

## D5 — Citation density (spec docs only)

###### 50-d5.ts

```typescript
import { loadConfig, readDoc, invokeCheck, writeFindings, type Finding } from './00-config.ts';

const cfg = await loadConfig();
const required = cfg['required_files'] as Record<string, string[]>;
const specDocs = required['spec']!;

const all: Finding[] = [];
for (const doc of specDocs) {
  const source = await readDoc(doc);
  const findings = (await invokeCheck('checks/d5-citation-density', 'runD5', {
    doc,
    source,
  })) as Finding[];
  all.push(...findings);
}

await writeFindings('d5', all);

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify({ d5Findings: all.length }));
}
```

## D6 — Cross-doc reference anchors

###### 60-d6.ts

```typescript
import {
  REPO_PATH,
  loadConfig,
  readDoc,
  invokeCheck,
  writeFindings,
  type Finding,
} from './00-config.ts';

const cfg = await loadConfig();
const required = cfg['required_files'] as Record<string, string[]>;
const docs = [...required['discovery']!, ...required['spec']!];

const all: Finding[] = [];
for (const doc of docs) {
  const source = await readDoc(doc);
  const findings = (await invokeCheck('checks/d6-doc-references', 'runD6', {
    repoPath: REPO_PATH,
    doc,
    source,
  })) as Finding[];
  all.push(...findings);
}

await writeFindings('d6', all);

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify({ d6Findings: all.length }));
}
```

## F7 — Imprecise citations

###### 70-f7.ts

```typescript
import {
  REPO_PATH,
  loadConfig,
  readDoc,
  invokeCheck,
  writeFindings,
  type Finding,
} from './00-config.ts';

const cfg = await loadConfig();
const required = cfg['required_files'] as Record<string, string[]>;
const docs = [...required['discovery']!, ...required['spec']!];

const all: Finding[] = [];
for (const doc of docs) {
  const source = await readDoc(doc);
  const findings = (await invokeCheck('checks/f7-imprecise-citations', 'runF7', {
    repoPath: REPO_PATH,
    doc,
    source,
  })) as Finding[];
  all.push(...findings);
}

await writeFindings('f7', all);

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify({ f7Findings: all.length }));
}
```

## Semantic checks (skipped when SEMANTIC_ENABLED=0)

###### 80-semantic.ts

```typescript
import {
  SEMANTIC_ENABLED,
  REPO_PATH,
  loadConfig,
  readDoc,
  invokeCheck,
  writeFindings,
  type Finding,
} from './00-config.ts';

const all: Finding[] = [];

if (SEMANTIC_ENABLED) {
  const cfg = await loadConfig();
  const required = cfg['required_files'] as Record<string, string[]>;
  const specDocs = required['spec']!;
  for (const doc of specDocs) {
    const source = await readDoc(doc);
    const claims = await invokeCheck('semantic/extractor', 'extractClaims', source);
    const findings = (await invokeCheck('semantic/router', 'routeClaims', {
      repoPath: REPO_PATH,
      doc,
      claims,
    })) as Finding[];
    all.push(...findings);
  }
}

await writeFindings('semantic', all);

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify({ semanticEnabled: SEMANTIC_ENABLED, semanticFindings: all.length }));
}
```

## Scorecard

###### 90-scorecard.ts

```typescript
import { readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REPO_PATH,
  RUN_ID,
  ANALYSIS_REF,
  loadConfig,
  loadAllowlist,
  invokeCheck,
  type Finding,
} from './00-config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Aggregate findings from all check cells.
const cellIds = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'f7', 'semantic'];
const allFindings: Finding[] = [];
for (const id of cellIds) {
  try {
    const raw = await readFile(`${__dirname}/findings-${id}.json`, 'utf8');
    allFindings.push(...(JSON.parse(raw) as Finding[]));
  } catch {
    // Skip missing files (e.g., semantic when disabled writes empty array).
  }
}

// Apply allowlist.
const allowlist = await loadAllowlist();
const annotated = (await invokeCheck('allowlist-apply', 'applyAllowlist', [
  allFindings,
  allowlist,
])) as Finding[];

// Build scorecard.
const cfg = await loadConfig();
const required = cfg['required_files'] as Record<string, string[]>;
const docsEvaluated = [...required['discovery']!, ...required['spec']!];
const boundaries = cfg['boundaries'] as Array<Record<string, unknown>>;

const scorecard = await invokeCheck('scorecard', 'buildScorecard', {
  runId: RUN_ID,
  configPath: 'evals/config.yaml',
  allowlistPath: 'evals/allowlist.yaml',
  repoRef: ANALYSIS_REF,
  headSha: 'HEAD',
  boundaryCommit: (boundaries[0]?.['commit'] as string | undefined) ?? '',
  promptPath: cfg['prompt_path'] as string,
  docsEvaluated,
  findings: annotated,
});

// Write scorecard to evals/runs/<RUN_ID>.json for archival.
const runsDir = `${REPO_PATH}/evals/runs`;
await writeFile(`${runsDir}/${RUN_ID}.json`, JSON.stringify(scorecard, null, 2), 'utf8');

// Emit to stdout for the runner's 90-* detection.
console.log(JSON.stringify(scorecard, null, 2));
```
