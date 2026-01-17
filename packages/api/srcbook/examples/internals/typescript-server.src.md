<!-- srcbook:{"language":"typescript"} -->

# TypeScript Server - IDE Features Under the Hood

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

**What is tsserver?**

TypeScript ships with a built-in language server called `tsserver`. This is the engine that powers IDE features like:

- **Diagnostics**: Type errors, syntax errors, suggestions
- **Autocompletion**: Code completions as you type
- **Hover information**: Type definitions and documentation
- **Go to definition**: Navigate to where symbols are defined

`tsserver` runs as a separate process and communicates via stdin/stdout using a JSON-based protocol with `Content-Length` headers (similar to the Language Server Protocol).

**Why does it matter?**

Understanding tsserver integration helps you:
- Debug type checking issues in Srcbook
- Extend IDE features or build custom tooling
- Understand how Srcbook provides real-time diagnostics
- Contribute to the TypeScript integration layer

**Prerequisites**

Before diving in, you should be familiar with:
- Cell Execution (how Srcbook runs code)
- Node.js child processes and stdio streams
- Basic TypeScript type system concepts

**Learning Objectives**

By the end of this Srcbook, you will:
1. Understand how tsserver communicates (the Content-Length protocol)
2. Know the three message types: Request, Response, Event
3. Comprehend how Srcbook manages one tsserver per session
4. Be able to send commands and receive diagnostics

## Key Concepts

### Architecture Overview

```
+-----------------------------------------------------------------+
|                  TypeScript Server Architecture                  |
|                                                                  |
|  Srcbook Server                    tsserver Process              |
|  +----------------+               +-------------------+          |
|  |                |   stdin       |                   |          |
|  |  TsServer      | ------------> |  Language         |          |
|  |  Wrapper       |               |  Server           |          |
|  |                |   stdout      |                   |          |
|  |                | <------------ |  (per session)    |          |
|  +----------------+               +-------------------+          |
|                                                                  |
|  Message Format:                                                 |
|  +----------------------------------------------------------+   |
|  | Content-Length: 85\r\n                                    |   |
|  | \r\n                                                      |   |
|  | {"seq":1,"type":"request","command":"open",...}          |   |
|  +----------------------------------------------------------+   |
|                                                                  |
|  Message Types:                                                  |
|  - Request:  Client -> Server (with seq number)                  |
|  - Response: Server -> Client (with request_seq)                 |
|  - Event:    Server -> Client (async notifications)              |
|                                                                  |
+-----------------------------------------------------------------+
```

### Core Concepts

**Concept 1: The Content-Length Protocol**

tsserver uses a simple framing protocol:
- Each message starts with `Content-Length: <bytes>\r\n\r\n`
- Followed by the JSON payload
- The length is in **bytes**, not characters (important for Unicode!)

**Concept 2: Sequence Numbers**

Every request has a unique `seq` number. The server's response includes `request_seq` to match it with the original request. This allows async responses without confusion.

**Concept 3: Three Message Types**

1. **Request**: Client sends to server (open file, get completions, etc.)
2. **Response**: Server replies to a specific request
3. **Event**: Server sends async notifications (diagnostics after `geterr`)

**Concept 4: One Server Per Session**

Srcbook maintains one tsserver process per session. This provides project isolation and resource management.

## Simple Demo: Understanding the Protocol

Let's simulate how tsserver's Content-Length protocol works. This demo shows the message format without spawning actual processes.

###### simple-tsserver.ts

```typescript
// Simple tsserver protocol demonstration
// This simulates the message format without spawning actual processes

// ============================================
// Part 1: Message Format
// ============================================

// tsserver messages use a Content-Length header format:
// Content-Length: <bytes>\r\n\r\n<json>

function formatMessage(msg: object): string {
  const json = JSON.stringify(msg);
  const byteLength = Buffer.byteLength(json, 'utf8');
  return `Content-Length: ${byteLength}\r\n\r\n${json}`;
}

// Demo: Create a request message
const openRequest = {
  seq: 1,
  type: 'request',
  command: 'open',
  arguments: {
    file: '/tmp/demo.ts',
    fileContent: 'const x: number = "hello";',
    scriptKindName: 'TS',
  },
};

console.log('Request message format:');
console.log('------------------------');
const formattedRequest = formatMessage(openRequest);
console.log(formattedRequest);
console.log('------------------------\n');

// ============================================
// Part 2: Parsing Response Messages
// ============================================

// Response messages come in the same format
// Here we simulate parsing them

interface ParseResult {
  messages: object[];
  remaining: string;
}

function parseMessages(buffer: string): ParseResult {
  const messages: object[] = [];
  let remaining = buffer;

  while (true) {
    const headerEnd = remaining.indexOf('\r\n\r\n');
    if (headerEnd === -1) break;

    const header = remaining.slice(0, headerEnd);
    const match = header.match(/Content-Length: (\d+)/);
    if (!match) break;

    const contentLength = parseInt(match[1], 10);
    const messageStart = headerEnd + 4;
    const messageEnd = messageStart + contentLength;

    // Check if we have the complete message
    if (Buffer.byteLength(remaining.slice(messageStart), 'utf8') < contentLength) {
      break;
    }

    const jsonStr = remaining.slice(messageStart, messageStart + contentLength);
    messages.push(JSON.parse(jsonStr));
    remaining = remaining.slice(messageEnd);
  }

  return { messages, remaining };
}

// Simulate a response from tsserver
const mockResponse = formatMessage({
  seq: 0,
  type: 'response',
  command: 'open',
  request_seq: 1,
  success: true,
});

console.log('Parsing a mock response:');
const parsed = parseMessages(mockResponse);
console.log('Parsed messages:', parsed.messages);
console.log('Remaining buffer:', parsed.remaining || '(empty)');
console.log();

// ============================================
// Part 3: Sequence Number Flow
// ============================================

console.log('Sequence number flow:');
console.log('---------------------');

let seq = 0;

function createRequest(command: string, args?: object): object {
  return {
    seq: ++seq,
    type: 'request',
    command,
    arguments: args,
  };
}

// Simulate a series of requests
const requests = [
  createRequest('configure', { hostInfo: 'srcbook' }),
  createRequest('open', { file: '/tmp/test.ts', fileContent: 'let x = 1;' }),
  createRequest('geterr', { files: ['/tmp/test.ts'], delay: 0 }),
];

requests.forEach((req: any) => {
  console.log(`Request seq=${req.seq}: ${req.command}`);
});

// Simulate corresponding responses
const responses = [
  { type: 'response', command: 'configure', request_seq: 1, success: true },
  { type: 'response', command: 'open', request_seq: 2, success: true },
  // Note: geterr doesn't return a response - it sends events instead!
];

console.log('\nResponses:');
responses.forEach((res) => {
  console.log(`Response to request_seq=${res.request_seq}: ${res.command} (success=${res.success})`);
});

// ============================================
// Part 4: Event Messages
// ============================================

console.log('\nEvent messages (async notifications):');
console.log('-------------------------------------');

// Diagnostics come as events, not responses
const mockDiagnosticEvent = {
  seq: 0,
  type: 'event',
  event: 'semanticDiag',
  body: {
    file: '/tmp/test.ts',
    diagnostics: [
      {
        start: { line: 1, offset: 5 },
        end: { line: 1, offset: 6 },
        text: "Type 'string' is not assignable to type 'number'.",
        code: 2322,
        category: 'error',
      },
    ],
  },
};

console.log('Mock semantic diagnostic event:');
console.log(JSON.stringify(mockDiagnosticEvent, null, 2));
```

## Explanation: Protocol Deep Dive

### The Content-Length Header

The protocol is simple but precise:

```
Content-Length: 85\r\n
\r\n
{"seq":1,"type":"request","command":"open","arguments":{...}}
```

**Critical detail**: The `Content-Length` value is the number of **bytes**, not characters. For ASCII this is the same, but Unicode characters can be multiple bytes:

```typescript
// "hello" - 5 characters, 5 bytes
Buffer.byteLength('hello', 'utf8'); // 5

// Emoji - 1 character, 4 bytes!
Buffer.byteLength('emoji', 'utf8'); // 4 bytes per emoji
```

Srcbook's actual implementation handles this in `messages.mts`:
```typescript
const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();
// Uses Uint8Array to track bytes, not string length
```

### Request/Response Matching

Every request gets a `seq` number. Responses include `request_seq`:

```typescript
// Client sends:
{ seq: 42, type: 'request', command: 'quickinfo', arguments: {...} }

// Server replies:
{ seq: 0, type: 'response', command: 'quickinfo', request_seq: 42, success: true, body: {...} }
```

This enables async communication - you can send multiple requests before receiving responses.

### Events for Async Results

Some commands like `geterr` (get errors) don't return responses. Instead, tsserver sends events:

- `syntaxDiag` - Syntax errors (immediate)
- `semanticDiag` - Type errors (may take longer)
- `suggestionDiag` - Suggestions and hints

This is why Srcbook's `TsServer` class extends `EventEmitter`.

## Advanced Demo: TsServer Wrapper Class

This demo simulates a complete TsServer wrapper similar to Srcbook's implementation, using mock data instead of actual process spawning.

###### tsserver-wrapper.ts

```typescript
// Full TsServer wrapper simulation (based on packages/api/tsserver/tsserver.mts)
// Uses mock data to demonstrate the architecture without actual tsserver

import { EventEmitter } from 'events';

// ============================================
// Type Definitions
// ============================================

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

interface DiagnosticLocation {
  line: number;
  offset: number;
}

interface Diagnostic {
  start: DiagnosticLocation;
  end: DiagnosticLocation;
  text: string;
  code: number;
  category: string;
}

interface DiagnosticEventBody {
  file: string;
  diagnostics: Diagnostic[];
}

type Message = TsServerResponse | TsServerEvent;

// ============================================
// Mock TsServer Simulator
// ============================================

class MockTsServerProcess extends EventEmitter {
  private openFiles: Map<string, string> = new Map();

  // Simulate receiving a command and generating responses
  processCommand(request: TsServerRequest): void {
    setTimeout(() => {
      switch (request.command) {
        case 'configure':
          this.sendResponse(request.seq, 'configure', true);
          break;

        case 'open':
          const args = request.arguments as { file: string; fileContent: string };
          this.openFiles.set(args.file, args.fileContent);
          this.sendResponse(request.seq, 'open', true);
          break;

        case 'close':
          const closeArgs = request.arguments as { file: string };
          this.openFiles.delete(closeArgs.file);
          this.sendResponse(request.seq, 'close', true);
          break;

        case 'geterr':
          // geterr triggers async events, no direct response
          const errArgs = request.arguments as { files: string[] };
          this.generateDiagnostics(errArgs.files);
          break;

        case 'quickinfo':
          const quickArgs = request.arguments as { file: string; line: number; offset: number };
          this.sendResponse(request.seq, 'quickinfo', true, {
            kind: 'const',
            kindModifiers: '',
            start: { line: quickArgs.line, offset: quickArgs.offset },
            end: { line: quickArgs.line, offset: quickArgs.offset + 4 },
            displayString: 'const user: User',
            documentation: 'A user object',
          });
          break;

        case 'completions':
          this.sendResponse(request.seq, 'completions', true, [
            { name: 'name', kind: 'property', sortText: '0' },
            { name: 'age', kind: 'property', sortText: '1' },
            { name: 'email', kind: 'property', sortText: '2' },
          ]);
          break;

        default:
          this.sendResponse(request.seq, request.command, false);
      }
    }, 10); // Simulate async
  }

  private sendResponse(requestSeq: number, command: string, success: boolean, body?: unknown): void {
    const response: TsServerResponse = {
      seq: 0,
      type: 'response',
      command,
      request_seq: requestSeq,
      success,
      body,
    };
    this.emit('message', response);
  }

  private sendEvent(event: string, body: unknown): void {
    const evt: TsServerEvent = {
      seq: 0,
      type: 'event',
      event,
      body,
    };
    this.emit('message', evt);
  }

  private generateDiagnostics(files: string[]): void {
    // Simulate syntax check (fast)
    setTimeout(() => {
      for (const file of files) {
        this.sendEvent('syntaxDiag', {
          file,
          diagnostics: [], // No syntax errors in our mock
        });
      }
    }, 20);

    // Simulate semantic check (slower)
    setTimeout(() => {
      for (const file of files) {
        const content = this.openFiles.get(file) || '';
        const diagnostics = this.analyzeMockCode(file, content);
        this.sendEvent('semanticDiag', {
          file,
          diagnostics,
        });
      }
    }, 50);
  }

  private analyzeMockCode(file: string, content: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Simple mock: detect type mismatches
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      // Detect: const x: number = "string"
      if (line.match(/:\s*number\s*=\s*["']/)) {
        diagnostics.push({
          start: { line: idx + 1, offset: 1 },
          end: { line: idx + 1, offset: line.length },
          text: "Type 'string' is not assignable to type 'number'.",
          code: 2322,
          category: 'error',
        });
      }

      // Detect: age: "thirty" (string where number expected)
      if (line.match(/age:\s*["']/)) {
        const match = line.match(/age:/);
        if (match && match.index !== undefined) {
          diagnostics.push({
            start: { line: idx + 1, offset: match.index + 1 },
            end: { line: idx + 1, offset: line.length },
            text: "Type 'string' is not assignable to type 'number'.",
            code: 2322,
            category: 'error',
          });
        }
      }
    });

    return diagnostics;
  }
}

// ============================================
// TsServer Wrapper (simplified from tsserver.mts)
// ============================================

class TsServer extends EventEmitter {
  private _seq: number = 0;
  private readonly process: MockTsServerProcess;
  private readonly resolvers: Map<number, (value: unknown) => void> = new Map();

  constructor() {
    super();
    this.process = new MockTsServerProcess();

    // Handle messages from the mock process
    this.process.on('message', (msg: Message) => {
      if (msg.type === 'response') {
        this.handleResponse(msg);
      } else if (msg.type === 'event') {
        this.handleEvent(msg);
      }
    });
  }

  private get seq(): number {
    return this._seq++;
  }

  private handleResponse(response: TsServerResponse): void {
    const resolve = this.resolvers.get(response.request_seq);
    if (resolve) {
      this.resolvers.delete(response.request_seq);
      resolve(response);
    }
  }

  private handleEvent(event: TsServerEvent): void {
    this.emit(event.event, event);
  }

  private send(request: TsServerRequest): void {
    console.log(`  -> Sending: ${request.command} (seq: ${request.seq})`);
    this.process.processCommand(request);
  }

  private sendWithPromise<T>(request: TsServerRequest): Promise<T> {
    return new Promise((resolve) => {
      this.resolvers.set(request.seq, resolve as (value: unknown) => void);
      this.send(request);
    });
  }

  // Public API

  configure(): Promise<TsServerResponse> {
    return this.sendWithPromise({
      seq: this.seq,
      type: 'request',
      command: 'configure',
      arguments: { hostInfo: 'srcbook' },
    });
  }

  open(file: string, content: string): Promise<TsServerResponse> {
    return this.sendWithPromise({
      seq: this.seq,
      type: 'request',
      command: 'open',
      arguments: { file, fileContent: content, scriptKindName: 'TS' },
    });
  }

  close(file: string): Promise<TsServerResponse> {
    return this.sendWithPromise({
      seq: this.seq,
      type: 'request',
      command: 'close',
      arguments: { file },
    });
  }

  geterr(files: string[]): void {
    // Note: geterr sends events, doesn't return a response
    this.send({
      seq: this.seq,
      type: 'request',
      command: 'geterr',
      arguments: { files, delay: 0 },
    });
  }

  quickinfo(file: string, line: number, offset: number): Promise<TsServerResponse> {
    return this.sendWithPromise({
      seq: this.seq,
      type: 'request',
      command: 'quickinfo',
      arguments: { file, line, offset },
    });
  }

  completions(file: string, line: number, offset: number): Promise<TsServerResponse> {
    return this.sendWithPromise({
      seq: this.seq,
      type: 'request',
      command: 'completions',
      arguments: { file, line, offset },
    });
  }

  // Event listeners
  onSemanticDiag(callback: (event: TsServerEvent) => void): void {
    this.on('semanticDiag', callback);
  }

  onSyntaxDiag(callback: (event: TsServerEvent) => void): void {
    this.on('syntaxDiag', callback);
  }

  shutdown(): void {
    console.log('  -> Shutting down tsserver');
    this.removeAllListeners();
  }
}

// ============================================
// Demo Usage
// ============================================

async function runDemo(): Promise<void> {
  console.log('='.repeat(60));
  console.log('TsServer Wrapper Demo');
  console.log('='.repeat(60));
  console.log();

  const ts = new TsServer();

  // Listen for diagnostic events
  ts.onSyntaxDiag((event) => {
    const body = event.body as DiagnosticEventBody;
    console.log(`\n[Event] Syntax diagnostics for ${body.file}:`);
    if (body.diagnostics.length === 0) {
      console.log('  No syntax errors');
    } else {
      body.diagnostics.forEach((d) => {
        console.log(`  Line ${d.start.line}: ${d.text}`);
      });
    }
  });

  ts.onSemanticDiag((event) => {
    const body = event.body as DiagnosticEventBody;
    console.log(`\n[Event] Semantic diagnostics for ${body.file}:`);
    if (body.diagnostics.length === 0) {
      console.log('  No type errors');
    } else {
      body.diagnostics.forEach((d) => {
        console.log(`  Line ${d.start.line}: [TS${d.code}] ${d.text}`);
      });
    }
  });

  // Configure tsserver
  console.log('Step 1: Configure');
  await ts.configure();
  console.log('  <- Configured successfully\n');

  // Open a file with type errors
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

console.log(user.name);
`.trim();

  console.log('Step 2: Open file');
  console.log('  File:', testFile);
  console.log('  Code with intentional error:');
  console.log('  ---');
  testCode.split('\n').forEach((line, i) => console.log(`  ${i + 1}: ${line}`));
  console.log('  ---');
  await ts.open(testFile, testCode);
  console.log('  <- File opened\n');

  // Request quick info
  console.log('Step 3: Get quick info (hover) for "user" at line 7');
  const quickInfo = await ts.quickinfo(testFile, 7, 7);
  console.log('  <- Quick info:', (quickInfo.body as any)?.displayString);
  console.log();

  // Request completions
  console.log('Step 4: Get completions after "user."');
  const completions = await ts.completions(testFile, 12, 14);
  const compBody = completions.body as Array<{ name: string; kind: string }>;
  console.log('  <- Completions:');
  compBody.forEach((c) => console.log(`     - ${c.name} (${c.kind})`));
  console.log();

  // Request diagnostics
  console.log('Step 5: Request diagnostics (triggers async events)');
  ts.geterr([testFile]);

  // Wait for events
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Cleanup
  console.log('\nStep 6: Cleanup');
  ts.shutdown();
  console.log('\nDemo complete!');
}

runDemo();
```

## Deep Dive: Srcbook's Implementation

Now let's examine how Srcbook actually implements the TypeScript server integration.

### Source File Overview

| File | Purpose |
|------|---------|
| `packages/api/tsserver/tsserver.mts` | TsServer wrapper class |
| `packages/api/tsserver/messages.mts` | Content-Length message parsing |
| `packages/api/tsserver/tsservers.mts` | Multi-instance manager |
| `packages/api/tsserver/utils.mts` | Diagnostic normalization |

### tsserver.mts - The Wrapper Class

The actual `TsServer` class wraps a child process:

```typescript
// Key aspects from packages/api/tsserver/tsserver.mts

export class TsServer extends EventEmitter {
  private _seq: number = 0;
  private buffered: Buffer = Buffer.from('');
  private readonly process: ChildProcess;
  private readonly resolvers: Record<number, (value: any) => void> = {};

  constructor(process: ChildProcess) {
    super();
    this.process = process;
    this.process.stdout?.on('data', (chunk) => {
      // Parse messages from the chunk
      const { messages, buffered } = parse(chunk, this.buffered);
      this.buffered = buffered;

      for (const message of messages) {
        if (message.type === 'response') {
          this.handleResponse(message);
        } else if (message.type === 'event') {
          this.handleEvent(message);
        }
      }
    });
  }

  // Commands send JSON directly to stdin
  private send(request: tsserver.protocol.Request) {
    this.process.stdin?.write(JSON.stringify(request) + '\n');
  }
}
```

### messages.mts - Byte-Level Parsing

The message parser handles the Content-Length protocol correctly:

```typescript
// Simplified from packages/api/tsserver/messages.mts

export function parse(chunk: Buffer, buffered: Buffer) {
  let buffer = new Uint8Array(Buffer.concat([buffered, chunk]));
  const messages = [];

  while (true) {
    const content = getContentByteLength(buffer);
    if (content === null) break;

    const { start, byteLength } = content;
    const end = start + byteLength;

    if (end > buffer.byteLength) break;

    const message = DECODER.decode(buffer.slice(start, end));
    messages.push(JSON.parse(message));
    buffer = buffer.slice(end);
  }

  return { messages, buffered: Buffer.from(buffer) };
}
```

**Key insight**: Using `Uint8Array` and `Buffer.byteLength` ensures correct handling of multi-byte Unicode characters.

### tsservers.mts - Instance Manager

Srcbook manages one tsserver per session:

```typescript
// From packages/api/tsserver/tsservers.mts

export class TsServers {
  private servers: Record<string, TsServer> = {};

  create(id: string, options: { cwd: string }) {
    const child = spawn('npx', ['tsserver'], { cwd: options.cwd });
    const server = new TsServer(child);

    this.set(id, server);

    child.on('exit', () => {
      this.del(id);  // Auto-cleanup on exit
    });

    return server;
  }

  shutdown(id: string) {
    return this.get(id).shutdown();
  }
}
```

### utils.mts - Diagnostic Normalization

Different tsserver versions return diagnostics in different formats:

```typescript
// From packages/api/tsserver/utils.mts

export function normalizeDiagnostic(diagnostic): TsServerDiagnosticType {
  // Handle two different diagnostic formats
  if (isDiagnosticWithLinePosition(diagnostic)) {
    return {
      code: diagnostic.code,
      category: diagnostic.category,
      text: diagnostic.message,
      start: diagnostic.startLocation,
      end: diagnostic.endLocation,
    };
  } else {
    return {
      code: diagnostic.code || 1000,
      category: diagnostic.category,
      text: diagnostic.text,
      start: diagnostic.start,
      end: diagnostic.end,
    };
  }
}
```

### Request/Response Flow

```
                    Diagnostic Request Flow

  +----------+      +----------+      +-----------+
  |  Editor  | ---> |  Server  | ---> |  tsserver |
  |  (Cell)  |      |  (ws.mts)|      |  process  |
  +----------+      +----------+      +-----------+
       |                 |                  |
       | WebSocket       |     geterr       |
       | "cell:updated"  | ---------------> |
       |                 |                  |
       |                 | <--------------- |
       |                 |  syntaxDiag      |
       |                 |  (event)         |
       |                 |                  |
       |                 | <--------------- |
       | WebSocket       |  semanticDiag    |
       | "diagnostics"   |  (event)         |
       | <-------------- |                  |
       |                 |                  |
  +----------+      +----------+      +-----------+
```

## Interactive Exercise: Build a Type Checker CLI

Now it's your turn! Build a simple type checker that simulates the tsserver workflow.

###### exercise.ts

```typescript
// Exercise: Build a Type Checker CLI
//
// Your challenge is to implement a TypeChecker class that:
// 1. Accepts TypeScript code as input
// 2. Simulates opening it in tsserver
// 3. Analyzes for common type errors
// 4. Returns formatted diagnostic messages
//
// This simulates what happens when you edit a code cell in Srcbook!

interface DiagnosticLocation {
  line: number;
  offset: number;
}

interface Diagnostic {
  start: DiagnosticLocation;
  end: DiagnosticLocation;
  text: string;
  code: number;
  category: 'error' | 'warning' | 'suggestion';
}

interface TypeCheckResult {
  file: string;
  diagnostics: Diagnostic[];
  hasErrors: boolean;
}

class TypeChecker {
  private seq = 0;

  // Simulate the tsserver "open" command
  private simulateOpen(file: string, content: string): void {
    this.seq++;
    console.log(`[seq=${this.seq}] Opening file: ${file}`);
  }

  // Simulate the tsserver "geterr" command
  private simulateGetErr(file: string, content: string): Diagnostic[] {
    this.seq++;
    console.log(`[seq=${this.seq}] Requesting diagnostics for: ${file}`);

    // Analyze the code for common type errors
    return this.analyzeCode(content);
  }

  // Simple static analysis to find common type errors
  private analyzeCode(content: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const lines = content.split('\n');

    lines.forEach((line, lineIndex) => {
      const lineNum = lineIndex + 1;

      // Pattern 1: Type mismatch in variable declaration
      // const x: number = "string"
      const typeMismatch = line.match(/:\s*number\s*=\s*["']/);
      if (typeMismatch) {
        diagnostics.push({
          start: { line: lineNum, offset: typeMismatch.index! + 1 },
          end: { line: lineNum, offset: line.length },
          text: "Type 'string' is not assignable to type 'number'.",
          code: 2322,
          category: 'error',
        });
      }

      // Pattern 2: String assigned to number property
      // age: "thirty"
      const ageString = line.match(/age:\s*["'][^"']*["']/);
      if (ageString) {
        diagnostics.push({
          start: { line: lineNum, offset: ageString.index! + 1 },
          end: { line: lineNum, offset: ageString.index! + ageString[0].length + 1 },
          text: "Type 'string' is not assignable to type 'number'.",
          code: 2322,
          category: 'error',
        });
      }

      // Pattern 3: Accessing non-existent property
      // user.nonExistent
      const propAccess = line.match(/\.([a-z]+)/gi);
      if (propAccess) {
        propAccess.forEach((match) => {
          const prop = match.slice(1);
          // Check for common typos
          if (['nam', 'nme', 'nmae'].includes(prop)) {
            const idx = line.indexOf(match);
            diagnostics.push({
              start: { line: lineNum, offset: idx + 2 },
              end: { line: lineNum, offset: idx + match.length + 1 },
              text: `Property '${prop}' does not exist on type. Did you mean 'name'?`,
              code: 2551,
              category: 'error',
            });
          }
        });
      }

      // Pattern 4: Missing required property
      // const user: User = { name: "Alice" } (missing age)
      if (line.match(/:\s*User\s*=/) && !content.includes('age:')) {
        diagnostics.push({
          start: { line: lineNum, offset: 1 },
          end: { line: lineNum, offset: line.length },
          text: "Property 'age' is missing in type '{ name: string; }' but required in type 'User'.",
          code: 2741,
          category: 'error',
        });
      }
    });

    return diagnostics;
  }

  // Main API: Check a file
  async check(fileName: string, content: string): Promise<TypeCheckResult> {
    console.log('\n' + '='.repeat(50));
    console.log('Type Checker - Simulating tsserver workflow');
    console.log('='.repeat(50) + '\n');

    // Step 1: Open the file
    this.simulateOpen(fileName, content);

    // Step 2: Request diagnostics
    const diagnostics = this.simulateGetErr(fileName, content);

    // Step 3: Format results
    const result: TypeCheckResult = {
      file: fileName,
      diagnostics,
      hasErrors: diagnostics.some((d) => d.category === 'error'),
    };

    return result;
  }

  // Format diagnostics nicely
  formatDiagnostics(result: TypeCheckResult, sourceCode: string): string {
    const lines = sourceCode.split('\n');
    let output = '';

    if (result.diagnostics.length === 0) {
      return `\n  No errors found in ${result.file}\n`;
    }

    output += `\n  Found ${result.diagnostics.length} issue(s) in ${result.file}:\n\n`;

    result.diagnostics.forEach((diag, idx) => {
      const lineContent = lines[diag.start.line - 1] || '';

      output += `  ${idx + 1}. [TS${diag.code}] ${diag.text}\n`;
      output += `     at line ${diag.start.line}:\n`;
      output += `     ${diag.start.line} | ${lineContent}\n`;

      // Underline the error
      const padding = ' '.repeat(String(diag.start.line).length + 3);
      const underline = ' '.repeat(diag.start.offset - 1) + '^'.repeat(Math.min(diag.end.offset - diag.start.offset, lineContent.length - diag.start.offset + 1));
      output += `     ${padding}${underline}\n\n`;
    });

    return output;
  }
}

// ============================================
// Test the Type Checker
// ============================================

async function testTypeChecker(): Promise<void> {
  const checker = new TypeChecker();

  // Test code with multiple errors
  const testCode = `
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: "Alice",
  age: "thirty", // Error: string to number
};

const count: number = "five"; // Error: type mismatch

console.log(user.nam); // Error: typo in property name
`.trim();

  console.log('Source code to check:');
  console.log('-'.repeat(40));
  testCode.split('\n').forEach((line, i) => {
    console.log(`${String(i + 1).padStart(2)} | ${line}`);
  });
  console.log('-'.repeat(40));

  const result = await checker.check('/tmp/test.ts', testCode);
  const formatted = checker.formatDiagnostics(result, testCode);

  console.log(formatted);

  // Summary
  console.log('='.repeat(50));
  console.log(`Total errors: ${result.diagnostics.length}`);
  console.log(`Status: ${result.hasErrors ? 'FAIL' : 'PASS'}`);
  console.log('='.repeat(50));

  // Now test with clean code
  console.log('\n\nTesting clean code:');
  const cleanCode = `
interface User {
  name: string;
  age: number;
}

const user: User = {
  name: "Alice",
  age: 30,
};

console.log(user.name);
`.trim();

  const cleanResult = await checker.check('/tmp/clean.ts', cleanCode);
  console.log(checker.formatDiagnostics(cleanResult, cleanCode));
}

testTypeChecker();
```

## Source Code References

Want to explore the actual implementation? Here are the key source files:

### Primary Files

| File | Purpose |
|------|---------|
| [`packages/api/tsserver/tsserver.mts`](../../../tsserver/tsserver.mts) | TsServer wrapper class - handles communication with tsserver process |
| [`packages/api/tsserver/messages.mts`](../../../tsserver/messages.mts) | Content-Length protocol parsing with byte-level accuracy |
| [`packages/api/tsserver/tsservers.mts`](../../../tsserver/tsservers.mts) | Multi-instance manager - one tsserver per session |
| [`packages/api/tsserver/utils.mts`](../../../tsserver/utils.mts) | Diagnostic normalization across TypeScript versions |

### Supporting Files

| File | Purpose |
|------|---------|
| [`packages/api/tsservers.mts`](../../../tsservers.mts) | Global singleton export for the TsServers instance |
| [`packages/api/server/ws.mts`](../../../server/ws.mts) | WebSocket handlers for tsserver events |
| [`packages/shared/src/types/index.mts`](../../../../shared/src/types/index.mts) | Shared type definitions including diagnostics |

### Key Functions to Study

**In `tsserver.mts`:**
- `constructor()` - Sets up stdout parsing and message routing
- `send()` - Writes JSON requests to stdin
- `sendWithResponsePromise()` - Request/response matching with promises
- `geterr()` - Triggers async diagnostic events

**In `messages.mts`:**
- `parse()` - Parse Content-Length framed messages from buffer
- `getContentByteLength()` - Extract byte length from header

**In `tsservers.mts`:**
- `create()` - Spawn new tsserver process
- `shutdown()` - Clean termination with SIGTERM
- `get()/set()/del()` - Instance lifecycle management

## Next Steps

### Related Topics

Now that you understand TypeScript server integration, explore:

- **Diagnostics Display**: How errors appear in the Srcbook UI
- **Autocompletion**: Real-time suggestions as you type
- **Cell Execution**: How code actually runs after type checking
- **WebSocket Protocol**: Real-time communication architecture

### Further Reading

- [TypeScript Server Protocol](https://github.com/microsoft/TypeScript/blob/main/src/server/protocol.ts) - Official (undocumented) protocol
- [TypeScript Wiki - Standalone Server](https://github.com/microsoft/TypeScript/wiki/Standalone-Server-(tsserver))
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) - The standard LSP is similar
- [Node.js Child Process](https://nodejs.org/api/child_process.html) - Process spawning and IPC

### Contributing

Found a way to improve the TypeScript integration? Here's how to contribute:

1. The TsServer wrapper is in `packages/api/tsserver/tsserver.mts`
2. Message parsing is in `packages/api/tsserver/messages.mts`
3. Instance management is in `packages/api/tsserver/tsservers.mts`
4. Tests would go in `packages/api/test/tsserver/`

Consider improvements like:
- Better error recovery
- Additional LSP commands
- Performance optimizations
- More diagnostic information

## Summary

In this Srcbook, we covered:

- **What is tsserver**: TypeScript's built-in language server for IDE features
- **Content-Length Protocol**: How messages are framed (headers + JSON body)
- **Message Types**: Request (client->server), Response (server->client), Event (async)
- **Sequence Numbers**: How requests and responses are matched
- **Instance Management**: One tsserver per Srcbook session
- **Diagnostic Flow**: geterr triggers async syntax/semantic events

Key takeaways:

1. **tsserver uses Content-Length framing** - Parse bytes, not string length
2. **Events are async** - `geterr` doesn't return directly; listen for events
3. **Sequence numbers enable async communication** - Multiple in-flight requests
4. **Srcbook manages one server per session** - Isolation and cleanup

You now understand how Srcbook provides real-time TypeScript diagnostics. This knowledge is essential for debugging type checking issues, extending IDE features, or contributing to the TypeScript integration layer.
