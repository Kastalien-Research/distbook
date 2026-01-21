<!-- srcbook:{"language":"typescript"} -->

# Cell Execution System - How Srcbook Runs Your Code

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "@types/node": "latest",
    "tsx": "latest",
    "typescript": "latest"
  }
}
```

## Introduction

**What is Cell Execution?**

When you click "Run" on a code cell in Srcbook, a fascinating process begins. The code you wrote doesn't execute directly in the browser - instead, it's sent to the server, written to a file, and executed as a child process. This architecture enables:

- Full Node.js runtime access (file system, networking, etc.)
- Real TypeScript execution via `tsx` (not transpilation hacks)
- Process isolation between cells
- Proper stdout/stderr capture and streaming

**Why does it matter?**

Understanding the execution system helps you:
- Debug when cells don't run as expected
- Know why certain operations (like file I/O) work in Srcbook but not in a browser
- Contribute to execution features or build extensions
- Understand the security implications of code execution

**Prerequisites**

Before diving in, you should be familiar with:
- Session Management (how Srcbook organizes files)
- Node.js child processes (`spawn`, `exec`)
- Basic TypeScript compilation concepts

**Learning Objectives**

By the end of this Srcbook, you will:
1. Understand how code cells are transformed into executable files
2. Know the difference between JavaScript and TypeScript execution paths
3. Comprehend process spawning and output capture
4. Handle execution errors, timeouts, and process lifecycle

## Key Concepts

### Architecture Overview

Here's how code flows from a cell to execution results:

```
                    Code Cell Execution Flow

  +-------------+     +----------------+     +------------------+
  |   Code      |---->|  Write to      |---->|  Spawn Process   |
  |   Cell      |     |  src/cell.ts   |     |  (node or tsx)   |
  +-------------+     +----------------+     +--------+---------+
                                                      |
                                                      v
  +-------------+     +----------------+     +------------------+
  |   UI        |<----|  WebSocket     |<----|  stdout/stderr   |
  |   Output    |     |  Broadcast     |     |  capture         |
  +-------------+     +----------------+     +------------------+
```

### Core Concepts

**Concept 1: File-Based Execution**

Code cells aren't evaluated in memory. Instead:
1. The cell's source is written to `src/<cellFilename>` in the session directory
2. A child process is spawned to execute the file
3. This is why you have full Node.js capabilities - it's a real Node process!

**Concept 2: Language-Specific Executors**

Srcbook supports two execution paths:
- **JavaScript**: Executed directly with `node src/cell.js`
- **TypeScript**: Executed with `tsx` which handles compilation on-the-fly

**Concept 3: Process Registry**

Running processes are tracked by a combination of `sessionId:cellId`. This enables:
- Stopping a running cell
- Preventing multiple executions of the same cell
- Cleanup when sessions close

**Concept 4: Output Streaming**

stdout and stderr are captured in real-time and broadcast via WebSocket, allowing you to see output as it's produced (not just when execution completes).

## Simple Demo: Understanding Execution Basics

Let's simulate how Srcbook executes a code cell. This example uses mock data to demonstrate the concepts without actually spawning processes.

###### simple-execution.ts

```typescript
// Simulating the cell execution flow
// This demonstrates the concepts without actually spawning processes

// ============================================
// Part 1: The Session Directory Structure
// ============================================

// When a Srcbook session is created, it has this structure:
const mockSessionDir = '/home/user/.srcbook/abc123xyz';
const mockStructure = `
${mockSessionDir}/
  ├── package.json     <- Dependencies from the package.json cell
  ├── node_modules/    <- Installed packages
  ├── src/
  │   ├── index.ts     <- First code cell
  │   ├── helper.ts    <- Another code cell
  │   └── demo.ts      <- Yet another code cell
  └── tsconfig.json    <- TypeScript config (for TS srcbooks)
`;

console.log('Session directory structure:');
console.log(mockStructure);

// ============================================
// Part 2: Code Cell to File
// ============================================

// When you write code in a cell, it looks like this:
const cellSource = `
// Cell: demo.ts
const greeting = 'Hello from Srcbook!';
console.log(greeting);

const numbers = [1, 2, 3, 4, 5];
console.log('Sum:', numbers.reduce((a, b) => a + b, 0));
`;

console.log('Cell source code:');
console.log(cellSource);

// This source is written to: /home/user/.srcbook/abc123xyz/src/demo.ts
const filePath = `${mockSessionDir}/src/demo.ts`;
console.log(`\nWritten to file: ${filePath}`);

// ============================================
// Part 3: Execution Command
// ============================================

// For TypeScript, the execution command is:
const tsCommand = {
  executable: 'node_modules/.bin/tsx',
  args: [filePath],
  cwd: mockSessionDir,
};

console.log('\nExecution command (TypeScript):');
console.log(`  ${mockSessionDir}/${tsCommand.executable} ${tsCommand.args.join(' ')}`);

// For JavaScript, it would be:
const jsCommand = {
  executable: 'node',
  args: [filePath.replace('.ts', '.js')],
  cwd: mockSessionDir,
};

console.log('\nExecution command (JavaScript):');
console.log(`  ${jsCommand.executable} ${jsCommand.args.join(' ')}`);

// ============================================
// Part 4: Output Capture (Simulated)
// ============================================

// In reality, Srcbook captures stdout/stderr streams
// Here we simulate what the output events would look like:

interface OutputEvent {
  type: 'stdout' | 'stderr';
  data: string;
}

const simulatedOutput: OutputEvent[] = [
  { type: 'stdout', data: 'Hello from Srcbook!\n' },
  { type: 'stdout', data: 'Sum: 15\n' },
];

console.log('\nSimulated output events:');
simulatedOutput.forEach((event, i) => {
  console.log(`  Event ${i + 1}: [${event.type}] ${event.data.trim()}`);
});

// ============================================
// Part 5: Exit Code
// ============================================

// When the process exits, we get an exit code:
// - 0 = success
// - non-zero = error

const exitCode = 0;
console.log(`\nExit code: ${exitCode} (${exitCode === 0 ? 'success' : 'error'})`);
```

## Explanation: Step-by-Step Breakdown

Now let's break down what happens when you execute a cell:

### Step 1: Cell Status Update

When you click "Run", the cell's status changes:
```typescript
// Before execution
cell.status = 'idle';

// During execution
cell.status = 'running';

// After execution
cell.status = 'idle';
```

This status is broadcast via WebSocket so the UI shows a loading indicator.

### Step 2: File Writing

The cell's source code is already on disk (written when you edit the cell). The file lives at:
```
{sessionDir}/src/{cellFilename}
```

For example: `/home/user/.srcbook/abc123/src/demo.ts`

### Step 3: Process Spawning

Srcbook uses Node's `child_process.spawn()` to execute the file:

```typescript
// Simplified from packages/api/exec.mts
import { spawn } from 'node:child_process';

// For TypeScript
const child = spawn(
  'node_modules/.bin/tsx',  // Use tsx for TypeScript
  ['src/demo.ts'],           // The file to execute
  {
    cwd: sessionDir,         // Working directory
    env: { ...process.env, ...secrets }  // Environment variables
  }
);
```

### Step 4: Output Streaming

stdout and stderr are piped to callbacks that broadcast via WebSocket:

```typescript
child.stdout.on('data', (data) => {
  // Broadcast to all connected clients
  websocket.broadcast('cell:output', {
    cellId: cell.id,
    output: { type: 'stdout', data: data.toString('utf8') }
  });
});

child.stderr.on('data', (data) => {
  // Same for stderr
  websocket.broadcast('cell:output', {
    cellId: cell.id,
    output: { type: 'stderr', data: data.toString('utf8') }
  });
});
```

### Step 5: Exit Handling

When the process exits, we update the cell status:

```typescript
child.on('exit', (code, signal) => {
  cell.status = 'idle';
  websocket.broadcast('cell:updated', { cell });
});
```

## Advanced Demo: Simulating a Complete Executor

This demo creates a more realistic simulation of how Srcbook's execution system works.

###### advanced-execution.ts

```typescript
// Advanced simulation of Srcbook's cell execution
// Uses mock data and timers instead of actual process spawning

// ============================================
// Type Definitions (from Srcbook's actual types)
// ============================================

type CellStatus = 'idle' | 'running';
type OutputType = 'stdout' | 'stderr';
type Language = 'javascript' | 'typescript';

interface CodeCell {
  id: string;
  type: 'code';
  source: string;
  language: Language;
  filename: string;
  status: CellStatus;
}

interface OutputEvent {
  cellId: string;
  output: {
    type: OutputType;
    data: string;
  };
}

interface ExecutionResult {
  exitCode: number;
  signal: string | null;
  durationMs: number;
  outputs: OutputEvent[];
}

// ============================================
// Mock Session Context
// ============================================

interface SessionContext {
  id: string;
  dir: string;
  language: Language;
}

const mockSession: SessionContext = {
  id: 'session-abc123',
  dir: '/home/user/.srcbook/abc123',
  language: 'typescript',
};

// ============================================
// Process Registry (simplified from processes.mts)
// ============================================

class MockProcessRegistry {
  private processes: Map<string, { running: boolean; startTime: number }> = new Map();

  private toKey(sessionId: string, cellId: string): string {
    return `${sessionId}:${cellId}`;
  }

  add(sessionId: string, cellId: string): void {
    const key = this.toKey(sessionId, cellId);
    if (this.processes.has(key)) {
      throw new Error(`Process already running for ${key}`);
    }
    this.processes.set(key, { running: true, startTime: Date.now() });
    console.log(`[Registry] Added process: ${key}`);
  }

  kill(sessionId: string, cellId: string): boolean {
    const key = this.toKey(sessionId, cellId);
    const proc = this.processes.get(key);
    if (!proc) {
      throw new Error(`No process found for ${key}`);
    }
    proc.running = false;
    console.log(`[Registry] Killed process: ${key}`);
    return true;
  }

  remove(sessionId: string, cellId: string): void {
    const key = this.toKey(sessionId, cellId);
    this.processes.delete(key);
    console.log(`[Registry] Removed process: ${key}`);
  }

  isRunning(sessionId: string, cellId: string): boolean {
    const key = this.toKey(sessionId, cellId);
    return this.processes.get(key)?.running ?? false;
  }
}

// ============================================
// Cell Executor (simplified from exec.mts + ws.mts)
// ============================================

class MockCellExecutor {
  private registry = new MockProcessRegistry();
  private eventLog: string[] = [];

  private log(message: string): void {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logLine = `[${timestamp}] ${message}`;
    this.eventLog.push(logLine);
    console.log(logLine);
  }

  private broadcast(event: string, data: unknown): void {
    this.log(`Broadcast: ${event} -> ${JSON.stringify(data).slice(0, 60)}...`);
  }

  async execute(session: SessionContext, cell: CodeCell): Promise<ExecutionResult> {
    const startTime = Date.now();
    const outputs: OutputEvent[] = [];

    // Step 1: Update cell status to 'running'
    this.log(`Starting execution of cell: ${cell.filename}`);
    cell.status = 'running';
    this.broadcast('cell:updated', { cell });

    // Step 2: Register the process
    this.registry.add(session.id, cell.id);

    // Step 3: Determine execution command
    const command = session.language === 'typescript'
      ? `${session.dir}/node_modules/.bin/tsx ${session.dir}/src/${cell.filename}`
      : `node ${session.dir}/src/${cell.filename}`;
    this.log(`Execution command: ${command}`);

    // Step 4: Simulate execution with mock output
    // In reality, this would be actual process output
    const mockOutputs = this.generateMockOutput(cell.source);

    for (const output of mockOutputs) {
      // Simulate async output delivery
      await this.delay(50);

      const event: OutputEvent = {
        cellId: cell.id,
        output: { type: output.type, data: output.data },
      };
      outputs.push(event);
      this.broadcast('cell:output', event);
    }

    // Step 5: Process exits
    const exitCode = 0;
    const signal = null;

    // Step 6: Cleanup
    this.registry.remove(session.id, cell.id);
    cell.status = 'idle';
    this.broadcast('cell:updated', { cell });

    const result: ExecutionResult = {
      exitCode,
      signal,
      durationMs: Date.now() - startTime,
      outputs,
    };

    this.log(`Execution complete. Exit code: ${exitCode}, Duration: ${result.durationMs}ms`);
    return result;
  }

  async stop(session: SessionContext, cell: CodeCell): Promise<boolean> {
    if (!this.registry.isRunning(session.id, cell.id)) {
      this.log(`Cannot stop: cell ${cell.id} is not running`);
      return false;
    }

    this.log(`Stopping cell: ${cell.filename}`);
    this.registry.kill(session.id, cell.id);
    this.registry.remove(session.id, cell.id);
    cell.status = 'idle';
    this.broadcast('cell:updated', { cell });
    return true;
  }

  private generateMockOutput(source: string): Array<{ type: OutputType; data: string }> {
    // Parse console.log calls and generate mock output
    const outputs: Array<{ type: OutputType; data: string }> = [];

    // Simple regex to find console.log statements
    const logRegex = /console\.(log|error|warn)\(['"]([^'"]+)['"]/g;
    let match;

    while ((match = logRegex.exec(source)) !== null) {
      const method = match[1];
      const message = match[2];
      outputs.push({
        type: method === 'error' ? 'stderr' : 'stdout',
        data: message + '\n',
      });
    }

    // If no console statements found, add a default output
    if (outputs.length === 0) {
      outputs.push({ type: 'stdout', data: '(no output)\n' });
    }

    return outputs;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getEventLog(): string[] {
    return this.eventLog;
  }
}

// ============================================
// Demo: Execute a cell
// ============================================

async function runDemo() {
  console.log('='.repeat(60));
  console.log('Cell Execution Demo');
  console.log('='.repeat(60));

  const executor = new MockCellExecutor();

  const cell: CodeCell = {
    id: 'cell-001',
    type: 'code',
    source: `
// Sample TypeScript code
interface User {
  name: string;
  age: number;
}

const user: User = { name: 'Alice', age: 30 };
console.log('User created successfully');
console.log('Name: ' + user.name);

// Some computation
const result = [1, 2, 3].map(n => n * 2);
console.log('Doubled: ' + result.join(', '));
`.trim(),
    language: 'typescript',
    filename: 'demo.ts',
    status: 'idle',
  };

  console.log('\nCell to execute:');
  console.log('-'.repeat(40));
  console.log(cell.source);
  console.log('-'.repeat(40));

  console.log('\nExecution trace:');
  console.log('-'.repeat(40));

  const result = await executor.execute(mockSession, cell);

  console.log('-'.repeat(40));
  console.log('\nExecution Result:');
  console.log(`  Exit Code: ${result.exitCode}`);
  console.log(`  Duration: ${result.durationMs}ms`);
  console.log(`  Output Events: ${result.outputs.length}`);

  console.log('\nCollected Output:');
  result.outputs.forEach(o => {
    console.log(`  [${o.output.type}] ${o.output.data.trim()}`);
  });
}

runDemo();
```

## Deep Dive: Implementation Details

### How Srcbook Actually Implements Execution

The execution system spans several key files:

**`packages/api/exec.mts` - Low-Level Process Spawning**

This module provides the core execution functions:

```typescript
// Simplified version of exec.mts

export function node(options) {
  return spawnCall({
    command: 'node',
    args: [options.entry],
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdout: options.stdout,
    stderr: options.stderr,
    onExit: options.onExit,
  });
}

export function tsx(options) {
  return spawnCall({
    // tsx is installed in the session's node_modules
    command: Path.join(options.cwd, 'node_modules', '.bin', 'tsx'),
    args: [options.entry],
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdout: options.stdout,
    stderr: options.stderr,
    onExit: options.onExit,
  });
}
```

**`packages/api/processes.mts` - Process Registry**

Tracks running processes for cell stopping:

```typescript
// Simplified from processes.mts
export class Processes {
  private processes: Record<string, ChildProcess> = {};

  add(sessionId: string, cellId: string, process: ChildProcess) {
    const key = `${sessionId}:${cellId}`;
    this.processes[key] = process;

    // Auto-cleanup when process exits
    process.on('exit', () => {
      delete this.processes[key];
    });
  }

  kill(sessionId: string, cellId: string) {
    const key = `${sessionId}:${cellId}`;
    const process = this.processes[key];
    return process?.kill('SIGTERM');
  }
}
```

**`packages/api/server/ws.mts` - WebSocket Integration**

Connects execution to the real-time communication layer:

```typescript
// The cellExec handler (simplified)
async function cellExec(payload, context) {
  const session = await findSession(context.params.sessionId);
  const cell = findCell(session, payload.cellId);

  cell.status = 'running';
  wss.broadcast(`session:${session.id}`, 'cell:updated', { cell });

  // Execute based on language
  if (cell.language === 'javascript') {
    jsExec({ session, cell, secrets });
  } else {
    tsxExec({ session, cell, secrets });
  }
}
```

### Security Considerations

**IMPORTANT:** Understanding the security model is crucial when working with cell execution.

1. **No Sandboxing**: Code cells execute as child processes with the same permissions as the Srcbook server. Executed code has full access to:
   - File system (read and write anywhere the server can)
   - Network (make HTTP requests, open sockets)
   - Environment variables (including secrets)
   - System resources (CPU, memory, disk)

2. **Trust Model**: Srcbook assumes **trusted users**. The execution model is designed for local development, not multi-tenant environments. Never expose a Srcbook server to untrusted users.

3. **Environment Variable Exposure**: Secrets configured in Srcbook are passed as environment variables to child processes. Any executed code can access these secrets via `process.env`.

4. **No Resource Limits**: By default, there are no CPU or memory limits on spawned processes. A cell with an infinite loop or memory leak can affect the entire host system.

5. **Process Cleanup**: When you close a session, running processes are terminated. However, if the server crashes, orphaned processes may remain.

This is intentional - Srcbook is a **development tool**, not a production code execution sandbox.

### Edge Cases

**Edge Case 1: Infinite Loops**

A cell with an infinite loop will run forever until manually stopped:
```typescript
// This will never exit!
while (true) {
  console.log('stuck');
}
```

Users must click "Stop" to kill the process.

**Edge Case 2: Memory Exhaustion**

Node.js has default heap limits (~4GB), but a cell can still exhaust system memory:
```typescript
// This will eventually crash
const arr = [];
while (true) {
  arr.push(new Array(1000000));
}
```

**Edge Case 3: Import Errors**

Missing dependencies cause execution failure with helpful error messages:
```
Error: Cannot find module 'lodash'
```

**Edge Case 4: Syntax Errors**

TSX catches TypeScript errors at compile time before execution.

### Performance Characteristics

| Operation | Typical Latency |
|-----------|----------------|
| Process spawn | ~50ms |
| TSX compilation | ~100-300ms |
| First stdout delivery | ~100-400ms total |
| Large output buffering | Memory-bound |

## Interactive Exercise: Build a Timed Executor

Now it's your turn! Implement a `TimedExecutor` class that:
1. Simulates code execution with mock output
2. Enforces a timeout (cancels after N milliseconds)
3. Reports execution statistics

###### exercise.ts

```typescript
// Exercise: Build a Timed Executor
//
// Your challenge is to implement the TimedExecutor class below.
// It should:
// 1. Track execution duration
// 2. Handle timeouts (cancel after timeoutMs)
// 3. Return execution results with statistics
//
// Hints:
// - Use setTimeout for the timeout mechanism
// - Use Date.now() to track duration
// - The execute() method should return a Promise

interface TimedExecutionResult {
  success: boolean;
  output: string[];
  durationMs: number;
  timedOut: boolean;
}

class TimedExecutor {
  private timeoutMs: number;

  constructor(timeoutMs: number = 5000) {
    this.timeoutMs = timeoutMs;
  }

  async execute(mockCode: string): Promise<TimedExecutionResult> {
    const startTime = Date.now();
    const outputs: string[] = [];
    let timedOut = false;

    // TODO: Implement the execution logic
    //
    // Step 1: Set up a timeout that sets timedOut = true
    // Step 2: Simulate execution (parse console.log from mockCode)
    // Step 3: Clear timeout if execution completes
    // Step 4: Return the result
    //
    // Hint: You can use this regex to find console.log statements:
    // const logRegex = /console\.log\(['"]([^'"]+)['"]\)/g;

    // --- Your implementation here ---

    // Simple implementation for demonstration
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        timedOut = true;
        resolve({
          success: false,
          output: outputs,
          durationMs: Date.now() - startTime,
          timedOut: true,
        });
      }, this.timeoutMs);

      // Simulate finding console.log statements
      const logRegex = /console\.log\(['"]([^'"]+)['"]\)/g;
      let match;
      while ((match = logRegex.exec(mockCode)) !== null) {
        outputs.push(match[1]);
      }

      // Simulate some execution time
      setTimeout(() => {
        if (!timedOut) {
          clearTimeout(timeoutId);
          resolve({
            success: true,
            output: outputs,
            durationMs: Date.now() - startTime,
            timedOut: false,
          });
        }
      }, 100); // Simulated execution time
    });
  }
}

// Test the implementation
async function testTimedExecutor() {
  console.log('Testing TimedExecutor');
  console.log('='.repeat(40));

  const executor = new TimedExecutor(1000); // 1 second timeout

  // Test 1: Normal execution
  console.log('\nTest 1: Normal execution');
  const code1 = `
    console.log('Hello World');
    console.log('Execution complete');
  `;

  const result1 = await executor.execute(code1);
  console.log('Result:', result1);

  // Test 2: Code that would timeout (simulated)
  console.log('\nTest 2: Testing timeout detection');
  const slowExecutor = new TimedExecutor(50); // Very short timeout

  // In a real implementation with actual process spawning,
  // this would test actual timeout behavior
  const code2 = `
    console.log('Starting slow operation');
  `;

  const result2 = await slowExecutor.execute(code2);
  console.log('Result:', result2);

  console.log('\nExercise complete!');
  console.log('Try modifying the TimedExecutor class to add more features.');
}

testTimedExecutor();
```

## Source Code References

Want to explore the actual implementation? Here are the key source files:

### Primary Files

| File | Purpose |
|------|---------|
| [`packages/api/exec.mts`](../../../exec.mts) | Core execution functions: `node()`, `tsx()`, `npmInstall()`, `vite()` |
| [`packages/api/processes.mts`](../../../processes.mts) | Process registry for tracking and killing running cells |
| [`packages/api/server/ws.mts`](../../../server/ws.mts) | WebSocket handlers including `cellExec()` and `cellStop()` |

### Supporting Files

| File | Purpose |
|------|---------|
| [`packages/api/session.mts`](../../../session.mts) | Session management, file writing |
| [`packages/api/tsserver/tsserver.mts`](../../../tsserver/tsserver.mts) | TypeScript server for pre-execution diagnostics |
| [`packages/shared/src/schemas/websockets.mts`](../../../../shared/src/schemas/websockets.mts) | WebSocket message schemas |

### Key Functions to Study

In `exec.mts`:
- `spawnCall()` - Generic process spawning with output capture
- `node()` - JavaScript execution
- `tsx()` - TypeScript execution via tsx
- `npmInstall()` - Dependency installation

In `processes.mts`:
- `add()` - Register a process
- `kill()` - Stop a process with SIGTERM

In `ws.mts`:
- `cellExec()` - Main execution entry point
- `jsExec()` - JavaScript execution with WebSocket broadcasting
- `tsxExec()` - TypeScript execution with WebSocket broadcasting
- `cellStop()` - Handle stop requests

## Next Steps

### Related Topics

Now that you understand cell execution, explore these related systems:

- **Process Management**: Deeper dive into lifecycle, signals, and cleanup
- **WebSocket Protocol**: How execution events are broadcast to clients
- **TypeScript Diagnostics**: Pre-execution type checking with tsserver
- **Session Management**: How files and directories are organized

### Further Reading

- [Node.js Child Process Documentation](https://nodejs.org/api/child_process.html)
- [tsx - TypeScript Execute](https://github.com/esbuild-kit/tsx)
- [Understanding Node.js Streams](https://nodejs.org/api/stream.html)

### Contributing

Found a way to improve execution? Here's how to contribute:

1. The execution code lives in `packages/api/exec.mts`
2. Process tracking is in `packages/api/processes.mts`
3. WebSocket integration is in `packages/api/server/ws.mts`
4. Tests would go in `packages/api/test/`

Consider improvements like:
- Execution timeouts
- Memory limits
- Better error messages
- Execution metrics

## Summary

In this Srcbook, we covered:

- **File-Based Execution**: Code cells are written to disk and executed as real Node.js processes
- **Language Paths**: JavaScript uses `node`, TypeScript uses `tsx`
- **Process Registry**: Running processes are tracked by `sessionId:cellId` for stopping
- **Output Streaming**: stdout/stderr are captured in real-time and broadcast via WebSocket
- **Security Model**: No sandboxing - this is a development tool for trusted users
- **Edge Cases**: Infinite loops, memory exhaustion, import errors, and syntax errors

Key takeaways:
- Cell execution is a real Node.js process with full system access
- The process registry enables cell stopping and cleanup
- Output is streamed in real-time, not buffered until completion
- Security is based on trust, not isolation

You now understand how Srcbook transforms your code into executable results. This knowledge is essential for debugging, contributing to Srcbook, or building extensions.
