<!-- srcbook:{"language":"typescript"} -->

# Eval prototype

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "tsx": "latest",
    "typescript": "latest"
  }
}
```

## Configuration

###### 00-config.ts

```typescript
export const REPO_PATH = process.env.REPO_PATH ?? process.cwd();
export const ANALYSIS_REF = process.env.ANALYSIS_REF ?? 'HEAD';

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify({ REPO_PATH, ANALYSIS_REF }));
}
```

## D2 prototype check

###### 10-d2-git-claims.ts

```typescript
import { execFileSync } from 'node:child_process';
import { REPO_PATH } from './00-config.ts';

export type Finding = {
  id: string;
  check: string;
  doc: string;
  status: 'pass' | 'blocker';
  detail: string;
};

const claimedAbsent = 'Remove all app-builder stuff';
let actuallyPresent = '';
try {
  actuallyPresent = execFileSync(
    'git',
    ['log', '--all', '--oneline', '--grep', claimedAbsent],
    { cwd: REPO_PATH, encoding: 'utf8' }
  ).trim();
} catch {}

export const findings: Finding[] = [{
  id: 'D2-app-builder-removal-claim',
  check: 'D2',
  doc: 'prototype',
  status: actuallyPresent ? 'blocker' : 'pass',
  detail: actuallyPresent
    ? `Doc claimed absence; git found: ${actuallyPresent}`
    : 'Doc claim of absence verified.',
}];

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify(findings, null, 2));
}
```

## Scorecard

###### 90-scorecard.ts

```typescript
import { findings as d2 } from './10-d2-git-claims.ts';

const all = [...d2];
const blockers = all.filter(f => f.status === 'blocker');
const passes = all.filter(f => f.status === 'pass');

console.log(JSON.stringify({
  schema_version: '0',
  run_id: 'prototype',
  config_path: 'prototype',
  allowlist_path: 'prototype',
  repo_ref: process.env.ANALYSIS_REF ?? 'HEAD',
  head_sha: 'prototype',
  boundary_commit: 'c7a52cc',
  prompt_path: 'prototype',
  docs_evaluated: ['prototype'],
  summary: {
    pass: passes.length,
    blocker: blockers.length,
    allowlisted: 0,
    verdict: blockers.length > 0 ? 'blocker' : 'pass',
  },
  blockers,
  allowlisted: [],
  passes_count_only: passes.length,
}, null, 2));
```
