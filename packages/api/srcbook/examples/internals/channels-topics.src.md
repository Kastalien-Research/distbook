<!-- srcbook:{"language":"typescript"} -->

# Channels & Topics - Real-Time Subscriptions

This srcbook explores Srcbook's pub/sub architecture for real-time communication. Channels define subscription patterns, topics are specific instances, and together they enable targeted message delivery to interested clients.

**Prerequisites**: Familiarity with the [WebSocket Protocol](./websocket-protocol.src.md) srcbook.

**Learning Objectives**:
1. Understand the pub/sub architecture with channels and topics
2. Learn topic naming patterns (`session:<id>`, `app:<id>`, `mcp:*`)
3. Comprehend the subscription lifecycle (subscribe, receive, unsubscribe)
4. Know how to build custom channel handlers

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "@types/node": "latest",
    "@types/ws": "^8.5.12",
    "ws": "^8.17.0",
    "tsx": "latest",
    "typescript": "latest",
    "zod": "^3.23.8"
  }
}
```

## What are Channels & Topics?

In Srcbook's WebSocket system:

- **Channels** are patterns that define subscription scopes (e.g., `session:<sessionId>`)
- **Topics** are specific instances matching those patterns (e.g., `session:abc123`)
- **Events** are actions within a topic (e.g., `cell:updated`, `cell:exec`)

This enables targeted message delivery - only clients subscribed to a specific topic receive its messages.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       Channel Architecture                               │
│                                                                          │
│  CHANNEL PATTERNS (defined in code):                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ "session:<sessionId>"  → matches session:abc123, session:xyz789    │ │
│  │ "app:<appId>"          → matches app:myapp, app:preview-1          │ │
│  │ "mcp:server"           → matches mcp:server (static)               │ │
│  │ "mcp:client"           → matches mcp:client (static)               │ │
│  │ "mcp:registry"         → matches mcp:registry (static)             │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  CONNECTION SUBSCRIPTIONS (runtime):                                     │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Client A: ["session:abc123", "mcp:registry"]                       │ │
│  │ Client B: ["session:abc123", "app:myapp"]                          │ │
│  │ Client C: ["mcp:client", "mcp:registry"]                           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  BROADCAST FLOW:                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ wss.broadcast("session:abc123", "cell:updated", { cellId: "001" }) │ │
│  │     ↓                                                               │ │
│  │ → Sent to Client A (subscribed to session:abc123)                  │ │
│  │ → Sent to Client B (subscribed to session:abc123)                  │ │
│  │ → NOT sent to Client C (not subscribed)                            │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  SUBSCRIPTION LIFECYCLE:                                                 │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  1. Client → Server: ["session:abc123", "subscribe", { id: "req1"}]│ │
│  │  2. Server validates topic matches a channel pattern               │ │
│  │  3. Server adds topic to connection's subscription list            │ │
│  │  4. Server → Client: ["session:abc123", "subscribed", { id: "req1"}]│ │
│  │  5. Client receives all future broadcasts to that topic            │ │
│  │  6. Client → Server: ["session:abc123", "unsubscribe", {}]         │ │
│  │  7. Server removes topic from subscription list                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

## Topic Patterns in Srcbook

| Pattern | Example Topic | Use Case | Source File |
|---------|---------------|----------|-------------|
| `session:<sessionId>` | `session:abc-123` | Notebook cell operations | `server/ws.mts` |
| `app:<appId>` | `app:xyz-789` | App builder preview/files | `server/channels/app.mts` |
| `mcp:server` | `mcp:server` | Srcbook as MCP provider | `server/channels/mcp.mts` |
| `mcp:client` | `mcp:client` | Srcbook consuming MCP servers | `server/channels/mcp.mts` |
| `mcp:registry` | `mcp:registry` | MCP capability discovery | `server/channels/mcp.mts` |

## Simple Demo: Basic Pub/Sub

Let's build a simple pub/sub system to understand the core concepts. This demonstrates subscribe, publish, and unsubscribe operations.

###### simple-pubsub.ts

```typescript
// Simple pub/sub system demonstrating channel concepts
// This runs entirely in-memory without WebSocket connections

type MessageHandler = (topic: string, event: string, payload: unknown) => void;

class SimplePubSub {
  private subscriptions: Map<string, Set<MessageHandler>> = new Map();

  /**
   * Subscribe to a topic with a message handler.
   * Returns an unsubscribe function.
   */
  subscribe(topic: string, handler: MessageHandler): () => void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(handler);
    console.log(`[SUBSCRIBE] Subscribed to: ${topic}`);

    // Return unsubscribe function
    return () => {
      this.subscriptions.get(topic)?.delete(handler);
      console.log(`[UNSUBSCRIBE] Unsubscribed from: ${topic}`);
    };
  }

  /**
   * Publish an event to all subscribers of a topic.
   */
  publish(topic: string, event: string, payload: unknown): void {
    const handlers = this.subscriptions.get(topic);
    if (!handlers || handlers.size === 0) {
      console.log(`[PUBLISH] No subscribers for: ${topic}`);
      return;
    }

    console.log(`[PUBLISH] Publishing to ${handlers.size} subscriber(s): [${topic}, ${event}]`);
    for (const handler of handlers) {
      handler(topic, event, payload);
    }
  }

  /**
   * List all active subscriptions.
   */
  listSubscriptions(): void {
    console.log('\n--- Active Subscriptions ---');
    if (this.subscriptions.size === 0) {
      console.log('  (none)');
      return;
    }
    for (const [topic, handlers] of this.subscriptions) {
      if (handlers.size > 0) {
        console.log(`  ${topic}: ${handlers.size} handler(s)`);
      }
    }
  }
}

// ============================================================================
// Demo: Using the SimplePubSub
// ============================================================================

const pubsub = new SimplePubSub();

console.log('=== Setting Up Subscriptions ===\n');

// Subscribe to session topic - simulating a notebook client
const unsubSession1 = pubsub.subscribe('session:abc123', (topic, event, payload) => {
  console.log(`  [Handler 1] Received: [${topic}, ${event}]`, JSON.stringify(payload));
});

// Another subscriber to same topic - simulating another browser tab
const unsubSession2 = pubsub.subscribe('session:abc123', (topic, event, payload) => {
  console.log(`  [Handler 2] Received: [${topic}, ${event}]`, JSON.stringify(payload));
});

// Subscribe to different topic - simulating app builder
pubsub.subscribe('app:myapp', (topic, event, payload) => {
  console.log(`  [App Handler] Received: [${topic}, ${event}]`, JSON.stringify(payload));
});

pubsub.listSubscriptions();

// ============================================================================
// Publishing Messages
// ============================================================================

console.log('\n=== Publishing Messages ===\n');

// Publish to session topic - both handlers receive
console.log('--- Publishing cell:updated to session:abc123 ---');
pubsub.publish('session:abc123', 'cell:updated', {
  cellId: '001',
  content: 'console.log("hello")'
});

// Publish to app topic - only app handler receives
console.log('\n--- Publishing file:created to app:myapp ---');
pubsub.publish('app:myapp', 'file:created', {
  path: 'src/App.tsx'
});

// Publish to non-existent topic
console.log('\n--- Publishing to non-existent topic ---');
pubsub.publish('session:unknown', 'test', {});

// ============================================================================
// Unsubscribe and Test Again
// ============================================================================

console.log('\n=== After Unsubscribing Handler 1 ===\n');
unsubSession1();

pubsub.listSubscriptions();

console.log('\n--- Publishing again to session:abc123 ---');
pubsub.publish('session:abc123', 'cell:updated', { cellId: '002' });

console.log('\n=== Demo Complete ===');
```

## How Channel Pattern Matching Works

Srcbook's `Channel` class (in `ws-client.mts`) uses a pattern matching system:

1. **Static segments** must match exactly: `session` matches `session`
2. **Dynamic parameters** use `<name>` syntax: `<sessionId>` captures any value
3. **Parts are separated by colons**: `session:<sessionId>` has 2 parts

When a topic like `session:abc123` arrives:
1. Split into parts: `["session", "abc123"]`
2. Compare with pattern parts: `["session", "<sessionId>"]`
3. Static parts must match, dynamic parts capture values
4. Result: `{ params: { sessionId: "abc123" } }`

## Advanced Demo: Channel Router with Pattern Matching

This demonstrates how Srcbook's actual channel system works - with dynamic parameter extraction from topics.

###### channel-matching.ts

```typescript
// Channel pattern matching (mirrors Srcbook's ws-client.mts)
// Demonstrates how topics like "session:abc123" match patterns like "session:<sessionId>"

interface ChannelMatch {
  params: Record<string, string>;
}

interface Channel {
  pattern: string;
  parts: Array<{ dynamic: boolean; value: string }>;
  handlers: Map<string, (payload: unknown, params: Record<string, string>) => void>;
}

class ChannelRouter {
  private channels: Channel[] = [];

  /**
   * Register a channel pattern.
   * Patterns use <paramName> syntax for dynamic segments.
   *
   * Examples:
   *   - "session:<sessionId>" matches "session:abc123" with params { sessionId: "abc123" }
   *   - "app:<appId>" matches "app:myapp" with params { appId: "myapp" }
   *   - "mcp:client" matches "mcp:client" exactly (static)
   */
  channel(pattern: string): ChannelBuilder {
    const parts = pattern.split(':').map(part => {
      // Check for dynamic parameter: <paramName>
      const match = part.match(/^<([a-zA-Z_][a-zA-Z0-9_]*)>$/);
      if (match) {
        return { dynamic: true, value: match[1] };
      }
      return { dynamic: false, value: part };
    });

    const channel: Channel = {
      pattern,
      parts,
      handlers: new Map(),
    };

    this.channels.push(channel);
    return new ChannelBuilder(channel);
  }

  /**
   * Find a channel that matches the given topic.
   * Returns the channel and extracted parameters.
   */
  findMatch(topic: string): { channel: Channel; params: Record<string, string> } | null {
    const topicParts = topic.split(':');

    for (const channel of this.channels) {
      // Must have same number of parts
      if (channel.parts.length !== topicParts.length) {
        continue;
      }

      const params: Record<string, string> = {};
      let matches = true;

      for (let i = 0; i < channel.parts.length; i++) {
        const patternPart = channel.parts[i];
        const topicPart = topicParts[i];

        if (patternPart.dynamic) {
          // Dynamic part - capture the value
          params[patternPart.value] = topicPart;
        } else if (patternPart.value !== topicPart) {
          // Static part doesn't match
          matches = false;
          break;
        }
      }

      if (matches) {
        return { channel, params };
      }
    }

    return null;
  }

  /**
   * Route a message to the appropriate handler.
   */
  route(topic: string, event: string, payload: unknown): boolean {
    const match = this.findMatch(topic);

    if (!match) {
      console.log(`[ROUTE] No channel matches topic: ${topic}`);
      return false;
    }

    const handler = match.channel.handlers.get(event);

    if (!handler) {
      console.log(`[ROUTE] No handler for event "${event}" on channel "${match.channel.pattern}"`);
      return false;
    }

    console.log(`[ROUTE] [${topic}, ${event}] -> ${match.channel.pattern}`);
    console.log(`        Params: ${JSON.stringify(match.params)}`);
    handler(payload, match.params);
    return true;
  }

  /**
   * Display registered channels.
   */
  showChannels(): void {
    console.log('\n--- Registered Channels ---');
    for (const channel of this.channels) {
      const events = Array.from(channel.handlers.keys()).join(', ');
      console.log(`  ${channel.pattern}`);
      console.log(`    Events: ${events || '(none)'}`);
    }
  }
}

class ChannelBuilder {
  constructor(private channel: Channel) {}

  /**
   * Register an event handler for this channel.
   */
  on(
    event: string,
    handler: (payload: unknown, params: Record<string, string>) => void
  ): ChannelBuilder {
    this.channel.handlers.set(event, handler);
    return this;
  }
}

// ============================================================================
// Demo: Build a Router Like Srcbook's
// ============================================================================

const router = new ChannelRouter();

console.log('=== Registering Channels (like ws.mts and channels/*.mts) ===\n');

// Register session channel (like server/ws.mts)
router
  .channel('session:<sessionId>')
  .on('cell:exec', (payload, params) => {
    console.log(`        Executing cell in session ${params.sessionId}:`, payload);
  })
  .on('cell:stop', (payload, params) => {
    console.log(`        Stopping cell in session ${params.sessionId}:`, payload);
  })
  .on('cell:updated', (payload, params) => {
    console.log(`        Cell updated in session ${params.sessionId}:`, payload);
  });

// Register app channel (like server/channels/app.mts)
router
  .channel('app:<appId>')
  .on('preview:start', (payload, params) => {
    console.log(`        Starting preview for app ${params.appId}:`, payload);
  })
  .on('file:updated', (payload, params) => {
    console.log(`        File updated in app ${params.appId}:`, payload);
  });

// Register MCP channels (like server/channels/mcp.mts)
router
  .channel('mcp:client')
  .on('server:connect', (payload, _params) => {
    console.log(`        MCP server connecting:`, payload);
  })
  .on('tool:invoke', (payload, _params) => {
    console.log(`        MCP tool invoked:`, payload);
  });

router
  .channel('mcp:registry')
  .on('servers:list', (payload, _params) => {
    console.log(`        Listing MCP servers:`, payload);
  })
  .on('tools:changed', (payload, _params) => {
    console.log(`        MCP tools changed:`, payload);
  });

router.showChannels();

// ============================================================================
// Test Routing
// ============================================================================

console.log('\n=== Testing Channel Router ===\n');

// Session channel - dynamic parameter extraction
router.route('session:abc123', 'cell:exec', { cellId: '001' });
router.route('session:xyz789', 'cell:stop', { cellId: '002' });

console.log('');

// App channel - different dynamic parameter
router.route('app:myapp', 'preview:start', { port: 3000 });
router.route('app:preview-1', 'file:updated', { path: 'src/App.tsx' });

console.log('');

// MCP channels - static topics
router.route('mcp:client', 'server:connect', { serverId: 'filesystem' });
router.route('mcp:registry', 'servers:list', {});

// ============================================================================
// Test Non-Matching Cases
// ============================================================================

console.log('\n=== Testing Non-Matches ===\n');

// Unknown topic prefix
router.route('unknown:topic', 'event', {});

// Known topic, unknown event
router.route('session:abc', 'unknown:event', {});

// Too many parts
router.route('session:abc:extra', 'cell:exec', {});

console.log('\n=== Demo Complete ===');
```

## Deep Dive: Srcbook's Channel System

### Source File: `packages/api/server/ws-client.mts`

The `Channel` class is the core abstraction:

```typescript
// Key concepts from ws-client.mts:

// 1. TopicPart - represents a segment of the topic pattern
type TopicPart =
  | { dynamic: false; segment: string }    // Static: must match exactly
  | { dynamic: true; parameter: string };  // Dynamic: captures value

// 2. Channel class - handles pattern matching and event dispatch
class Channel {
  readonly topic: string;           // e.g., "session:<sessionId>"
  private readonly parts: TopicPart[];  // Parsed segments
  readonly events: Record<string, { schema: ZodSchema; handler: Function }>;

  match(topic: string): TopicMatch | null;  // Pattern matching
  on(event: string, schema: ZodSchema, handler: Function): this;
}

// 3. WebSocketServer - manages connections and channels
class WebSocketServer {
  private readonly channels: Channel[] = [];
  private connections: ConnectionType[] = [];

  channel(topic: string): Channel;                    // Register pattern
  broadcast(topic: string, event: string, payload);   // Send to subscribers
  findChannelMatch(topic: string);                    // Route incoming
}
```

### Source File: `packages/api/server/ws.mts`

The session channel registers handlers for notebook operations:

```typescript
// From ws.mts - session channel registration:

wss
  .channel('session:<sessionId>')
  .on('cell:exec', CellExecPayloadSchema, cellExec)
  .on('cell:stop', CellStopPayloadSchema, cellStop)
  .on('cell:create', CellCreatePayloadSchema, cellCreate)
  .on('cell:update', CellUpdatePayloadSchema, cellUpdate)
  .on('cell:rename', CellRenamePayloadSchema, cellRename)
  .on('cell:delete', CellDeletePayloadSchema, cellDelete)
  .on('cell:format', CellFormatPayloadSchema, cellFormat)
  .on('ai:generate', AiGenerateCellPayloadSchema, cellGenerate)
  .on('deps:install', DepsInstallPayloadSchema, depsInstall)
  .on('tsserver:start', TsServerStartPayloadSchema, tsserverStart)
  // ... more handlers
```

### Source File: `packages/api/server/channels/app.mts`

The app channel handles app builder operations:

```typescript
// From channels/app.mts - app channel registration:

export function register(wss: WebSocketServer) {
  wss
    .channel('app:<appId>')
    .on('preview:start', PreviewStartPayloadSchema, previewStart)
    .on('preview:stop', PreviewStopPayloadSchema, previewStop)
    .on('deps:install', DepsInstallPayloadSchema, dependenciesInstall)
    .on('deps:clear', DepsInstallPayloadSchema, clearNodeModules)
    .on('file:updated', FileUpdatedPayloadSchema, onFileUpdated)
    .onJoin((_payload, context, conn) => {
      // Called when client subscribes - can send initial state
      const appExternalId = context.params.appId;
      // ...
    });
}
```

### Source File: `packages/api/server/channels/mcp.mts`

MCP channels use static topics (no dynamic parameters):

```typescript
// From channels/mcp.mts - MCP channel registration:

export function register(wss: WebSocketServer) {
  // Server mode: Srcbook as MCP provider
  wss
    .channel(MCP_TOPICS.SERVER)  // "mcp:server"
    .on(MCP_EVENTS.SERVER.APPROVAL_RESPOND, schema, handler);

  // Client mode: Srcbook consuming external MCP servers
  wss
    .channel(MCP_TOPICS.CLIENT)  // "mcp:client"
    .on(MCP_EVENTS.CLIENT.CONNECT, schema, handleClientConnect)
    .on(MCP_EVENTS.CLIENT.TOOL_INVOKE, schema, handleToolInvoke);

  // Registry: capability discovery
  wss
    .channel(MCP_TOPICS.REGISTRY)  // "mcp:registry"
    .on(MCP_EVENTS.REGISTRY.SERVERS_LIST, schema, handleServersList)
    .on(MCP_EVENTS.REGISTRY.TOOLS_LIST, schema, handleToolsList);
}
```

### Source File: `packages/shared/src/schemas/mcp-websockets.mts`

MCP event and topic constants:

```typescript
// Topic constants
export const MCP_TOPICS = {
  SERVER: 'mcp:server',
  CLIENT: 'mcp:client',
  REGISTRY: 'mcp:registry',
} as const;

// Event constants (namespaced)
export const MCP_EVENTS = {
  SERVER: {
    CLIENT_CONNECTED: 'client:connected',
    APPROVAL_REQUEST: 'approval:request',
    // ...
  },
  CLIENT: {
    CONNECT: 'server:connect',
    TOOL_INVOKE: 'tool:invoke',
    // ...
  },
  REGISTRY: {
    SERVERS_LIST: 'servers:list',
    TOOLS_CHANGED: 'tools:changed',
    // ...
  },
} as const;
```

## Interactive Exercise: Build an Event Router with Middleware

Extend the channel system with middleware support. Middleware can log, validate, or transform messages before they reach handlers.

###### exercise-router.ts

```typescript
// Exercise: Build an Event Router with Middleware
//
// Your challenge:
// 1. Implement middleware support (logging, validation, transformation)
// 2. Add wildcard matching (e.g., "session:*" matches any session)
// 3. Support event namespacing (e.g., "cell:exec:start", "cell:exec:complete")
//
// The solution structure is provided - fill in the TODO sections!

interface Middleware {
  (
    topic: string,
    event: string,
    payload: unknown,
    next: () => void
  ): void;
}

interface RouteHandler {
  (payload: unknown, params: Record<string, string>): void;
}

interface ChannelDef {
  pattern: string;
  parts: Array<{ type: 'static' | 'dynamic' | 'wildcard'; value: string }>;
  handlers: Map<string, RouteHandler>;
}

class AdvancedRouter {
  private middlewares: Middleware[] = [];
  private channels: ChannelDef[] = [];

  /**
   * Add middleware to the processing chain.
   * Middleware runs in order before the handler.
   */
  use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Register a channel pattern.
   *
   * Patterns support:
   * - Static segments: "mcp"
   * - Dynamic parameters: "<sessionId>"
   * - Wildcards: "*" (matches any single segment)
   */
  channel(pattern: string): AdvancedChannelBuilder {
    const parts = pattern.split(':').map(part => {
      if (part === '*') {
        return { type: 'wildcard' as const, value: '*' };
      }
      const match = part.match(/^<([a-zA-Z_][a-zA-Z0-9_]*)>$/);
      if (match) {
        return { type: 'dynamic' as const, value: match[1] };
      }
      return { type: 'static' as const, value: part };
    });

    const channel: ChannelDef = {
      pattern,
      parts,
      handlers: new Map(),
    };

    this.channels.push(channel);
    return new AdvancedChannelBuilder(channel);
  }

  /**
   * Find a matching channel and extract parameters.
   */
  private findMatch(topic: string): { channel: ChannelDef; params: Record<string, string> } | null {
    const topicParts = topic.split(':');

    for (const channel of this.channels) {
      if (channel.parts.length !== topicParts.length) {
        continue;
      }

      const params: Record<string, string> = {};
      let matches = true;

      for (let i = 0; i < channel.parts.length; i++) {
        const patternPart = channel.parts[i];
        const topicPart = topicParts[i];

        switch (patternPart.type) {
          case 'wildcard':
            // Wildcard matches anything - capture as '_wildcard_N'
            params[`_wildcard_${i}`] = topicPart;
            break;
          case 'dynamic':
            // Dynamic captures the value
            params[patternPart.value] = topicPart;
            break;
          case 'static':
            // Static must match exactly
            if (patternPart.value !== topicPart) {
              matches = false;
            }
            break;
        }

        if (!matches) break;
      }

      if (matches) {
        return { channel, params };
      }
    }

    return null;
  }

  /**
   * Match event patterns with namespace support.
   * "cell:*" matches "cell:exec", "cell:stop", etc.
   */
  private matchEvent(pattern: string, event: string): boolean {
    if (pattern === event) return true;
    if (pattern.endsWith(':*')) {
      const prefix = pattern.slice(0, -2);
      return event.startsWith(prefix + ':') || event === prefix;
    }
    return false;
  }

  /**
   * Route a message through middleware chain to handler.
   */
  route(topic: string, event: string, payload: unknown): void {
    const match = this.findMatch(topic);

    if (!match) {
      console.log(`[ROUTER] No channel matches: ${topic}`);
      return;
    }

    // Find handler - check for exact match first, then patterns
    let handler: RouteHandler | undefined;
    let matchedEvent: string | undefined;

    for (const [eventPattern, h] of match.channel.handlers) {
      if (this.matchEvent(eventPattern, event)) {
        handler = h;
        matchedEvent = eventPattern;
        break;
      }
    }

    if (!handler) {
      console.log(`[ROUTER] No handler for event "${event}" on ${match.channel.pattern}`);
      return;
    }

    console.log(`[ROUTER] Routing [${topic}, ${event}]`);
    console.log(`         Pattern: ${match.channel.pattern}, Event: ${matchedEvent}`);
    console.log(`         Params: ${JSON.stringify(match.params)}`);

    // Build middleware chain
    let index = 0;
    const next = () => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        middleware(topic, event, payload, next);
      } else {
        // End of chain - call handler
        handler!(payload, match.params);
      }
    };

    // Start the chain
    next();
  }
}

class AdvancedChannelBuilder {
  constructor(private channel: ChannelDef) {}

  /**
   * Register a handler for an event pattern.
   * Supports wildcards: "cell:*" matches any cell event.
   */
  on(eventPattern: string, handler: RouteHandler): this {
    this.channel.handlers.set(eventPattern, handler);
    return this;
  }
}

// ============================================================================
// Test Your Implementation
// ============================================================================

const router = new AdvancedRouter();

console.log('=== Setting Up Advanced Router ===\n');

// Add logging middleware
router.use((topic, event, payload, next) => {
  console.log(`[MIDDLEWARE:LOG] Processing [${topic}, ${event}]`);
  const start = Date.now();
  next();
  console.log(`[MIDDLEWARE:LOG] Completed in ${Date.now() - start}ms`);
});

// Add validation middleware
router.use((topic, event, payload, next) => {
  if (payload && typeof payload === 'object' && 'blocked' in payload) {
    console.log(`[MIDDLEWARE:VALIDATE] Blocked message!`);
    return; // Don't call next() - blocks the chain
  }
  next();
});

// Register channels with wildcards and event patterns
router
  .channel('session:<sessionId>')
  .on('cell:*', (payload, params) => {
    console.log(`         [HANDLER] Cell operation in ${params.sessionId}:`, payload);
  });

router
  .channel('*:broadcast')
  .on('message', (payload, params) => {
    console.log(`         [HANDLER] Broadcast from ${params._wildcard_0}:`, payload);
  });

router
  .channel('mcp:client')
  .on('tool:invoke', (payload, _params) => {
    console.log(`         [HANDLER] MCP tool invoke:`, payload);
  });

// ============================================================================
// Test Cases
// ============================================================================

console.log('\n=== Test: Middleware Chain + Wildcard Events ===\n');
router.route('session:abc123', 'cell:exec', { cellId: '001' });

console.log('\n=== Test: Wildcard Topic ===\n');
router.route('system:broadcast', 'message', { text: 'Hello everyone!' });

console.log('\n=== Test: Blocked by Validation Middleware ===\n');
router.route('session:xyz', 'cell:update', { blocked: true });

console.log('\n=== Test: Static Topic ===\n');
router.route('mcp:client', 'tool:invoke', { tool: 'readFile', args: {} });

console.log('\n=== Test: No Match ===\n');
router.route('unknown:topic', 'event', {});

console.log('\n=== Exercise Complete ===');

// ============================================================================
// Bonus Challenges:
//
// 1. Add a "transform" middleware that modifies the payload
// 2. Implement async middleware with Promise support
// 3. Add error handling middleware that catches handler exceptions
// 4. Implement priority-based channel matching (most specific wins)
// ============================================================================
```

## Summary

### Key Takeaways

1. **Channels are patterns**: Define subscription scopes with `<param>` syntax for dynamic segments
2. **Topics are instances**: Specific subscriptions that match channel patterns
3. **Events are actions**: Named operations within a topic (e.g., `cell:exec`, `preview:start`)
4. **Subscriptions are per-connection**: Each WebSocket connection maintains its own topic list
5. **Broadcasts are targeted**: Only connections subscribed to a topic receive its messages

### Pattern Matching Rules

- **Static segments** must match exactly: `mcp` matches `mcp`
- **Dynamic parameters** capture values: `<sessionId>` captures `abc123`
- **Parts are colon-separated**: `session:abc123` has 2 parts
- **Length must match**: `session:<id>` won't match `session:a:b`

### Srcbook's Topic Patterns

| Pattern | Type | Handler Location |
|---------|------|------------------|
| `session:<sessionId>` | Dynamic | `server/ws.mts` |
| `app:<appId>` | Dynamic | `server/channels/app.mts` |
| `mcp:server` | Static | `server/channels/mcp.mts` |
| `mcp:client` | Static | `server/channels/mcp.mts` |
| `mcp:registry` | Static | `server/channels/mcp.mts` |

## Source References

| File | Purpose |
|------|---------|
| `packages/api/server/ws-client.mts` | Core WebSocket server, Channel class, pattern matching |
| `packages/api/server/ws.mts` | Session channel handlers (cell ops, tsserver, deps) |
| `packages/api/server/channels/app.mts` | App channel handlers (preview, files) |
| `packages/api/server/channels/mcp.mts` | MCP channel handlers (server, client, registry) |
| `packages/shared/src/schemas/mcp-websockets.mts` | MCP event/topic constants and schemas |

## Next Steps

- Explore `websocket-protocol.src.md` for the underlying message format
- Review `app-builder.src.md` to see channels in action for the app builder
- Check `cell-execution.src.md` for how session channels handle code execution
