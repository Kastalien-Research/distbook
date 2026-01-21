# Cell Execution System - Implementation Specification

**Version:** 1.0
**Date:** 2026-01-14
**Status:** Implementation-Ready
**Output:** `packages/api/srcbook/examples/internals/cell-execution.src.md`
**Dependencies:** Session Management Srcbook (complete)

---

## 1. Overview

This specification defines the implementation of an educational Srcbook that explains how Srcbook executes code cells, including Node.js execution for JavaScript and TSX for TypeScript.

### Learning Objectives

By completing this Srcbook, users will:
1. Understand how code cells are transformed into executable files
2. Learn the difference between JavaScript and TypeScript execution paths
3. Comprehend process spawning and output capture
4. Know how to handle execution errors and timeouts

---

## 2. File Structure

### 2.1 Srcbook Metadata

```markdown
<!-- srcbook:{"language":"typescript"} -->
```

### 2.2 Required Sections (in order)

| Section | Type | Purpose |
|---------|------|---------|
| Title | Title Cell | "Cell Execution System - How Srcbook Runs Your Code" |
| package.json | Package Cell | Dependencies for demos |
| Introduction | Markdown | What, why, prerequisites, objectives |
| Key Concepts | Markdown | Architecture, execution flow diagram |
| Simple Demo | Code | Basic execution example |
| Explanation | Markdown | Step-by-step breakdown |
| Advanced Demo | Code | Real execution with output capture |
| Deep Dive | Markdown | Implementation details, edge cases |
| Interactive Exercise | Code | Challenge to implement execution monitor |
| Source References | Markdown | Links to actual source files |
| Next Steps | Markdown | Related topics |
| Summary | Markdown | Key takeaways |

---

## 3. Content Specification

### 3.1 package.json Cell

```json
{
  "type": "module",
  "dependencies": {
    "@types/node": "latest",
    "tsx": "latest",
    "typescript": "latest",
    "child_process": "npm:@types/node"
  }
}
```

### 3.2 Introduction Content

**What is Cell Execution?**
- Explain that code cells contain TypeScript/JavaScript code
- Code is written to a temporary file and executed via child process
- Output (stdout/stderr) is captured and displayed

**Why does it matter?**
- Understanding execution enables debugging
- Necessary for contributing to execution features
- Helps understand process lifecycle

**Prerequisites:**
- Session Management Srcbook
- Basic child_process knowledge
- Understanding of TypeScript compilation

**Learning Objectives:**
1. Understand file generation from cell content
2. Learn the execution command construction
3. Comprehend stdout/stderr capture
4. Know exit code handling

### 3.3 Key Concepts - Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Code Cell Execution                       │
│                                                              │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Cell    │───▶│ Write to     │───▶│  Spawn Process   │  │
│  │  Content │    │ src/cell.ts  │    │  (node/tsx)      │  │
│  └──────────┘    └──────────────┘    └────────┬─────────┘  │
│                                               │             │
│                                               ▼             │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  UI      │◀───│ WebSocket    │◀───│  stdout/stderr   │  │
│  │  Output  │    │ Broadcast    │    │  capture         │  │
│  └──────────┘    └──────────────┘    └──────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Core Concepts to Explain:**

1. **File Generation**: Code cells are written to `src/<cellFilename>` files
2. **Execution Commands**:
   - JavaScript: `node src/cell.js`
   - TypeScript: `npx tsx src/cell.ts`
3. **Output Capture**: stdout/stderr piped to parent process
4. **Process Registry**: Track running processes by session/cell ID

### 3.4 Simple Demo Code Cell

**Filename:** `simple-execution.ts`

```typescript
// Demonstrate basic cell execution concept
// This simulates how Srcbook executes a code cell

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Step 1: Create a temporary directory (like Srcbook's session directory)
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'srcbook-demo-'));
const srcDir = path.join(tempDir, 'src');
fs.mkdirSync(srcDir);

console.log('📁 Session directory:', tempDir);

// Step 2: Write code to a file (simulating a code cell)
const cellCode = `
// This is the code from our "cell"
console.log('Hello from the cell!');
console.log('Current time:', new Date().toISOString());
const result = 2 + 2;
console.log('2 + 2 =', result);
`;

const cellFilePath = path.join(srcDir, 'cell-abc123.js');
fs.writeFileSync(cellFilePath, cellCode);
console.log('📝 Wrote cell to:', cellFilePath);

// Step 3: Execute the file using Node.js
console.log('\n🚀 Executing cell...\n');

const proc = spawn('node', [cellFilePath], {
  cwd: tempDir,
  env: { ...process.env },
});

// Step 4: Capture output
proc.stdout.on('data', (data) => {
  console.log('[stdout]', data.toString().trim());
});

proc.stderr.on('data', (data) => {
  console.error('[stderr]', data.toString().trim());
});

proc.on('close', (exitCode) => {
  console.log('\n✅ Execution complete. Exit code:', exitCode);

  // Cleanup
  fs.rmSync(tempDir, { recursive: true });
  console.log('🧹 Cleaned up temp directory');
});
```

### 3.5 Advanced Demo Code Cell

**Filename:** `advanced-execution.ts`

```typescript
// Advanced demo: TypeScript execution with tsx
// This mirrors how Srcbook actually executes TypeScript cells

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Execution context (mirrors Srcbook's session context)
interface ExecutionContext {
  sessionDir: string;
  language: 'javascript' | 'typescript';
}

// Output event (mirrors WebSocket events)
interface OutputEvent {
  type: 'stdout' | 'stderr';
  data: string;
}

// Result of execution
interface ExecutionResult {
  exitCode: number;
  outputs: OutputEvent[];
  durationMs: number;
}

// Create a cell executor class (simplified from exec.mts)
class CellExecutor {
  private ctx: ExecutionContext;
  private processes: Map<string, ChildProcess> = new Map();

  constructor(ctx: ExecutionContext) {
    this.ctx = ctx;
  }

  async execute(cellId: string, code: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    const outputs: OutputEvent[] = [];

    // Determine file extension and command
    const ext = this.ctx.language === 'typescript' ? '.ts' : '.js';
    const filename = `${cellId}${ext}`;
    const filePath = path.join(this.ctx.sessionDir, 'src', filename);

    // Write the code to file
    fs.writeFileSync(filePath, code);

    // Build execution command
    const cmd = this.ctx.language === 'typescript'
      ? 'npx'
      : 'node';
    const args = this.ctx.language === 'typescript'
      ? ['tsx', filePath]
      : [filePath];

    console.log(`🔧 Command: ${cmd} ${args.join(' ')}`);

    return new Promise((resolve) => {
      const proc = spawn(cmd, args, {
        cwd: this.ctx.sessionDir,
        env: { ...process.env },
      });

      this.processes.set(cellId, proc);

      proc.stdout.on('data', (data) => {
        const output: OutputEvent = { type: 'stdout', data: data.toString() };
        outputs.push(output);
        console.log('[stdout]', data.toString().trim());
      });

      proc.stderr.on('data', (data) => {
        const output: OutputEvent = { type: 'stderr', data: data.toString() };
        outputs.push(output);
        console.error('[stderr]', data.toString().trim());
      });

      proc.on('close', (exitCode) => {
        this.processes.delete(cellId);
        resolve({
          exitCode: exitCode ?? 1,
          outputs,
          durationMs: Date.now() - startTime,
        });
      });
    });
  }

  stop(cellId: string): boolean {
    const proc = this.processes.get(cellId);
    if (proc) {
      proc.kill('SIGTERM');
      this.processes.delete(cellId);
      return true;
    }
    return false;
  }
}

// Demo execution
async function runDemo() {
  // Setup
  const sessionDir = fs.mkdtempSync(path.join(os.tmpdir(), 'srcbook-ts-'));
  fs.mkdirSync(path.join(sessionDir, 'src'));

  // Initialize package.json for tsx
  fs.writeFileSync(
    path.join(sessionDir, 'package.json'),
    JSON.stringify({ type: 'module' }, null, 2)
  );

  console.log('📁 Session:', sessionDir);

  const executor = new CellExecutor({
    sessionDir,
    language: 'typescript', // Using TypeScript!
  });

  // TypeScript code to execute
  const tsCode = `
// TypeScript cell with type annotations
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: 'Alice',
  age: 30,
};

console.log('User:', JSON.stringify(user, null, 2));

// Type checking works!
const doubled: number = user.age * 2;
console.log('Age doubled:', doubled);
`;

  console.log('\n🚀 Executing TypeScript cell...\n');

  const result = await executor.execute('cell-001', tsCode);

  console.log('\n📊 Execution Result:');
  console.log('  Exit code:', result.exitCode);
  console.log('  Duration:', result.durationMs, 'ms');
  console.log('  Output events:', result.outputs.length);

  // Cleanup
  fs.rmSync(sessionDir, { recursive: true });
}

runDemo().catch(console.error);
```

### 3.6 Deep Dive Content

**Implementation Details:**

Reference actual source files:
- `packages/api/exec.mts` - Main execution logic
- `packages/api/processes.mts` - Process registry
- `packages/api/server/ws.mts` - WebSocket handler for `cellExec`

**Key Implementation Points:**

1. **File Preparation:**
   - Code cells have their source written to `src/<cellFilename>`
   - Import statements are resolved relative to session directory
   - Package.json cell defines npm dependencies

2. **Execution Command Construction:**
   ```typescript
   // From exec.mts (simplified)
   function buildExecCommand(language: string, filepath: string) {
     if (language === 'typescript') {
       return { cmd: 'npx', args: ['tsx', filepath] };
     }
     return { cmd: 'node', args: [filepath] };
   }
   ```

3. **Process Tracking:**
   - Processes registered by `${sessionId}:${cellId}`
   - Enables stopping running cells
   - Cleanup on session close

4. **Output Streaming:**
   - stdout/stderr piped in real-time
   - Broadcast via WebSocket to all subscribers
   - Buffered for late subscribers

**Edge Cases:**

1. **Infinite Loops:** Cells can run indefinitely; users must manually stop
2. **Memory Exhaustion:** Node.js process limits apply
3. **Import Errors:** Missing dependencies cause execution failure
4. **Syntax Errors:** TSX catches these at compile time

**Performance Considerations:**

- TSX adds compilation overhead (~100-300ms)
- Large outputs buffered in memory
- Process spawn has ~50ms overhead

### 3.7 Interactive Exercise

**Challenge:** Build an Execution Timer

```typescript
// Exercise: Build a cell execution timer that:
// 1. Executes code and measures duration
// 2. Handles timeouts (cancel after 5 seconds)
// 3. Reports execution statistics

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// TODO: Implement TimedExecutor class
class TimedExecutor {
  private timeout: number;

  constructor(timeoutMs: number = 5000) {
    this.timeout = timeoutMs;
  }

  async execute(code: string): Promise<{
    success: boolean;
    output: string;
    durationMs: number;
    timedOut: boolean;
  }> {
    // TODO: Implement execution with timeout
    // Hints:
    // 1. Create temp directory and write code
    // 2. Use setTimeout to enforce timeout
    // 3. Kill process if timeout exceeded
    // 4. Track duration using Date.now()

    throw new Error('Not implemented - your turn!');
  }
}

// Test your implementation:
// const executor = new TimedExecutor(5000);
// const result = await executor.execute('console.log("Hello")');
// console.log(result);
```

### 3.8 Source References

| File | Purpose |
|------|---------|
| `packages/api/exec.mts` | Main execution functions: `node()`, `tsx()`, `vite()` |
| `packages/api/processes.mts` | Process registry and lifecycle management |
| `packages/api/server/ws.mts` | WebSocket handler: `cellExec()` function |
| `packages/api/tsserver/tsserver.mts` | TypeScript server for diagnostics (pre-execution) |

### 3.9 Next Steps Links

- **Process Management**: Deep dive into process lifecycle
- **WebSocket Protocol**: How execution events are broadcast
- **TypeScript Diagnostics**: Pre-execution type checking

---

## 4. Acceptance Criteria

- [ ] All code cells execute without errors
- [ ] Simple demo works without external dependencies beyond Node.js
- [ ] Advanced demo demonstrates actual tsx execution
- [ ] Source file references are accurate
- [ ] Exercise is achievable without hints
- [ ] Cross-references to existing Srcbooks work

---

## 5. Implementation Notes

### File Location
```
packages/api/srcbook/examples/internals/cell-execution.src.md
```

### Testing
Run the created Srcbook in Srcbook itself to verify all cells execute.

### Maintenance
- Update if `exec.mts` API changes
- Keep tsx version current in package.json

### Security Considerations

**IMPORTANT:** Include in the srcbook's Deep Dive section:

1. **Process Isolation**: Code cells execute as child processes with the same permissions as the Srcbook server. There is no sandboxing - user code has full access to:
   - File system (read/write)
   - Network
   - Environment variables
   - System resources

2. **Trust Model**: Srcbook assumes trusted users. The code execution model is designed for local development, not multi-tenant environments.

3. **Environment Variable Exposure**: Secrets injected via the secrets system are passed as environment variables to child processes. Users should understand that any executed code can access these.

4. **No Resource Limits**: By default, there are no CPU/memory limits on spawned processes. Long-running or resource-intensive code can affect the host system.

This is intentional - Srcbook is a development tool, not a production code execution sandbox.
