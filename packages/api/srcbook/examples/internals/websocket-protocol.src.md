<!-- srcbook:{"language":"typescript"} -->

# WebSocket Protocol - Real-Time Communication in Srcbook

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "ws": "^8.17.0",
    "@types/node": "latest",
    "@types/ws": "^8.5.12",
    "tsx": "latest",
    "typescript": "latest",
    "zod": "^3.23.8"
  }
}
```

## Introduction

**What is Srcbook's WebSocket Protocol?**

Srcbook uses WebSockets to enable real-time, bidirectional communication between the browser (React frontend) and the Node.js backend. This allows instant updates when cells execute, diagnostics arrive, or AI generates code.

**Why does it matter?**

Understanding the WebSocket protocol is crucial for:
- Contributing to Srcbook's real-time features
- Debugging communication issues
- Building extensions or integrations
- Understanding how notebook state stays synchronized

**Prerequisites**

Before diving into this Srcbook, you should be familiar with:
- Basic WebSocket concepts
- TypeScript basics
- Srcbook's session and cell concepts (see the "Cell Types and Structure" Srcbook)

**Learning Objectives**

By the end of this Srcbook, you will understand:
1. The `[topic, event, payload]` message format
2. Topic naming patterns (`session:<id>`, `app:<id>`, `mcp:<scope>`)
3. The subscription model for real-time updates
4. How to build WebSocket clients for Srcbook

## Key Concepts

### Architecture Overview

Srcbook's WebSocket architecture connects browsers to the server through a channel-based system:

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Srcbook WebSocket Architecture                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────┐         WebSocket          ┌────────────────┐   │
│  │    Browser     │◄──────────────────────────►│    Server      │   │
│  │   (React UI)   │   [topic, event, payload]  │   (Node.js)    │   │
│  └────────────────┘                            └────────────────┘   │
│         │                                              │            │
│         │ subscribes to                                │ broadcasts │
│         ▼                                              ▼            │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                       Channels                                  │ │
│  │  ┌─────────────────┐  ┌────────────────┐  ┌─────────────────┐ │ │
│  │  │ session:<id>    │  │ app:<id>       │  │ mcp:<scope>     │ │ │
│  │  │ - cell:exec     │  │ - file:created │  │ - server:status │ │ │
│  │  │ - cell:updated  │  │ - file:updated │  │ - tool:invoke   │ │ │
│  │  │ - cell:output   │  │ - preview:log  │  │ - tool:result   │ │ │
│  │  └─────────────────┘  └────────────────┘  └─────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Core Concepts

**Concept 1: Message Format**

Every WebSocket message in Srcbook is a JSON array with exactly three elements:

```typescript
[topic: string, event: string, payload: Record<string, any>]
```

This tuple format is validated by the `WebSocketMessageSchema`:

```typescript
const WebSocketMessageSchema = z.tuple([
  z.string(), // topic: "session:abc123"
  z.string(), // event: "cell:updated"
  z.record(z.string(), z.any()), // payload: {cell: {...}}
]);
```

**Concept 2: Topics**

Topics identify what the message is about using a hierarchical naming pattern:

| Topic Pattern | Description | Example |
|--------------|-------------|---------|
| `session:<sessionId>` | Notebook session events | `session:abc123` |
| `app:<appId>` | App file and preview events | `app:xyz789` |
| `mcp:server` | MCP provider events | `mcp:server` |
| `mcp:client` | MCP client operations | `mcp:client` |
| `mcp:registry` | MCP capability registry | `mcp:registry` |

**Concept 3: Channels**

Channels are server-side abstractions that:
- Define valid topics with dynamic parameters (e.g., `session:<sessionId>`)
- Register event handlers with Zod schema validation
- Manage subscription lifecycle (subscribe/unsubscribe)
- Broadcast events to subscribed clients

## Simple Demo: Message Structure and Encoding

Let's understand how Srcbook encodes WebSocket messages. This demo doesn't require a running server - it shows the message format.

###### message-format.ts

```typescript
// This demonstrates Srcbook's WebSocket message format
// All messages follow the [topic, event, payload] tuple pattern

import { z } from 'zod';

// The core message schema from packages/shared/src/schemas/websockets.mts
const WebSocketMessageSchema = z.tuple([
  z.string(), // topic
  z.string(), // event
  z.record(z.string(), z.any()), // payload
]);

// Helper to create and encode messages
function createMessage(topic: string, event: string, payload: Record<string, any>): string {
  const message = [topic, event, payload];
  return JSON.stringify(message);
}

// Helper to decode and validate messages
function decodeMessage(raw: string) {
  const parsed = JSON.parse(raw);
  const [topic, event, payload] = WebSocketMessageSchema.parse(parsed);
  return { topic, event, payload };
}

// Example 1: Subscribe to a session
console.log('=== Message Examples ===\n');

const subscribeMsg = createMessage('session:abc123', 'subscribe', { id: 'client-001' });
console.log('Subscribe message:');
console.log(subscribeMsg);
console.log('Decoded:', decodeMessage(subscribeMsg));

// Example 2: Cell execution request
console.log('\n--- Cell Execution ---');
const execMsg = createMessage('session:abc123', 'cell:exec', { cellId: 'cell-xyz' });
console.log('Cell exec message:');
console.log(execMsg);
console.log('Decoded:', decodeMessage(execMsg));

// Example 3: Cell output (stdout)
console.log('\n--- Cell Output ---');
const outputMsg = createMessage('session:abc123', 'cell:output', {
  cellId: 'cell-xyz',
  output: { type: 'stdout', data: 'Hello, World!\n' }
});
console.log('Cell output message:');
console.log(outputMsg);
console.log('Decoded:', decodeMessage(outputMsg));

// Example 4: Cell updated
console.log('\n--- Cell Updated ---');
const updatedMsg = createMessage('session:abc123', 'cell:updated', {
  cell: {
    id: 'cell-xyz',
    type: 'code',
    source: 'console.log("Hello!");',
    language: 'typescript',
    filename: 'hello.ts',
    status: 'idle'
  }
});
console.log('Cell updated message:');
console.log(updatedMsg);
```

## Explanation: Step-by-Step Protocol Breakdown

Let's walk through exactly how the WebSocket protocol works:

### Step 1: Connection Establishment

The client opens a WebSocket connection to `/websocket`:

```typescript
const ws = new WebSocket('ws://localhost:2150/websocket');
```

The server validates the URL path in `ws-client.mts`:
```typescript
const match = url.pathname.match(/^\/websocket\/?$/);
if (match === null) {
  socket.close(); // Reject invalid paths
  return;
}
```

### Step 2: Subscription

Before receiving events, clients must subscribe to a topic:

```
Client                                 Server
  │                                       │
  │ ───["session:abc", "subscribe", {}]──► │
  │                                       │
  │ ◄──["session:abc", "subscribed", {}]── │
  │                                       │
```

The server tracks subscriptions per connection:
```typescript
if (event === 'subscribe') {
  conn.subscriptions.push(topic);
  conn.reply(topic, 'subscribed', { id: payload.id });
  channel.onJoinCallback(payload, context, conn);
  return;
}
```

### Step 3: Event Flow

Once subscribed, events flow bidirectionally:

**Client to Server (e.g., cell execution):**
```
Client                                 Server
  │                                       │
  │ ──["session:abc", "cell:exec",        │
  │    {cellId: "xyz"}]─────────────────► │
  │                                       │
  │                  [Server validates payload]
  │                  [Server executes cell]
  │                                       │
```

**Server to Client (e.g., cell output):**
```
Client                                 Server
  │                                       │
  │ ◄──["session:abc", "cell:output",     │
  │    {cellId: "xyz", output: {...}}]─── │
  │                                       │
```

### Step 4: Broadcast to All Subscribers

When an event occurs, the server broadcasts to ALL subscribed clients:

```typescript
broadcast(topic: string, event: string, payload: Record<string, any>) {
  for (const conn of this.connections) {
    if (conn.subscriptions.includes(topic)) {
      this.send(conn, topic, event, payload);
    }
  }
}
```

**Key Takeaways:**

- Messages are always JSON arrays: `[topic, event, payload]`
- Clients must subscribe before receiving topic events
- Server broadcasts to all subscribers (not just the sender)
- Each event type has a Zod schema for validation

## Advanced Demo: Channel Subscription Simulation

Now let's simulate how channels work without needing a live server.

###### channel-simulation.ts

```typescript
// This simulates Srcbook's Channel system for educational purposes
// Based on packages/api/server/ws-client.mts

import { z } from 'zod';

// Simulated connection
type Connection = {
  id: string;
  subscriptions: string[];
  inbox: Array<{ topic: string; event: string; payload: any }>;
};

// Topic part can be static or dynamic (parameter)
type TopicPart =
  | { dynamic: false; segment: string }
  | { dynamic: true; parameter: string };

// Channel class (simplified from ws-client.mts)
class Channel {
  readonly topic: string;
  private readonly parts: TopicPart[];
  readonly events: Record<string, { schema: z.ZodTypeAny; handler: Function }> = {};

  constructor(topic: string) {
    this.topic = topic;
    this.parts = this.splitIntoParts(topic);
  }

  private splitIntoParts(topic: string): TopicPart[] {
    const parts: TopicPart[] = [];

    for (const part of topic.split(':')) {
      // Check for dynamic parameter like <sessionId>
      const parameter = part.match(/^<([a-zA-Z_]+[a-zA-Z0-9_]*)>$/);

      if (parameter !== null) {
        parts.push({ dynamic: true, parameter: parameter[1] as string });
      } else {
        parts.push({ dynamic: false, segment: part });
      }
    }

    return parts;
  }

  // Match a concrete topic against our pattern
  match(topic: string): { params: Record<string, string> } | null {
    const parts = topic.split(':');

    if (parts.length !== this.parts.length) return null;

    const params: Record<string, string> = {};

    for (let i = 0; i < this.parts.length; i++) {
      const thisPart = this.parts[i]!;

      if (thisPart.dynamic) {
        params[thisPart.parameter] = parts[i]!;
      } else if (thisPart.segment !== parts[i]) {
        return null;
      }
    }

    return { params };
  }

  // Register an event handler
  on(event: string, schema: z.ZodTypeAny, handler: Function) {
    this.events[event] = { schema, handler };
    return this;
  }
}

// WebSocket Server simulation
class MockWebSocketServer {
  private channels: Channel[] = [];
  private connections: Connection[] = [];

  channel(topic: string): Channel {
    const channel = new Channel(topic);
    this.channels.push(channel);
    return channel;
  }

  addConnection(id: string): Connection {
    const conn: Connection = { id, subscriptions: [], inbox: [] };
    this.connections.push(conn);
    return conn;
  }

  handleMessage(conn: Connection, raw: string) {
    const [topic, event, payload] = JSON.parse(raw);
    console.log(`\n[${conn.id}] Received: ${event} on ${topic}`);

    // Find matching channel
    for (const channel of this.channels) {
      const match = channel.match(topic);
      if (match) {
        console.log(`  Matched channel: ${channel.topic}`);
        console.log(`  Params:`, match.params);

        if (event === 'subscribe') {
          conn.subscriptions.push(topic);
          this.send(conn, topic, 'subscribed', { id: payload.id });
          return;
        }

        const handler = channel.events[event];
        if (handler) {
          const result = handler.schema.safeParse(payload);
          if (result.success) {
            console.log(`  Payload valid, calling handler...`);
            handler.handler(result.data, { topic, params: match.params }, conn);
          } else {
            console.log(`  Invalid payload:`, result.error.errors);
          }
        }
        return;
      }
    }

    console.log(`  No matching channel found`);
  }

  send(conn: Connection, topic: string, event: string, payload: any) {
    conn.inbox.push({ topic, event, payload });
    console.log(`  -> Sent to ${conn.id}: [${topic}, ${event}]`);
  }

  broadcast(topic: string, event: string, payload: any) {
    for (const conn of this.connections) {
      if (conn.subscriptions.includes(topic)) {
        this.send(conn, topic, event, payload);
      }
    }
  }
}

// Demo: Set up channels and simulate messages
console.log('=== Channel Simulation Demo ===\n');

const wss = new MockWebSocketServer();

// Register session channel (like in ws.mts)
const CellExecSchema = z.object({ cellId: z.string() });

wss.channel('session:<sessionId>')
  .on('cell:exec', CellExecSchema, (payload: any, context: any, conn: any) => {
    console.log(`  Executing cell ${payload.cellId} in session ${context.params.sessionId}`);
    // Simulate execution output
    wss.broadcast(context.topic, 'cell:output', {
      cellId: payload.cellId,
      output: { type: 'stdout', data: 'Hello from simulation!' }
    });
  });

// Create mock connections
const client1 = wss.addConnection('client-1');
const client2 = wss.addConnection('client-2');

// Client 1 subscribes
wss.handleMessage(client1, JSON.stringify(['session:my-session', 'subscribe', { id: '1' }]));

// Client 2 also subscribes to same session
wss.handleMessage(client2, JSON.stringify(['session:my-session', 'subscribe', { id: '2' }]));

// Client 1 executes a cell - broadcast goes to both
wss.handleMessage(client1, JSON.stringify(['session:my-session', 'cell:exec', { cellId: 'cell-123' }]));

// Show inbox
console.log('\n=== Client Inboxes ===');
console.log('Client 1 inbox:', client1.inbox.length, 'messages');
client1.inbox.forEach((m, i) => console.log(`  ${i + 1}. [${m.topic}] ${m.event}`));
console.log('Client 2 inbox:', client2.inbox.length, 'messages');
client2.inbox.forEach((m, i) => console.log(`  ${i + 1}. [${m.topic}] ${m.event}`));
```

## Deep Dive: Implementation Details

### How Srcbook Implements WebSockets

The WebSocket system spans several files:

**Server-Side:**
- **`packages/api/server/ws.mts`**: Main entry point, registers all channels and event handlers
- **`packages/api/server/ws-client.mts`**: `WebSocketServer` class with `Channel` abstraction
- **`packages/api/server/channels/app.mts`**: App-specific WebSocket events
- **`packages/api/server/channels/mcp.mts`**: MCP integration events

**Shared Schemas:**
- **`packages/shared/src/schemas/websockets.mts`**: Zod schemas for all message payloads
- **`packages/shared/src/schemas/mcp-websockets.mts`**: MCP-specific message schemas

### All WebSocket Event Types

#### Session Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `subscribe` | Client->Server | `{id: string}` | Subscribe to topic |
| `unsubscribe` | Client->Server | `{}` | Unsubscribe from topic |
| `cell:exec` | Client->Server | `{cellId: string}` | Execute a cell |
| `cell:stop` | Client->Server | `{cellId: string}` | Stop cell execution |
| `cell:create` | Client->Server | `{index, cell}` | Create new cell |
| `cell:update` | Client->Server | `{cellId, updates}` | Update cell content |
| `cell:rename` | Client->Server | `{cellId, filename}` | Rename code cell |
| `cell:delete` | Client->Server | `{cellId}` | Delete a cell |
| `cell:format` | Client->Server | `{cellId}` | Format code cell |
| `cell:updated` | Server->Client | `{cell: Cell}` | Cell content changed |
| `cell:output` | Server->Client | `{cellId, output}` | Execution output (stdout/stderr) |
| `cell:error` | Server->Client | `{cellId, errors}` | Execution or validation error |
| `cell:formatted` | Server->Client | `{cellId, cell}` | Code formatting complete |
| `ai:generate` | Client->Server | `{cellId, prompt}` | Request AI code generation |
| `ai:generated` | Server->Client | `{cellId, output}` | AI generation result |
| `deps:install` | Client->Server | `{packages?}` | Install npm packages |
| `deps:validate` | Client->Server | `{}` | Check for missing deps |
| `deps:validate:response` | Server->Client | `{packages?}` | Missing packages list |
| `tsserver:start` | Client->Server | `{}` | Start TypeScript server |
| `tsserver:stop` | Client->Server | `{}` | Stop TypeScript server |
| `tsserver:cell:diagnostics` | Server->Client | `{cellId, diagnostics}` | TypeScript errors/warnings |
| `tsserver:cell:suggestions` | Server->Client | `{cellId, diagnostics}` | TypeScript suggestions |
| `tsconfig.json:update` | Client->Server | `{source}` | Update tsconfig |
| `tsconfig.json:updated` | Server->Client | `{source}` | tsconfig changed |

#### App Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `file:created` | Server->Client | `{file}` | New file in app |
| `file:updated` | Bidirectional | `{file}` | File content changed |
| `file:renamed` | Server->Client | `{oldPath, newPath}` | File path changed |
| `file:deleted` | Server->Client | `{path}` | File removed |
| `preview:start` | Client->Server | `{}` | Start Vite preview |
| `preview:stop` | Client->Server | `{}` | Stop Vite preview |
| `preview:status` | Server->Client | `{url, status}` | Preview server status |
| `preview:log` | Server->Client | `{log}` | Vite server log output |
| `deps:install:status` | Server->Client | `{status, code?}` | npm install progress |
| `deps:install:log` | Server->Client | `{log}` | npm install output |

#### MCP Events (New in 2026)

**mcp:server** - Srcbook as MCP provider:

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `client:connected` | Server->Client | `{clientId, clientName}` | External client connected |
| `client:disconnected` | Server->Client | `{clientId, reason?}` | External client disconnected |
| `tool:invoked` | Server->Client | `{clientId, tool, input}` | Tool being invoked |
| `tool:completed` | Server->Client | `{clientId, tool, result}` | Tool invocation done |
| `approval:request` | Server->Client | `{id, operation, ...}` | Approval needed |
| `approval:respond` | Client->Server | `{id, approved, remember}` | Approval response |

**mcp:client** - Srcbook consuming external MCP servers:

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `server:connect` | Client->Server | `{serverId}` | Connect to MCP server |
| `server:disconnect` | Client->Server | `{serverId}` | Disconnect from MCP server |
| `server:status` | Server->Client | `{serverId, status}` | Connection status update |
| `tool:invoke` | Client->Server | `{serverId, tool, args}` | Invoke tool on server |
| `tool:result` | Server->Client | `{requestId, result}` | Tool invocation result |
| `tool:error` | Server->Client | `{requestId, error}` | Tool invocation failed |
| `resource:read` | Client->Server | `{serverId, uri}` | Read resource |
| `resource:content` | Server->Client | `{requestId, content}` | Resource content |

**mcp:registry** - Capability discovery:

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `servers:list` | Client->Server | `{}` | Request server list |
| `servers:changed` | Server->Client | `{servers}` | Server list update |
| `tools:list` | Client->Server | `{}` | Request tools list |
| `tools:changed` | Server->Client | `{tools}` | Available tools update |
| `resources:list` | Client->Server | `{}` | Request resources list |
| `resources:changed` | Server->Client | `{resources}` | Available resources update |

### Schema Validation Example

###### schema-validation.ts

```typescript
// Demonstrate Zod schema validation for WebSocket messages
// Based on packages/shared/src/schemas/websockets.mts

import { z } from 'zod';

// Core message schema
const WebSocketMessageSchema = z.tuple([
  z.string(), // topic
  z.string(), // event
  z.record(z.string(), z.any()), // payload
]);

// Output payload schema (from websockets.mts)
const CellOutputPayloadSchema = z.object({
  cellId: z.string(),
  output: z.object({
    type: z.enum(['stdout', 'stderr']),
    data: z.string(),
  }),
});

// Cell update payload schema
const CellUpdatePayloadSchema = z.object({
  cellId: z.string(),
  updates: z.object({
    source: z.string().optional(),
    text: z.string().optional(),
  }),
});

// Validate incoming messages
function validateAndRouteMessage(raw: string) {
  console.log('Raw message:', raw);

  // Step 1: Parse as JSON array
  const parsed = JSON.parse(raw);

  // Step 2: Validate message structure
  const [topic, event, payload] = WebSocketMessageSchema.parse(parsed);
  console.log('  Topic:', topic);
  console.log('  Event:', event);

  // Step 3: Validate event-specific payload
  switch (event) {
    case 'cell:output': {
      const validated = CellOutputPayloadSchema.parse(payload);
      console.log('  Validated cell:output payload:');
      console.log('    Cell ID:', validated.cellId);
      console.log('    Output type:', validated.output.type);
      console.log('    Data:', validated.output.data);
      return { topic, event, payload: validated };
    }
    case 'cell:update': {
      const validated = CellUpdatePayloadSchema.parse(payload);
      console.log('  Validated cell:update payload:');
      console.log('    Cell ID:', validated.cellId);
      console.log('    Updates:', validated.updates);
      return { topic, event, payload: validated };
    }
    default:
      console.log('  Unknown event, payload:', payload);
      return { topic, event, payload };
  }
}

// Example: Valid cell output
console.log('=== Valid Message ===');
const validMessage = JSON.stringify([
  'session:abc123',
  'cell:output',
  { cellId: 'xyz', output: { type: 'stdout', data: 'Hello!' } }
]);
validateAndRouteMessage(validMessage);

// Example: Invalid payload
console.log('\n=== Invalid Payload ===');
const invalidMessage = JSON.stringify([
  'session:abc123',
  'cell:output',
  { cellId: 'xyz', output: { type: 'invalid', data: 123 } }
]);

try {
  validateAndRouteMessage(invalidMessage);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log('  Validation failed:');
    error.errors.forEach(err => {
      console.log(`    - ${err.path.join('.')}: ${err.message}`);
    });
  }
}

// Example: Cell update
console.log('\n=== Cell Update ===');
const updateMessage = JSON.stringify([
  'session:abc123',
  'cell:update',
  { cellId: 'xyz', updates: { source: 'console.log("Updated!");' } }
]);
validateAndRouteMessage(updateMessage);
```

### Performance Considerations

- **Broadcast efficiency**: Server uses a map of topic -> subscribers for O(1) lookups
- **Message queuing**: Clients queue messages until subscribed to prevent loss
- **Reconnection**: Client automatically reconnects with exponential backoff
- **Schema validation**: Validation happens on both client and server for safety

### Common Gotchas

1. **Forgetting to subscribe**: You must send a `subscribe` message before receiving events for a topic.

2. **Invalid payload schemas**: If your payload doesn't match the Zod schema, the message will be rejected silently on the server.

3. **Topic naming**: Topics must follow patterns registered as channels. Arbitrary topic names won't work.

4. **Dynamic parameters**: When defining channels, use `<paramName>` syntax for dynamic parts.

## Interactive Exercise: Build a Message Logger

Now it's your turn! Build a utility that logs and categorizes WebSocket messages.

###### exercise.ts

```typescript
// Exercise: Build a WebSocket message analyzer
//
// Challenge:
// 1. Parse WebSocket messages into their components
// 2. Categorize messages by topic type (session, app, mcp)
// 3. Track message statistics (counts per event type)
// 4. Handle invalid messages gracefully
//
// Hints:
// - Use the WebSocketMessageSchema for validation
// - Extract topic type from the first part before ':'
// - Use a Map to count event occurrences

import { z } from 'zod';

const WebSocketMessageSchema = z.tuple([
  z.string(),
  z.string(),
  z.record(z.string(), z.any()),
]);

class MessageAnalyzer {
  private stats = new Map<string, number>();
  private byTopic = new Map<string, number>();

  // TODO: Implement analyze method
  analyze(raw: string) {
    try {
      const [topic, event, payload] = WebSocketMessageSchema.parse(JSON.parse(raw));

      // TODO: Extract topic type (session, app, mcp)
      // TODO: Update stats
      // TODO: Return analysis result

      return {
        valid: true,
        topic,
        topicType: topic.split(':')[0],
        event,
        payloadSize: JSON.stringify(payload).length,
      };
    } catch (error) {
      return { valid: false, error: String(error) };
    }
  }

  // TODO: Implement getStats method
  getStats() {
    return {
      eventCounts: Object.fromEntries(this.stats),
      topicCounts: Object.fromEntries(this.byTopic),
    };
  }
}

// Test your implementation
const analyzer = new MessageAnalyzer();

const testMessages = [
  ['session:abc', 'cell:exec', { cellId: '1' }],
  ['session:abc', 'cell:output', { cellId: '1', output: { type: 'stdout', data: 'hi' } }],
  ['session:abc', 'cell:updated', { cell: {} }],
  ['app:xyz', 'file:created', { file: { path: '/test.ts' } }],
  ['mcp:client', 'tool:invoke', { tool: 'test' }],
];

console.log('=== Analyze Messages ===\n');
for (const msg of testMessages) {
  const result = analyzer.analyze(JSON.stringify(msg));
  console.log(result);
}

console.log('\n=== Statistics ===');
console.log(analyzer.getStats());
```

## Source Code References

Want to see how this is actually implemented in Srcbook? Check out these files:

### Primary Implementation

- **[`packages/api/server/ws.mts`](../../../server/ws.mts)**: Main WebSocket server
  - Channel registration for session events
  - Event handlers for cell operations
  - TypeScript server integration
  - Lines 867-893 show channel registration

- **[`packages/api/server/ws-client.mts`](../../../server/ws-client.mts)**: WebSocket infrastructure
  - `Channel` class with dynamic topic matching (lines 50-139)
  - `WebSocketServer` class with broadcast (lines 148-274)
  - Message routing and validation

- **[`packages/api/server/channels/mcp.mts`](../../../server/channels/mcp.mts)**: MCP channel
  - MCP server/client/registry events
  - Tool invocation handling
  - Resource subscription

### Schema Definitions

- **[`packages/shared/src/schemas/websockets.mts`](../../../../shared/src/schemas/websockets.mts)**: Core schemas
  - `WebSocketMessageSchema` (lines 13-17)
  - All session event payload schemas
  - App event schemas

- **[`packages/shared/src/schemas/mcp-websockets.mts`](../../../../shared/src/schemas/mcp-websockets.mts)**: MCP schemas
  - Server mode events (lines 25-85)
  - Client mode events (lines 87-194)
  - Registry events (lines 196-239)
  - Event constants (lines 245-289)

## Next Steps

### Related Topics

Now that you understand Srcbook's WebSocket protocol, you might want to explore:

- **Cell Types and Structure**: Understanding the cell data that flows through WebSockets
- **Session Management**: How sessions are created and persisted
- **MCP Integration**: Deep dive into Model Context Protocol events

### Further Reading

- [WebSocket Protocol Specification (RFC 6455)](https://datatracker.ietf.org/doc/html/rfc6455)
- [Zod Documentation](https://zod.dev/) - Schema validation library
- [ws Library Documentation](https://github.com/websockets/ws) - Node.js WebSocket library

### Contributing

Found an error or want to improve this educational Srcbook?

1. The source for this Srcbook is at `packages/api/srcbook/examples/internals/websocket-protocol.src.md`
2. Submit a PR with your improvements
3. Help make Srcbook's documentation even better!

## Summary

In this Srcbook, we covered:

- The `[topic, event, payload]` message format validated by Zod schemas
- Topic naming patterns: `session:<id>`, `app:<id>`, and `mcp:<scope>`
- The Channel class that matches topics and routes events
- The subscription model: clients must subscribe before receiving broadcasts
- Complete event type reference for sessions, apps, and MCP
- How to validate message payloads with Zod schemas
- Implementation details from the actual Srcbook codebase

You now understand how Srcbook uses WebSockets for real-time communication and can build your own integrations or contribute to the WebSocket system.
