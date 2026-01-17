# TypeScript Server Integration - Implementation Specification

**Version:** 1.0
**Date:** 2026-01-14
**Status:** Implementation-Ready
**Output:** `packages/api/srcbook/examples/internals/typescript-server.src.md`
**Dependencies:** Cell Execution Srcbook

---

## 1. Overview

This specification defines the implementation of an educational Srcbook that explains how Srcbook integrates with TypeScript's language server (tsserver) to provide IDE features like diagnostics, autocomplete, and hover information.

### Learning Objectives

1. Understand what tsserver is and how it communicates
2. Learn the message protocol (Content-Length header format)
3. Comprehend how Srcbook manages tsserver instances per session
4. Know the request/response flow for language features

---

## 2. File Structure

### 2.1 Srcbook Metadata

```markdown
<!-- srcbook:{"language":"typescript"} -->
```

### 2.2 Required Sections

| Section | Type | Purpose |
|---------|------|---------|
| Title | Title Cell | "TypeScript Server - IDE Features Under the Hood" |
| package.json | Package Cell | TypeScript dependencies |
| Introduction | Markdown | Context and objectives |
| Key Concepts | Markdown | Architecture diagram, message format |
| Simple Demo | Code | Spawn tsserver and send a command |
| Explanation | Markdown | Protocol breakdown |
| Advanced Demo | Code | Full tsserver wrapper |
| Deep Dive | Markdown | Srcbook's implementation |
| Interactive Exercise | Code | Build language feature |
| Source References | Markdown | Links to source files |
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
    "typescript": "latest"
  }
}
```

### 3.2 Introduction Content

**What is tsserver?**
- TypeScript's built-in language server
- Provides IDE features: diagnostics, completions, hover info
- Communicates via stdin/stdout using JSON messages
- One instance can serve multiple files (a "project")

**Why does it matter?**
- Understanding enables extending IDE features
- Necessary for debugging type checking issues
- Foundation for diagnostics and autocomplete Srcbooks

### 3.3 Key Concepts - Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  TypeScript Server Architecture              │
│                                                              │
│  Srcbook Server                    tsserver Process          │
│  ┌────────────────┐               ┌─────────────────┐       │
│  │                │   stdin       │                 │       │
│  │  TsServer      │ ───────────▶  │  Language       │       │
│  │  Wrapper       │               │  Server         │       │
│  │                │   stdout      │                 │       │
│  │                │ ◀───────────  │  (per session)  │       │
│  └────────────────┘               └─────────────────┘       │
│                                                              │
│  Message Format:                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Content-Length: 85\r\n                                │   │
│  │ \r\n                                                  │   │
│  │ {"seq":1,"type":"request","command":"open",...}      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Message Types:                                              │
│  • Request:  Client → Server (with seq number)              │
│  • Response: Server → Client (with request_seq)             │
│  • Event:    Server → Client (async notifications)          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Simple Demo

**Filename:** `simple-tsserver.ts`

```typescript
// Simple tsserver communication demo

import { spawn, ChildProcess } from 'child_process';

// Message format: Content-Length: <len>\r\n\r\n<json>
function formatMessage(msg: object): string {
  const json = JSON.stringify(msg);
  const byteLength = Buffer.byteLength(json, 'utf8');
  return `Content-Length: ${byteLength}\r\n\r\n${json}`;
}

// Start tsserver
console.log('🚀 Starting tsserver...');
const tsserver = spawn('npx', ['tsserver'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

// Buffer for incomplete messages
let buffer = '';
let seq = 0;

// Parse responses from tsserver
tsserver.stdout.on('data', (data: Buffer) => {
  buffer += data.toString();

  // Process complete messages
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;

    const header = buffer.slice(0, headerEnd);
    const match = header.match(/Content-Length: (\d+)/);
    if (!match) break;

    const contentLength = parseInt(match[1], 10);
    const messageStart = headerEnd + 4;
    const messageEnd = messageStart + contentLength;

    if (buffer.length < messageEnd) break;

    const json = buffer.slice(messageStart, messageEnd);
    buffer = buffer.slice(messageEnd);

    try {
      const msg = JSON.parse(json);
      console.log('📩 Received:', msg.type, msg.command || msg.event || '');
      if (msg.body) {
        console.log('   Body:', JSON.stringify(msg.body).slice(0, 100) + '...');
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
  }
});

tsserver.stderr.on('data', (data: Buffer) => {
  console.error('❌ stderr:', data.toString());
});

// Send a configure request
function sendRequest(command: string, args?: object): void {
  seq++;
  const request = {
    seq,
    type: 'request',
    command,
    arguments: args,
  };
  console.log(`📤 Sending: ${command} (seq: ${seq})`);
  tsserver.stdin.write(formatMessage(request));
}

// Demo: Configure and open a file
setTimeout(() => {
  // Configure tsserver
  sendRequest('configure', {
    hostInfo: 'srcbook-demo',
    preferences: {
      allowTextChangesInNewFiles: true,
    },
  });
}, 500);

setTimeout(() => {
  // Open a virtual file
  sendRequest('open', {
    file: '/tmp/demo.ts',
    fileContent: `
const x: number = "hello"; // Type error!
console.log(x);
`,
    scriptKindName: 'TS',
  });
}, 1000);

setTimeout(() => {
  // Request diagnostics
  sendRequest('geterr', {
    files: ['/tmp/demo.ts'],
    delay: 0,
  });
}, 1500);

// Cleanup after 5 seconds
setTimeout(() => {
  console.log('\n🛑 Shutting down...');
  tsserver.kill();
}, 5000);
```

### 3.5 Advanced Demo

**Filename:** `tsserver-wrapper.ts`

```typescript
// Full TsServer wrapper class (simplified from tsserver.mts)

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

interface TsServerRequest {
  seq: number;
  type: 'request';
  command: string;
  arguments?: object;
}

interface TsServerResponse {
  seq: number;
  type: 'response';
  command: string;
  request_seq: number;
  success: boolean;
  body?: unknown;
}

interface TsServerEvent {
  seq: number;
  type: 'event';
  event: string;
  body?: unknown;
}

type TsServerMessage = TsServerResponse | TsServerEvent;

class TsServer extends EventEmitter {
  private process: ChildProcess;
  private seq = 0;
  private buffer = '';
  private pendingRequests: Map<number, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }> = new Map();

  constructor(cwd: string) {
    super();

    console.log('🚀 Starting tsserver in:', cwd);
    this.process = spawn('npx', ['tsserver'], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process.stdout!.on('data', (data: Buffer) => {
      this.handleData(data);
    });

    this.process.stderr!.on('data', (data: Buffer) => {
      console.error('[tsserver stderr]', data.toString());
    });

    this.process.on('exit', (code) => {
      console.log('tsserver exited with code:', code);
      this.emit('exit', code);
    });
  }

  private handleData(data: Buffer): void {
    this.buffer += data.toString();
    this.processBuffer();
  }

  private processBuffer(): void {
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const header = this.buffer.slice(0, headerEnd);
      const match = header.match(/Content-Length: (\d+)/);
      if (!match) break;

      const contentLength = parseInt(match[1], 10);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;

      if (this.buffer.length < messageEnd) break;

      const json = this.buffer.slice(messageStart, messageEnd);
      this.buffer = this.buffer.slice(messageEnd);

      try {
        const message: TsServerMessage = JSON.parse(json);
        this.handleMessage(message);
      } catch (e) {
        console.error('Parse error:', e);
      }
    }
  }

  private handleMessage(msg: TsServerMessage): void {
    if (msg.type === 'response') {
      const pending = this.pendingRequests.get(msg.request_seq);
      if (pending) {
        this.pendingRequests.delete(msg.request_seq);
        if (msg.success) {
          pending.resolve(msg.body);
        } else {
          pending.reject(new Error(`Request failed: ${msg.command}`));
        }
      }
    } else if (msg.type === 'event') {
      console.log(`📢 Event: ${msg.event}`);
      this.emit(msg.event, msg.body);
    }
  }

  private send(command: string, args?: object): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.seq++;
      const request: TsServerRequest = {
        seq: this.seq,
        type: 'request',
        command,
        arguments: args,
      };

      this.pendingRequests.set(this.seq, { resolve, reject });

      const json = JSON.stringify(request);
      const message = `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`;

      console.log(`📤 Request: ${command} (seq: ${this.seq})`);
      this.process.stdin!.write(message);
    });
  }

  // Public API methods
  async configure(): Promise<void> {
    await this.send('configure', {
      hostInfo: 'srcbook',
      preferences: {
        allowTextChangesInNewFiles: true,
      },
    });
  }

  async open(file: string, content: string): Promise<void> {
    await this.send('open', {
      file,
      fileContent: content,
      scriptKindName: file.endsWith('.ts') ? 'TS' : 'JS',
    });
  }

  async close(file: string): Promise<void> {
    await this.send('close', { file });
  }

  async getCompletions(file: string, line: number, offset: number): Promise<unknown> {
    return this.send('completions', { file, line, offset });
  }

  async quickInfo(file: string, line: number, offset: number): Promise<unknown> {
    return this.send('quickinfo', { file, line, offset });
  }

  async getDiagnostics(files: string[]): Promise<void> {
    // Note: This triggers async events, doesn't return directly
    await this.send('geterr', { files, delay: 0 });
  }

  shutdown(): void {
    console.log('🛑 Shutting down tsserver');
    this.process.kill();
  }
}

// Demo usage
async function demo() {
  const ts = new TsServer(process.cwd());

  // Listen for diagnostic events
  ts.on('semanticDiag', (body: { file: string; diagnostics: unknown[] }) => {
    console.log(`\n🔍 Semantic diagnostics for ${body.file}:`);
    console.log(JSON.stringify(body.diagnostics, null, 2));
  });

  ts.on('syntaxDiag', (body: { file: string; diagnostics: unknown[] }) => {
    console.log(`\n🔍 Syntax diagnostics for ${body.file}:`);
    console.log(JSON.stringify(body.diagnostics, null, 2));
  });

  try {
    await ts.configure();
    console.log('✅ Configured');

    const testFile = '/tmp/test-file.ts';
    const testCode = `
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: "Alice",
  age: "thirty", // Type error!
};

console.log(user.nam); // Property error!
`;

    await ts.open(testFile, testCode);
    console.log('✅ File opened');

    // Request completions at a position
    const completions = await ts.getCompletions(testFile, 11, 14);
    console.log('\n📝 Completions at line 11, offset 14:');
    if (Array.isArray(completions)) {
      completions.slice(0, 5).forEach((c: { name: string; kind: string }) => {
        console.log(`  ${c.kind}: ${c.name}`);
      });
    }

    // Request quick info
    const quickInfo = await ts.quickInfo(testFile, 7, 7);
    console.log('\n💡 Quick info for "user":');
    console.log(quickInfo);

    // Request diagnostics (async - will emit events)
    await ts.getDiagnostics([testFile]);

    // Wait for diagnostic events
    await new Promise(resolve => setTimeout(resolve, 2000));

  } finally {
    ts.shutdown();
  }
}

demo().catch(console.error);
```

### 3.6 Deep Dive Content

**Source File References:**

1. **`packages/api/tsserver/tsserver.mts`** - TsServer wrapper class
   - Manages single tsserver process
   - Handles message parsing and routing
   - Provides typed methods for commands

2. **`packages/api/tsserver/messages.mts`** - Message parsing
   - `parseMessages()` - Parse stdout buffer
   - Handles Content-Length protocol
   - Manages incomplete message buffering

3. **`packages/api/tsserver/tsservers.mts`** - Instance manager
   - `TsServers` class manages multiple instances
   - One tsserver per session
   - Cleanup on session close

4. **`packages/api/tsservers.mts`** - Global singleton
   - Exports `tsservers` instance
   - Used by WebSocket handlers

**Key Implementation Details:**

```typescript
// Message format parsing (simplified from messages.mts)
function parseMessages(buffer: string): { messages: object[]; remaining: string } {
  const messages: object[] = [];

  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;

    const header = buffer.slice(0, headerEnd);
    const match = header.match(/Content-Length: (\d+)/);
    if (!match) break;

    const length = parseInt(match[1], 10);
    const start = headerEnd + 4;
    const end = start + length;

    if (buffer.length < end) break;

    messages.push(JSON.parse(buffer.slice(start, end)));
    buffer = buffer.slice(end);
  }

  return { messages, remaining: buffer };
}
```

### 3.7 Interactive Exercise

```typescript
// Exercise: Build a Type Checker CLI
//
// Challenge:
// 1. Accept a TypeScript file path as input
// 2. Start tsserver and open the file
// 3. Request and display diagnostics
// 4. Format errors nicely (line, column, message)

import { spawn } from 'child_process';
import * as fs from 'fs';

class TypeChecker {
  // TODO: Implement tsserver communication

  async check(filePath: string): Promise<void> {
    // TODO: Read file
    // TODO: Start tsserver
    // TODO: Open file
    // TODO: Request diagnostics
    // TODO: Format and display errors
  }
}

// Test your implementation:
// const checker = new TypeChecker();
// await checker.check('./my-file.ts');
```

### 3.8 Source References

| File | Purpose |
|------|---------|
| `packages/api/tsserver/tsserver.mts` | TsServer wrapper class |
| `packages/api/tsserver/messages.mts` | Message protocol parsing |
| `packages/api/tsserver/tsservers.mts` | Multi-instance manager |
| `packages/api/tsserver/utils.mts` | Diagnostic normalization |
| `packages/api/server/ws.mts` | WebSocket handlers (tsserver events) |

---

## 4. Acceptance Criteria

- [ ] Simple demo shows message format
- [ ] Advanced demo demonstrates full wrapper
- [ ] Protocol clearly explained
- [ ] Source references accurate
- [ ] Exercise is achievable

---

## 5. Implementation Notes

### File Location
```
packages/api/srcbook/examples/internals/typescript-server.src.md
```

### Validation
- Test with various TypeScript code samples
- Verify diagnostic events received correctly
