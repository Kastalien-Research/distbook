# Process Management - Implementation Specification

**Version:** 1.0
**Date:** 2026-01-14
**Status:** Implementation-Ready
**Output:** `packages/api/srcbook/examples/internals/process-management.src.md`
**Dependencies:** Cell Execution Srcbook

---

## 1. Overview

This specification defines the implementation of an educational Srcbook that explains how Srcbook tracks, manages, and terminates running processes from code cell executions.

### Learning Objectives

1. Understand the process registry pattern
2. Learn how processes are tracked by session and cell ID
3. Comprehend process lifecycle (spawn, run, exit, kill)
4. Know how to handle long-running processes and cleanup

---

## 2. File Structure

### 2.1 Srcbook Metadata

```markdown
<!-- srcbook:{"language":"typescript"} -->
```

### 2.2 Required Sections

| Section | Type | Purpose |
|---------|------|---------|
| Title | Title Cell | "Process Management - Tracking Running Code" |
| package.json | Package Cell | `{"type":"module","dependencies":{"@types/node":"latest","tsx":"latest"}}` |
| Introduction | Markdown | Context and objectives |
| Key Concepts | Markdown | Registry pattern, lifecycle states |
| Simple Demo | Code | Basic process tracking |
| Explanation | Markdown | How registry works |
| Advanced Demo | Code | Full registry implementation |
| Deep Dive | Markdown | Srcbook's actual implementation |
| Interactive Exercise | Code | Build process monitor |
| Source References | Markdown | Links to source files |
| Next Steps | Markdown | Related topics |
| Summary | Markdown | Key takeaways |

---

## 3. Content Specification

### 3.1 Introduction Content

**What is Process Management?**
- Srcbook spawns child processes for each cell execution
- Multiple cells can run simultaneously
- Need to track which processes are running, by which session/cell
- Must be able to stop processes on demand

**Why does it matter?**
- Understanding enables debugging stuck processes
- Necessary for building execution monitoring
- Critical for resource cleanup

### 3.2 Key Concepts - Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Process Registry                          │
│                                                              │
│  Map<sessionId:cellId, ProcessInfo>                         │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ session:abc:cell:001  →  { pid: 12345, status: RUN }│   │
│  │ session:abc:cell:002  →  { pid: 12346, status: RUN }│   │
│  │ session:xyz:cell:001  →  { pid: 12347, status: RUN }│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  Operations:                                                 │
│  • register(key, process) - Add to registry                 │
│  • get(key) - Retrieve process info                         │
│  • kill(key) - Send SIGTERM, remove from registry           │
│  • killAll(sessionId) - Kill all processes for session      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Simple Demo

**Filename:** `simple-registry.ts`

```typescript
// Simple process registry demonstration

import { spawn, ChildProcess } from 'child_process';

// Simple registry using a Map
const processRegistry = new Map<string, {
  process: ChildProcess;
  startTime: number;
  status: 'running' | 'exited';
}>();

function registerProcess(key: string, proc: ChildProcess) {
  processRegistry.set(key, {
    process: proc,
    startTime: Date.now(),
    status: 'running',
  });

  proc.on('exit', () => {
    const entry = processRegistry.get(key);
    if (entry) {
      entry.status = 'exited';
    }
  });

  console.log(`✅ Registered process: ${key} (PID: ${proc.pid})`);
}

function killProcess(key: string): boolean {
  const entry = processRegistry.get(key);
  if (!entry || entry.status === 'exited') {
    console.log(`⚠️ No running process for: ${key}`);
    return false;
  }

  entry.process.kill('SIGTERM');
  processRegistry.delete(key);
  console.log(`🛑 Killed process: ${key}`);
  return true;
}

function listProcesses() {
  console.log('\n📋 Active Processes:');
  for (const [key, entry] of processRegistry) {
    const duration = Date.now() - entry.startTime;
    console.log(`  ${key}: PID ${entry.process.pid}, ${entry.status}, ${duration}ms`);
  }
}

// Demo: Start a few processes
const proc1 = spawn('node', ['-e', 'setInterval(() => {}, 1000)']);
const proc2 = spawn('node', ['-e', 'setInterval(() => {}, 1000)']);

registerProcess('session:abc:cell:001', proc1);
registerProcess('session:abc:cell:002', proc2);

listProcesses();

// Kill one process
setTimeout(() => {
  killProcess('session:abc:cell:001');
  listProcesses();
}, 1000);

// Cleanup all
setTimeout(() => {
  console.log('\n🧹 Cleaning up...');
  for (const [key] of processRegistry) {
    killProcess(key);
  }
}, 2000);
```

### 3.4 Advanced Demo

**Filename:** `advanced-registry.ts`

```typescript
// Advanced process registry matching Srcbook's implementation

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

type ProcessStatus = 'starting' | 'running' | 'stopping' | 'exited';

interface ProcessInfo {
  pid: number;
  sessionId: string;
  cellId: string;
  status: ProcessStatus;
  startTime: number;
  exitCode?: number;
}

class ProcessRegistry extends EventEmitter {
  private processes: Map<string, {
    info: ProcessInfo;
    handle: ChildProcess;
  }> = new Map();

  private makeKey(sessionId: string, cellId: string): string {
    return `${sessionId}:${cellId}`;
  }

  register(sessionId: string, cellId: string, proc: ChildProcess): ProcessInfo {
    const key = this.makeKey(sessionId, cellId);

    // Kill existing process if any
    if (this.processes.has(key)) {
      this.kill(sessionId, cellId);
    }

    const info: ProcessInfo = {
      pid: proc.pid!,
      sessionId,
      cellId,
      status: 'starting',
      startTime: Date.now(),
    };

    this.processes.set(key, { info, handle: proc });

    // Update status when process starts producing output
    proc.stdout?.once('data', () => {
      info.status = 'running';
      this.emit('status', info);
    });

    // Handle exit
    proc.on('exit', (code) => {
      info.status = 'exited';
      info.exitCode = code ?? undefined;
      this.emit('exit', info);
      this.processes.delete(key);
    });

    this.emit('registered', info);
    return info;
  }

  kill(sessionId: string, cellId: string): boolean {
    const key = this.makeKey(sessionId, cellId);
    const entry = this.processes.get(key);

    if (!entry) return false;

    entry.info.status = 'stopping';
    this.emit('status', entry.info);

    entry.handle.kill('SIGTERM');

    // Force kill after timeout
    setTimeout(() => {
      if (this.processes.has(key)) {
        entry.handle.kill('SIGKILL');
      }
    }, 5000);

    return true;
  }

  killSession(sessionId: string): number {
    let killed = 0;
    for (const [key, entry] of this.processes) {
      if (entry.info.sessionId === sessionId) {
        this.kill(sessionId, entry.info.cellId);
        killed++;
      }
    }
    return killed;
  }

  get(sessionId: string, cellId: string): ProcessInfo | undefined {
    const key = this.makeKey(sessionId, cellId);
    return this.processes.get(key)?.info;
  }

  listBySession(sessionId: string): ProcessInfo[] {
    const results: ProcessInfo[] = [];
    for (const [_, entry] of this.processes) {
      if (entry.info.sessionId === sessionId) {
        results.push(entry.info);
      }
    }
    return results;
  }

  listAll(): ProcessInfo[] {
    return Array.from(this.processes.values()).map(e => e.info);
  }
}

// Demo usage
const registry = new ProcessRegistry();

// Listen for events
registry.on('registered', (info: ProcessInfo) => {
  console.log(`📝 Process registered: ${info.sessionId}:${info.cellId} (PID: ${info.pid})`);
});

registry.on('status', (info: ProcessInfo) => {
  console.log(`🔄 Status change: ${info.sessionId}:${info.cellId} → ${info.status}`);
});

registry.on('exit', (info: ProcessInfo) => {
  console.log(`🏁 Process exited: ${info.sessionId}:${info.cellId} (code: ${info.exitCode})`);
});

// Start some processes
console.log('Starting processes...\n');

const proc1 = spawn('node', ['-e', 'console.log("A"); setInterval(() => {}, 1000)']);
const proc2 = spawn('node', ['-e', 'console.log("B"); setInterval(() => {}, 1000)']);
const proc3 = spawn('node', ['-e', 'console.log("C"); setTimeout(() => process.exit(0), 500)']);

registry.register('session-1', 'cell-a', proc1);
registry.register('session-1', 'cell-b', proc2);
registry.register('session-2', 'cell-a', proc3);

// List processes
setTimeout(() => {
  console.log('\n📋 All processes:', registry.listAll().map(p =>
    `${p.sessionId}:${p.cellId}(${p.status})`
  ));
  console.log('📋 Session-1 processes:', registry.listBySession('session-1').length);
}, 600);

// Kill session-1
setTimeout(() => {
  console.log('\n🛑 Killing session-1...');
  const killed = registry.killSession('session-1');
  console.log(`Killed ${killed} processes`);
}, 1500);

// Final status
setTimeout(() => {
  console.log('\n📋 Final status:', registry.listAll());
}, 2500);
```

### 3.5 Deep Dive Content

**Source File References:**

1. **`packages/api/processes.mts`** - Main process registry
   - `processes` Map holding all running processes
   - `register()` - Add process to registry
   - `getProcess()` - Retrieve by session:cell key
   - `killProcess()` - Send SIGTERM and remove

2. **`packages/api/apps/processes.mts`** - App-specific processes
   - Similar pattern for Vite dev servers
   - Manages preview server processes

**Key Implementation Details:**

```typescript
// Simplified from processes.mts
const processes: Map<string, ChildProcessWithoutNullStreams> = new Map();

export function registerProcess(
  sessionId: string,
  cellId: string,
  process: ChildProcessWithoutNullStreams
) {
  const key = `${sessionId}:${cellId}`;
  processes.set(key, process);
}

export function killProcess(sessionId: string, cellId: string): boolean {
  const key = `${sessionId}:${cellId}`;
  const proc = processes.get(key);
  if (proc) {
    proc.kill('SIGTERM');
    processes.delete(key);
    return true;
  }
  return false;
}
```

### 3.6 Interactive Exercise

```typescript
// Exercise: Build a Process Monitor Dashboard
//
// Challenge:
// 1. Track multiple processes
// 2. Display real-time status updates
// 3. Show memory usage (bonus)
// 4. Auto-kill processes running > 30 seconds

import { spawn, ChildProcess } from 'child_process';

class ProcessMonitor {
  // TODO: Implement process tracking
  // TODO: Add status display
  // TODO: Implement timeout auto-kill

  addProcess(name: string, cmd: string, args: string[]): void {
    // Your implementation here
  }

  displayStatus(): void {
    // Your implementation here
  }
}

// Test:
// const monitor = new ProcessMonitor();
// monitor.addProcess('long-task', 'node', ['-e', 'setInterval(() => {}, 1000)']);
// setInterval(() => monitor.displayStatus(), 1000);
```

### 3.7 Source References

| File | Purpose |
|------|---------|
| `packages/api/processes.mts` | Main process registry |
| `packages/api/apps/processes.mts` | App/preview server processes |
| `packages/api/server/ws.mts` | `cellStop` handler |
| `packages/api/exec.mts` | Process spawning |

---

## 4. Acceptance Criteria

- [ ] Simple demo runs without errors
- [ ] Advanced demo shows event-based tracking
- [ ] Source references are accurate
- [ ] Process lifecycle clearly explained
- [ ] Exercise is achievable

---

## 5. Implementation Notes

### Cross-References
- Link back to Cell Execution Srcbook
- Link forward to WebSocket Protocol (for broadcast)
