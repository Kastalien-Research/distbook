<!-- srcbook:{"language":"typescript"} -->

# Process Management - Tracking Running Code

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

**What is Process Management?**

When you run a code cell in Srcbook, a child process is spawned to execute it. But what happens when you want to:
- Stop a running cell?
- Know which cells are currently executing?
- Clean up processes when a session closes?

This is where the **Process Registry** comes in. It's a central tracking system that:
- Maps running processes to their session and cell
- Enables stopping processes on demand
- Handles cleanup when processes exit

**Why does it matter?**

Understanding process management helps you:
- Debug stuck or runaway processes
- Build monitoring tools for code execution
- Contribute to Srcbook's execution system
- Handle resource cleanup properly

**Prerequisites**

Before diving in, you should be familiar with:
- Cell Execution (how code cells are run)
- Node.js child processes (`spawn`, `ChildProcess`)
- Basic event handling

**Learning Objectives**

By the end of this Srcbook, you will:
1. Understand the process registry pattern
2. Learn how processes are tracked by session and cell ID
3. Comprehend process lifecycle (spawn, run, exit, kill)
4. Know how to handle long-running processes and cleanup

## Key Concepts

### Architecture Overview

Here's how the process registry fits into Srcbook's execution flow:

```
                     Process Registry Architecture

  +----------------+     +------------------+     +------------------+
  |  Cell Exec     |---->|  Spawn Process   |---->|  Register in     |
  |  Request       |     |  (node or tsx)   |     |  Registry        |
  +----------------+     +--------+---------+     +--------+---------+
                                  |                        |
                                  v                        v
  +----------------+     +------------------+     +------------------+
  |  Cell Stop     |---->|  Look up in      |---->|  Kill Process    |
  |  Request       |     |  Registry        |     |  (SIGTERM)       |
  +----------------+     +------------------+     +------------------+

                    Registry: Map<sessionId:cellId, ChildProcess>

  +-----------------------------------------------------------------+
  |                        Process Registry                          |
  |                                                                   |
  |  Map<string, ChildProcess>                                       |
  |                                                                   |
  |  ┌─────────────────────────────────────────────────────────┐    |
  |  │ session:abc:cell:001  -->  ChildProcess { pid: 12345 }  │    |
  |  │ session:abc:cell:002  -->  ChildProcess { pid: 12346 }  │    |
  |  │ session:xyz:cell:001  -->  ChildProcess { pid: 12347 }  │    |
  |  └─────────────────────────────────────────────────────────┘    |
  |                                                                   |
  |  Operations:                                                      |
  |  - add(sessionId, cellId, process)  -> Register process          |
  |  - kill(sessionId, cellId)          -> Send SIGTERM, returns bool|
  |  - Auto-cleanup on process exit                                  |
  |                                                                   |
  +-----------------------------------------------------------------+
```

### Core Concepts

**Concept 1: Composite Keys**

Processes are tracked using a composite key: `sessionId:cellId`. This ensures:
- Each cell can only have one running process at a time
- Different sessions are isolated from each other
- Process lookup is O(1)

**Concept 2: Auto-Cleanup**

When a process exits (normally or due to an error), it automatically removes itself from the registry. This prevents memory leaks and stale references.

**Concept 3: Graceful Termination**

When stopping a process, Srcbook sends `SIGTERM` (terminate signal). This gives the process a chance to clean up. If a process doesn't respond, a more forceful `SIGKILL` could be sent (though Srcbook's current implementation relies on SIGTERM alone).

**Concept 4: Validation**

Before adding a process, the registry validates:
- The process has a valid PID (it actually started)
- The process hasn't already been killed
- This prevents race conditions and invalid states

## Simple Demo: Basic Process Tracking

Let's build a simple process registry to understand the core pattern. This demo uses mock processes and timers to simulate the behavior without spawning actual long-running processes.

###### simple-registry.ts

```typescript
// Simple process registry demonstration
// Uses mock data and timers to simulate process tracking

// ============================================
// Type Definitions
// ============================================

interface MockProcess {
  pid: number;
  killed: boolean;
  exitCode: number | null;
  onExitCallbacks: Array<() => void>;
}

interface ProcessEntry {
  process: MockProcess;
  startTime: number;
  status: 'running' | 'exited';
}

// ============================================
// Mock Process Factory
// ============================================

let nextPid = 10000;

function createMockProcess(durationMs: number): MockProcess {
  const proc: MockProcess = {
    pid: nextPid++,
    killed: false,
    exitCode: null,
    onExitCallbacks: [],
  };

  // Simulate process running for a duration then exiting
  setTimeout(() => {
    if (!proc.killed) {
      proc.exitCode = 0;
      proc.onExitCallbacks.forEach(cb => cb());
    }
  }, durationMs);

  return proc;
}

function killMockProcess(proc: MockProcess): boolean {
  if (proc.killed) return false;
  proc.killed = true;
  proc.exitCode = 143; // SIGTERM exit code
  proc.onExitCallbacks.forEach(cb => cb());
  return true;
}

// ============================================
// Simple Process Registry
// ============================================

const processRegistry = new Map<string, ProcessEntry>();

function makeKey(sessionId: string, cellId: string): string {
  return `${sessionId}:${cellId}`;
}

function registerProcess(sessionId: string, cellId: string, proc: MockProcess): void {
  const key = makeKey(sessionId, cellId);

  // Validation: ensure process started properly
  if (!proc.pid) {
    throw new Error('Cannot register process without PID');
  }
  if (proc.killed) {
    throw new Error('Cannot register killed process');
  }

  const entry: ProcessEntry = {
    process: proc,
    startTime: Date.now(),
    status: 'running',
  };

  processRegistry.set(key, entry);

  // Auto-cleanup when process exits
  proc.onExitCallbacks.push(() => {
    const existing = processRegistry.get(key);
    if (existing && existing.process === proc) {
      existing.status = 'exited';
      processRegistry.delete(key);
      console.log(`  [Auto-cleanup] Process ${key} removed (exit code: ${proc.exitCode})`);
    }
  });

  console.log(`[Register] ${key} -> PID ${proc.pid}`);
}

function killProcess(sessionId: string, cellId: string): boolean {
  const key = makeKey(sessionId, cellId);
  const entry = processRegistry.get(key);

  if (!entry) {
    console.log(`[Kill] No process found for ${key}`);
    return false;
  }

  if (entry.status === 'exited') {
    console.log(`[Kill] Process ${key} already exited`);
    return false;
  }

  const killed = killMockProcess(entry.process);
  console.log(`[Kill] ${key} -> ${killed ? 'SIGTERM sent' : 'Failed'}`);
  return killed;
}

function listProcesses(): void {
  console.log('\n--- Active Processes ---');
  if (processRegistry.size === 0) {
    console.log('  (none)');
    return;
  }
  for (const [key, entry] of processRegistry) {
    const duration = Date.now() - entry.startTime;
    console.log(`  ${key}: PID ${entry.process.pid}, ${entry.status}, ${duration}ms`);
  }
  console.log('------------------------\n');
}

// ============================================
// Demo
// ============================================

console.log('='.repeat(50));
console.log('Simple Process Registry Demo');
console.log('='.repeat(50));
console.log();

// Start some mock processes
console.log('Step 1: Starting processes...\n');

const proc1 = createMockProcess(2000); // Will run for 2 seconds
const proc2 = createMockProcess(3000); // Will run for 3 seconds
const proc3 = createMockProcess(500);  // Will run for 0.5 seconds (exits quickly)

registerProcess('session-abc', 'cell-001', proc1);
registerProcess('session-abc', 'cell-002', proc2);
registerProcess('session-xyz', 'cell-001', proc3);

listProcesses();

// After 700ms, proc3 should have exited
setTimeout(() => {
  console.log('Step 2: After 700ms (proc3 should have auto-exited)...');
  listProcesses();
}, 700);

// Kill one process manually
setTimeout(() => {
  console.log('Step 3: Manually killing session-abc:cell-001...');
  killProcess('session-abc', 'cell-001');
  listProcesses();
}, 1000);

// Final state
setTimeout(() => {
  console.log('Step 4: Final state after all processes complete...');
  listProcesses();
  console.log('Demo complete!');
}, 3500);
```

## Explanation: How the Registry Works

Now let's break down the key patterns in the process registry:

### Pattern 1: Composite Key Strategy

The registry uses `sessionId:cellId` as its key:

```typescript
private toKey(sessionId: string, cellId: string) {
  return sessionId + ':' + cellId;
}
```

This simple concatenation creates a unique identifier for each cell's process. Benefits:
- **Session isolation**: Different sessions can have cells with the same ID
- **Single process per cell**: Re-running a cell would need to kill the existing process first
- **O(1) lookup**: Map-based access is constant time

### Pattern 2: Validation on Add

Before adding a process, Srcbook validates its state:

```typescript
if (typeof process.pid !== 'number') {
  throw new Error('Cannot add a process with no pid');
}

if (process.killed) {
  throw new Error('Cannot add a process that has been killed');
}
```

Why? Because `spawn()` is asynchronous. There's a brief moment between calling `spawn()` and the process actually starting. These checks ensure we only track processes that are genuinely running.

### Pattern 3: Auto-Cleanup on Exit

The registry hooks into the process's `exit` event:

```typescript
process.on('exit', () => {
  delete this.processes[key];
});
```

This ensures:
- No manual cleanup needed for normal exits
- No stale references to dead processes
- Memory is freed automatically

### Pattern 4: Graceful Termination

When killing a process, SIGTERM is used:

```typescript
return process.kill('SIGTERM');
```

SIGTERM is the standard "please terminate" signal. It allows processes to:
- Finish current operations
- Close file handles
- Clean up resources
- Exit gracefully

Compared to SIGKILL (immediate termination), SIGTERM is more polite.

## Advanced Demo: Full-Featured Registry

This advanced demo implements a more complete registry with event emission, status tracking, and timeout-based force kill.

###### advanced-registry.ts

```typescript
// Advanced process registry matching Srcbook's patterns
// Includes event emission, status tracking, and graceful shutdown

import { EventEmitter } from 'events';

// ============================================
// Type Definitions
// ============================================

type ProcessStatus = 'starting' | 'running' | 'stopping' | 'exited';

interface MockChildProcess {
  pid: number;
  killed: boolean;
  exitCode: number | null;
  _onExit: Array<(code: number) => void>;
  _onError: Array<(err: Error) => void>;
  _forceKillTimer?: ReturnType<typeof setTimeout>;
}

interface ProcessInfo {
  pid: number;
  sessionId: string;
  cellId: string;
  status: ProcessStatus;
  startTime: number;
  exitCode?: number;
}

// ============================================
// Mock Process Implementation
// ============================================

let pidCounter = 20000;

function createMockChildProcess(options: {
  runDurationMs: number;
  produceOutput?: boolean;
}): MockChildProcess {
  const proc: MockChildProcess = {
    pid: pidCounter++,
    killed: false,
    exitCode: null,
    _onExit: [],
    _onError: [],
  };

  // Simulate process lifecycle
  setTimeout(() => {
    if (!proc.killed) {
      proc.exitCode = 0;
      proc._onExit.forEach(cb => cb(0));
    }
  }, options.runDurationMs);

  return proc;
}

function mockKill(proc: MockChildProcess, signal: 'SIGTERM' | 'SIGKILL'): boolean {
  if (proc.killed) return false;

  if (signal === 'SIGKILL') {
    // Immediate termination
    proc.killed = true;
    proc.exitCode = 137; // Killed by SIGKILL
    proc._onExit.forEach(cb => cb(137));
  } else {
    // SIGTERM - give it a moment to "clean up"
    setTimeout(() => {
      if (!proc.killed) {
        proc.killed = true;
        proc.exitCode = 143; // Killed by SIGTERM
        proc._onExit.forEach(cb => cb(143));
      }
    }, 50);
  }

  return true;
}

// ============================================
// Advanced Process Registry Class
// ============================================

class ProcessRegistry extends EventEmitter {
  private processes: Map<string, {
    info: ProcessInfo;
    handle: MockChildProcess;
  }> = new Map();

  private forceKillTimeoutMs: number;

  constructor(options?: { forceKillTimeoutMs?: number }) {
    super();
    this.forceKillTimeoutMs = options?.forceKillTimeoutMs ?? 5000;
  }

  private makeKey(sessionId: string, cellId: string): string {
    return `${sessionId}:${cellId}`;
  }

  /**
   * Register a new process in the registry.
   * If a process already exists for this key, it will be killed first.
   */
  register(sessionId: string, cellId: string, proc: MockChildProcess): ProcessInfo {
    const key = this.makeKey(sessionId, cellId);

    // Kill existing process if any (re-run scenario)
    if (this.processes.has(key)) {
      console.log(`  [Registry] Killing existing process for ${key}`);
      this.kill(sessionId, cellId);
    }

    // Validate process
    if (typeof proc.pid !== 'number') {
      throw new Error('Cannot register process without PID');
    }
    if (proc.killed) {
      throw new Error('Cannot register killed process');
    }

    const info: ProcessInfo = {
      pid: proc.pid,
      sessionId,
      cellId,
      status: 'starting',
      startTime: Date.now(),
    };

    this.processes.set(key, { info, handle: proc });

    // Transition to 'running' after a brief startup period
    setTimeout(() => {
      if (info.status === 'starting') {
        info.status = 'running';
        this.emit('status', { ...info });
      }
    }, 20);

    // Handle process exit
    proc._onExit.push((code) => {
      info.status = 'exited';
      info.exitCode = code;
      this.emit('exit', { ...info });
      this.processes.delete(key);
    });

    this.emit('registered', { ...info });
    return { ...info };
  }

  /**
   * Kill a process by sessionId and cellId.
   * Sends SIGTERM first, then SIGKILL after timeout.
   */
  kill(sessionId: string, cellId: string): boolean {
    const key = this.makeKey(sessionId, cellId);
    const entry = this.processes.get(key);

    if (!entry) {
      return false;
    }

    if (entry.info.status === 'exited' || entry.info.status === 'stopping') {
      return false;
    }

    entry.info.status = 'stopping';
    this.emit('status', { ...entry.info });

    // Send SIGTERM
    mockKill(entry.handle, 'SIGTERM');

    // Set up force kill timeout
    entry.handle._forceKillTimer = setTimeout(() => {
      if (this.processes.has(key)) {
        console.log(`  [Registry] Force killing ${key} (timeout)`);
        mockKill(entry.handle, 'SIGKILL');
      }
    }, this.forceKillTimeoutMs);

    // Clear force kill timer if process exits gracefully
    const originalExit = entry.handle._onExit[entry.handle._onExit.length - 1];
    entry.handle._onExit[entry.handle._onExit.length - 1] = (code) => {
      if (entry.handle._forceKillTimer) {
        clearTimeout(entry.handle._forceKillTimer);
      }
      originalExit(code);
    };

    return true;
  }

  /**
   * Kill all processes belonging to a session.
   * Useful for session cleanup.
   */
  killSession(sessionId: string): number {
    let killed = 0;
    for (const [_, entry] of this.processes) {
      if (entry.info.sessionId === sessionId) {
        if (this.kill(sessionId, entry.info.cellId)) {
          killed++;
        }
      }
    }
    return killed;
  }

  /**
   * Get process info by sessionId and cellId.
   */
  get(sessionId: string, cellId: string): ProcessInfo | undefined {
    const key = this.makeKey(sessionId, cellId);
    const entry = this.processes.get(key);
    return entry ? { ...entry.info } : undefined;
  }

  /**
   * List all processes for a session.
   */
  listBySession(sessionId: string): ProcessInfo[] {
    const results: ProcessInfo[] = [];
    for (const [_, entry] of this.processes) {
      if (entry.info.sessionId === sessionId) {
        results.push({ ...entry.info });
      }
    }
    return results;
  }

  /**
   * List all processes in the registry.
   */
  listAll(): ProcessInfo[] {
    return Array.from(this.processes.values()).map(e => ({ ...e.info }));
  }

  /**
   * Get the count of running processes.
   */
  get size(): number {
    return this.processes.size;
  }
}

// ============================================
// Demo
// ============================================

async function runDemo() {
  console.log('='.repeat(60));
  console.log('Advanced Process Registry Demo');
  console.log('='.repeat(60));
  console.log();

  // Create registry with short force-kill timeout for demo
  const registry = new ProcessRegistry({ forceKillTimeoutMs: 500 });

  // Set up event listeners
  registry.on('registered', (info: ProcessInfo) => {
    console.log(`[Event: registered] ${info.sessionId}:${info.cellId} (PID: ${info.pid})`);
  });

  registry.on('status', (info: ProcessInfo) => {
    console.log(`[Event: status] ${info.sessionId}:${info.cellId} -> ${info.status}`);
  });

  registry.on('exit', (info: ProcessInfo) => {
    console.log(`[Event: exit] ${info.sessionId}:${info.cellId} (code: ${info.exitCode})`);
  });

  // Start some processes
  console.log('--- Starting Processes ---\n');

  const proc1 = createMockChildProcess({ runDurationMs: 2000 });
  const proc2 = createMockChildProcess({ runDurationMs: 2000 });
  const proc3 = createMockChildProcess({ runDurationMs: 400 }); // Quick exit

  registry.register('session-1', 'cell-a', proc1);
  registry.register('session-1', 'cell-b', proc2);
  registry.register('session-2', 'cell-a', proc3);

  console.log();

  // Wait for processes to transition to 'running'
  await delay(100);

  // List current state
  console.log('\n--- Current State ---');
  console.log('All processes:', registry.listAll().map(p =>
    `${p.sessionId}:${p.cellId}(${p.status})`
  ).join(', '));
  console.log('Session-1 count:', registry.listBySession('session-1').length);
  console.log('Total count:', registry.size);

  // Wait for proc3 to exit naturally
  await delay(500);
  console.log('\n--- After proc3 exits ---');
  console.log('All processes:', registry.listAll().map(p =>
    `${p.sessionId}:${p.cellId}(${p.status})`
  ).join(', '));

  // Kill entire session-1
  await delay(200);
  console.log('\n--- Killing Session-1 ---');
  const killed = registry.killSession('session-1');
  console.log(`Sent kill signal to ${killed} processes`);

  // Wait for kills to process
  await delay(200);
  console.log('\n--- Final State ---');
  console.log('Remaining processes:', registry.listAll().length);

  console.log('\nDemo complete!');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runDemo();
```

## Deep Dive: Srcbook's Actual Implementation

### How Srcbook Actually Implements Process Management

The process management system spans several key files in the codebase:

**`packages/api/processes.mts` - The Core Registry**

This is a simple but effective implementation:

```typescript
// Actual code from processes.mts (simplified for clarity)
import { ChildProcess } from 'node:child_process';

export class Processes {
  private processes: Record<string, ChildProcess> = {};

  add(sessionId: string, cellId: string, process: ChildProcess) {
    const key = this.toKey(sessionId, cellId);

    // Validation: ensure process is valid
    if (typeof process.pid !== 'number') {
      throw new Error('Cannot add a process with no pid');
    }
    if (process.killed) {
      throw new Error('Cannot add a process that has been killed');
    }

    this.processes[key] = process;

    // Auto-cleanup when process exits
    process.on('exit', () => {
      delete this.processes[key];
    });
  }

  kill(sessionId: string, cellId: string) {
    const key = this.toKey(sessionId, cellId);
    const process = this.processes[key];

    if (!process) {
      throw new Error(
        `Cannot kill process: no process for session ${sessionId} and cell ${cellId} exists`
      );
    }

    if (process.killed) {
      throw new Error(
        `Cannot kill process: process has already been killed`
      );
    }

    return process.kill('SIGTERM');
  }

  private toKey(sessionId: string, cellId: string) {
    return sessionId + ':' + cellId;
  }
}

// Singleton instance
export default new Processes();
```

**Key design decisions:**
- Uses a plain object (`Record<string, ChildProcess>`) instead of `Map` - simpler and sufficient
- Singleton pattern - one global registry for all sessions
- Throws errors instead of returning false - forces callers to handle edge cases
- Only uses SIGTERM - relies on processes to handle termination gracefully

**`packages/api/server/ws.mts` - WebSocket Integration**

The `cellStop` handler connects WebSocket requests to the registry:

```typescript
// From ws.mts - the cellStop handler
async function cellStop(payload: CellStopPayloadType, context: SessionsContextType) {
  const session = await findSession(context.params.sessionId);
  const cell = findCell(session, payload.cellId);

  if (!cell || cell.type !== 'code') {
    return;
  }

  // Update cell status before killing
  cell.status = 'idle';
  wss.broadcast(`session:${session.id}`, 'cell:updated', { cell });

  try {
    const killed = processes.kill(session.id, cell.id);
    if (!killed) {
      console.warn(
        `Process could not be killed. It may have already finished.`
      );
    }
  } catch (e) {
    console.error(`Error killing process:`, e);
  }
}
```

**Flow:**
1. User clicks "Stop" in the UI
2. WebSocket message `cell:stop` is sent
3. `cellStop` handler receives the message
4. Cell status is set to `idle` and broadcast
5. `processes.kill()` sends SIGTERM to the process

**`packages/api/apps/processes.mts` - App-Specific Processes**

For Srcbook Apps (full applications with preview), a more sophisticated registry is used:

```typescript
// Simplified from apps/processes.mts
type ProcessType = 'npm:install' | 'vite:server';

interface AppProcessType {
  type: ProcessType;
  process: ChildProcess;
  port?: number;  // For vite server
}

class Processes {
  private map: Map<string, AppProcessType> = new Map();

  has(appId: string, type: ProcessType) {
    return this.map.has(this.toKey(appId, type));
  }

  get(appId: string, type: ProcessType) {
    return this.map.get(this.toKey(appId, type));
  }

  set(appId: string, process: AppProcessType) {
    this.map.set(this.toKey(appId, process.type), process);
  }

  private toKey(appId: string, type: ProcessType) {
    return `${appId}:${type}`;
  }
}
```

This registry:
- Tracks multiple process types per app (npm install, vite server)
- Uses `Map` for type safety with complex values
- Stores additional metadata like port numbers

### When Processes Are Registered

The registration happens in `ws.mts` right after spawning:

```typescript
// From the cell execution flow
const process = cell.language === 'javascript'
  ? node({ cwd, env, entry, stdout, stderr, onExit })
  : tsx({ cwd, env, entry, stdout, stderr, onExit });

// Check if process started successfully
if (!process.pid || process.killed) {
  cell.status = 'idle';
  wss.broadcast(`session:${session.id}`, 'cell:updated', { cell });
} else {
  // Register the running process
  processes.add(session.id, cell.id, process);
}
```

This ensures:
- Only successfully started processes are tracked
- Failed spawns don't pollute the registry
- The UI is updated immediately if spawn fails

## Interactive Exercise: Build a Process Monitor Dashboard

Your challenge: Create a process monitoring system that tracks processes, displays their status, and automatically kills processes that run too long.

###### exercise.ts

```typescript
// Exercise: Build a Process Monitor Dashboard
//
// Your challenge:
// 1. Track multiple processes with metadata
// 2. Display a dashboard showing process status
// 3. Implement auto-kill for processes running > maxRuntimeMs
// 4. Emit events for status changes
//
// Bonus challenges:
// - Add memory usage tracking (simulated)
// - Implement priority levels
// - Add graceful shutdown with timeout

import { EventEmitter } from 'events';

// ============================================
// Type Definitions
// ============================================

interface ProcessMetadata {
  name: string;
  sessionId: string;
  cellId: string;
  pid: number;
  startTime: number;
  status: 'running' | 'stopping' | 'stopped';
  memoryUsageMb?: number;
}

interface DashboardDisplay {
  totalProcesses: number;
  runningProcesses: number;
  longestRunningMs: number;
  processes: Array<{
    name: string;
    status: string;
    runtimeMs: number;
    memoryMb: number;
  }>;
}

// ============================================
// Mock Process for Testing
// ============================================

interface MockProcess {
  pid: number;
  killed: boolean;
  onExit: () => void;
}

let mockPidCounter = 30000;

function createTestProcess(durationMs: number): MockProcess {
  const proc: MockProcess = {
    pid: mockPidCounter++,
    killed: false,
    onExit: () => {},
  };

  setTimeout(() => {
    if (!proc.killed) {
      proc.onExit();
    }
  }, durationMs);

  return proc;
}

// ============================================
// Process Monitor Implementation
// ============================================

class ProcessMonitor extends EventEmitter {
  private processes: Map<string, {
    meta: ProcessMetadata;
    handle: MockProcess;
    autoKillTimer?: ReturnType<typeof setTimeout>;
  }> = new Map();

  private maxRuntimeMs: number;
  private updateIntervalMs: number;
  private dashboardTimer?: ReturnType<typeof setInterval>;

  constructor(options?: { maxRuntimeMs?: number; updateIntervalMs?: number }) {
    super();
    this.maxRuntimeMs = options?.maxRuntimeMs ?? 10000;
    this.updateIntervalMs = options?.updateIntervalMs ?? 1000;
  }

  /**
   * Start the dashboard update loop
   */
  startDashboard(): void {
    if (this.dashboardTimer) return;

    this.dashboardTimer = setInterval(() => {
      this.emit('dashboard', this.getDashboard());
    }, this.updateIntervalMs);

    console.log('[Monitor] Dashboard started');
  }

  /**
   * Stop the dashboard update loop
   */
  stopDashboard(): void {
    if (this.dashboardTimer) {
      clearInterval(this.dashboardTimer);
      this.dashboardTimer = undefined;
      console.log('[Monitor] Dashboard stopped');
    }
  }

  /**
   * Add a process to monitor
   */
  addProcess(
    name: string,
    sessionId: string,
    cellId: string,
    proc: MockProcess
  ): ProcessMetadata {
    const key = `${sessionId}:${cellId}`;

    const meta: ProcessMetadata = {
      name,
      sessionId,
      cellId,
      pid: proc.pid,
      startTime: Date.now(),
      status: 'running',
      memoryUsageMb: Math.random() * 100, // Simulated
    };

    // Set up auto-kill timer
    const autoKillTimer = setTimeout(() => {
      if (this.processes.has(key)) {
        console.log(`[Monitor] Auto-killing ${name} (exceeded max runtime)`);
        this.stopProcess(sessionId, cellId);
      }
    }, this.maxRuntimeMs);

    // Handle process exit
    const originalOnExit = proc.onExit;
    proc.onExit = () => {
      clearTimeout(autoKillTimer);
      const entry = this.processes.get(key);
      if (entry) {
        entry.meta.status = 'stopped';
        this.emit('stopped', { ...entry.meta });
        this.processes.delete(key);
      }
      originalOnExit();
    };

    this.processes.set(key, { meta, handle: proc, autoKillTimer });
    this.emit('started', { ...meta });

    return { ...meta };
  }

  /**
   * Stop a process
   */
  stopProcess(sessionId: string, cellId: string): boolean {
    const key = `${sessionId}:${cellId}`;
    const entry = this.processes.get(key);

    if (!entry || entry.meta.status !== 'running') {
      return false;
    }

    entry.meta.status = 'stopping';
    this.emit('stopping', { ...entry.meta });

    // Simulate kill
    entry.handle.killed = true;
    setTimeout(() => entry.handle.onExit(), 50);

    return true;
  }

  /**
   * Get current dashboard data
   */
  getDashboard(): DashboardDisplay {
    const now = Date.now();
    const processList = Array.from(this.processes.values());

    const running = processList.filter(p => p.meta.status === 'running');
    const runtimes = running.map(p => now - p.meta.startTime);

    return {
      totalProcesses: processList.length,
      runningProcesses: running.length,
      longestRunningMs: runtimes.length > 0 ? Math.max(...runtimes) : 0,
      processes: processList.map(p => ({
        name: p.meta.name,
        status: p.meta.status,
        runtimeMs: now - p.meta.startTime,
        memoryMb: p.meta.memoryUsageMb ?? 0,
      })),
    };
  }

  /**
   * Stop all processes and cleanup
   */
  shutdown(): void {
    this.stopDashboard();
    for (const [_, entry] of this.processes) {
      if (entry.autoKillTimer) {
        clearTimeout(entry.autoKillTimer);
      }
      if (entry.meta.status === 'running') {
        entry.handle.killed = true;
        entry.handle.onExit();
      }
    }
    this.processes.clear();
    console.log('[Monitor] Shutdown complete');
  }
}

// ============================================
// Demo
// ============================================

async function runDemo() {
  console.log('='.repeat(60));
  console.log('Process Monitor Dashboard Demo');
  console.log('='.repeat(60));
  console.log();

  // Create monitor with short max runtime for demo
  const monitor = new ProcessMonitor({
    maxRuntimeMs: 2000,  // Auto-kill after 2 seconds
    updateIntervalMs: 500,
  });

  // Set up event listeners
  monitor.on('started', (meta: ProcessMetadata) => {
    console.log(`[Event] Process started: ${meta.name} (PID: ${meta.pid})`);
  });

  monitor.on('stopping', (meta: ProcessMetadata) => {
    console.log(`[Event] Process stopping: ${meta.name}`);
  });

  monitor.on('stopped', (meta: ProcessMetadata) => {
    console.log(`[Event] Process stopped: ${meta.name}`);
  });

  monitor.on('dashboard', (dashboard: DashboardDisplay) => {
    console.log('\n--- Dashboard Update ---');
    console.log(`Running: ${dashboard.runningProcesses}/${dashboard.totalProcesses}`);
    console.log(`Longest runtime: ${dashboard.longestRunningMs}ms`);
    dashboard.processes.forEach(p => {
      console.log(`  ${p.name}: ${p.status} (${p.runtimeMs}ms, ${p.memoryMb.toFixed(1)}MB)`);
    });
  });

  // Start dashboard
  monitor.startDashboard();

  // Add some processes
  console.log('\n--- Starting Processes ---\n');

  // Process that exits quickly
  const proc1 = createTestProcess(800);
  monitor.addProcess('quick-task', 'session-1', 'cell-1', proc1);

  // Process that will be auto-killed
  const proc2 = createTestProcess(10000);
  monitor.addProcess('long-task', 'session-1', 'cell-2', proc2);

  // Another quick process
  setTimeout(() => {
    const proc3 = createTestProcess(500);
    monitor.addProcess('delayed-task', 'session-2', 'cell-1', proc3);
  }, 1000);

  // Manually stop a process
  setTimeout(() => {
    console.log('\n--- Manual Stop ---');
    monitor.stopProcess('session-1', 'cell-2');
  }, 1500);

  // Shutdown after demo
  setTimeout(() => {
    console.log('\n--- Shutting Down ---');
    monitor.shutdown();
    console.log('\nDemo complete!');
  }, 3500);
}

runDemo();
```

## Source Code References

Want to explore the actual implementation? Here are the key source files:

### Primary Files

| File | Purpose |
|------|---------|
| [`packages/api/processes.mts`](../../../processes.mts) | Main process registry - tracks running cell processes |
| [`packages/api/apps/processes.mts`](../../../apps/processes.mts) | App-specific processes - Vite servers, npm install |
| [`packages/api/server/ws.mts`](../../../server/ws.mts) | WebSocket handlers including `cellStop()` |
| [`packages/api/exec.mts`](../../../exec.mts) | Process spawning with `node()`, `tsx()`, `spawnCall()` |

### Key Functions to Study

In `processes.mts`:
- `add()` - Register a process with validation
- `kill()` - Send SIGTERM to a process
- `toKey()` - Create composite key from sessionId:cellId

In `apps/processes.mts`:
- `npmInstall()` - Manage npm install processes
- `viteServer()` - Manage Vite dev server processes
- `waitForProcessToComplete()` - Promise-based process completion

In `ws.mts`:
- `cellStop()` - Handle stop requests from the UI
- Process registration after spawn (lines ~85-90)

In `exec.mts`:
- `spawnCall()` - Generic process spawning with callbacks
- `node()` - JavaScript execution
- `tsx()` - TypeScript execution

### Architecture Patterns

**Pattern: Singleton Registry**
```typescript
// processes.mts exports a singleton
export default new Processes();
```

**Pattern: Composite Keys**
```typescript
private toKey(sessionId: string, cellId: string) {
  return sessionId + ':' + cellId;
}
```

**Pattern: Auto-Cleanup**
```typescript
process.on('exit', () => {
  delete this.processes[key];
});
```

## Next Steps

### Related Topics

Now that you understand process management, explore these related systems:

- **Cell Execution**: How code is transformed into running processes
- **WebSocket Protocol**: How stop commands are communicated
- **Session Management**: How sessions organize files and processes
- **App Processes**: Managing Vite servers and npm install

### Further Reading

- [Node.js Child Process Documentation](https://nodejs.org/api/child_process.html)
- [Understanding Unix Signals](https://www.gnu.org/software/libc/manual/html_node/Standard-Signals.html)
- [Process Groups and Sessions](https://www.win.tue.nl/~aeb/linux/lk/lk-10.html)

### Contributing

Found ways to improve process management? Consider:

1. Adding execution timeouts to prevent runaway processes
2. Implementing SIGKILL fallback for unresponsive processes
3. Adding memory usage monitoring
4. Session-level process cleanup on disconnect
5. Process health metrics and monitoring

The relevant files are in `packages/api/`:
- `processes.mts` - Core registry
- `apps/processes.mts` - App processes
- `server/ws.mts` - WebSocket integration

## Summary

In this Srcbook, we covered:

- **Process Registry Pattern**: Tracking running processes by composite key (sessionId:cellId)
- **Lifecycle Management**: Registration, tracking, and termination of child processes
- **Auto-Cleanup**: Processes remove themselves from the registry on exit
- **Graceful Termination**: Using SIGTERM to allow processes to clean up
- **Validation**: Ensuring only valid, running processes are tracked
- **Event-Based Monitoring**: Using EventEmitter for status updates

Key takeaways:
- Every cell execution creates a child process tracked by `sessionId:cellId`
- The registry enables stopping running cells and session cleanup
- Auto-cleanup prevents memory leaks from exited processes
- SIGTERM provides graceful termination opportunities
- Validation prevents race conditions during process spawn

You now understand how Srcbook tracks and manages running processes. This knowledge is essential for debugging execution issues, building monitoring tools, or contributing to Srcbook's execution system.
