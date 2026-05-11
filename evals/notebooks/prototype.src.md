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

export type Finding = { id: string; status: 'pass' | 'blocker'; detail: string };

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
const summary = { pass: 0, blocker: 0 };
for (const f of all) summary[f.status]++;

console.log(JSON.stringify({ summary, findings: all }, null, 2));
```
