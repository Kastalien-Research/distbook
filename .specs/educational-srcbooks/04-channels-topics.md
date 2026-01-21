# Channels & Topics - Implementation Specification

**Version:** 1.0
**Date:** 2026-01-14
**Status:** Implementation-Ready
**Output:** `packages/api/srcbook/examples/internals/channels-topics.src.md`
**Dependencies:** WebSocket Protocol Srcbook

---

## 1. Overview

This specification defines the implementation of an educational Srcbook that explains Srcbook's channel and topic subscription system for real-time communication.

### Learning Objectives

1. Understand the pub/sub architecture with channels and topics
2. Learn topic naming patterns (`session:<id>`, `app:<id>`, `mcp:*`)
3. Comprehend the subscription lifecycle (subscribe, receive, unsubscribe)
4. Know how to build custom channel handlers

---

## 2. File Structure

### 2.1 Srcbook Metadata

```markdown
<!-- srcbook:{"language":"typescript"} -->
```

### 2.2 Required Sections

| Section | Type | Purpose |
|---------|------|---------|
| Title | Title Cell | "Channels & Topics - Real-Time Subscriptions" |
| package.json | Package Cell | WebSocket and type dependencies |
| Introduction | Markdown | Context and objectives |
| Key Concepts | Markdown | Pub/sub architecture diagram |
| Simple Demo | Code | Basic subscription example |
| Explanation | Markdown | How matching works |
| Advanced Demo | Code | Custom channel implementation |
| Deep Dive | Markdown | Srcbook's channel system |
| Interactive Exercise | Code | Build event router |
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
    "@types/ws": "^8.5.12",
    "ws": "^8.17.0",
    "tsx": "latest",
    "typescript": "latest",
    "zod": "^3.23.8"
  }
}
```

### 3.2 Introduction Content

**What are Channels & Topics?**
- Channels are patterns that define subscription scopes
- Topics are specific instances matching those patterns
- Example: `session:<sessionId>` is a channel, `session:abc123` is a topic
- Enables targeted message delivery to interested clients

**Why does it matter?**
- Understanding enables building real-time features
- Necessary for extending the WebSocket system
- Critical for debugging subscription issues

### 3.3 Key Concepts - Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Channel Architecture                      │
│                                                              │
│  Channel Patterns:                                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ "session:<sessionId>"  → matches session:abc123       │   │
│  │ "app:<appId>"          → matches app:xyz789          │   │
│  │ "mcp:server"           → matches mcp:server          │   │
│  │ "mcp:client"           → matches mcp:client          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Connection Subscriptions:                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Client A: ["session:abc123", "mcp:registry"]         │   │
│  │ Client B: ["session:abc123", "app:xyz789"]           │   │
│  │ Client C: ["mcp:client", "mcp:registry"]             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Broadcast Flow:                                             │
│  wss.broadcast("session:abc123", "cell:updated", data)      │
│       → Sent to Client A and Client B (subscribed)          │
│       → NOT sent to Client C (not subscribed)               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Simple Demo

**Filename:** `simple-pubsub.ts`

```typescript
// Simple pub/sub system demonstrating channel concepts

type MessageHandler = (topic: string, event: string, payload: unknown) => void;

class SimplePubSub {
  private subscriptions: Map<string, Set<MessageHandler>> = new Map();

  subscribe(topic: string, handler: MessageHandler): () => void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(handler);
    console.log(`✅ Subscribed to: ${topic}`);

    // Return unsubscribe function
    return () => {
      this.subscriptions.get(topic)?.delete(handler);
      console.log(`🔕 Unsubscribed from: ${topic}`);
    };
  }

  publish(topic: string, event: string, payload: unknown): void {
    const handlers = this.subscriptions.get(topic);
    if (!handlers || handlers.size === 0) {
      console.log(`📭 No subscribers for: ${topic}`);
      return;
    }

    console.log(`📤 Publishing to ${handlers.size} subscriber(s): [${topic}, ${event}]`);
    for (const handler of handlers) {
      handler(topic, event, payload);
    }
  }

  listSubscriptions(): void {
    console.log('\n📋 Active Subscriptions:');
    for (const [topic, handlers] of this.subscriptions) {
      console.log(`  ${topic}: ${handlers.size} handler(s)`);
    }
  }
}

// Demo
const pubsub = new SimplePubSub();

// Subscribe to session topic
const unsub1 = pubsub.subscribe('session:abc123', (topic, event, payload) => {
  console.log(`  📩 Handler 1 received: [${topic}, ${event}]`, payload);
});

// Another subscriber to same topic
const unsub2 = pubsub.subscribe('session:abc123', (topic, event, payload) => {
  console.log(`  📩 Handler 2 received: [${topic}, ${event}]`, payload);
});

// Subscribe to different topic
pubsub.subscribe('app:xyz789', (topic, event, payload) => {
  console.log(`  📩 App handler received: [${topic}, ${event}]`, payload);
});

pubsub.listSubscriptions();

// Publish to session topic (both handlers receive)
console.log('\n--- Publishing cell:updated to session:abc123 ---');
pubsub.publish('session:abc123', 'cell:updated', { cellId: '001', content: 'new code' });

// Publish to app topic (only app handler receives)
console.log('\n--- Publishing file:created to app:xyz789 ---');
pubsub.publish('app:xyz789', 'file:created', { path: 'src/App.tsx' });

// Publish to non-existent topic
console.log('\n--- Publishing to non-existent topic ---');
pubsub.publish('session:unknown', 'test', {});

// Unsubscribe and test again
console.log('\n--- After unsubscribing Handler 1 ---');
unsub1();
pubsub.publish('session:abc123', 'cell:updated', { cellId: '002' });
```

### 3.5 Advanced Demo - Pattern Matching

**Filename:** `channel-matching.ts`

```typescript
// Channel pattern matching (like Srcbook's ws-client.mts)

interface ChannelMatch {
  params: Record<string, string>;
}

interface Channel {
  pattern: string;
  parts: string[];
  handlers: Map<string, (payload: unknown, params: Record<string, string>) => void>;
}

class ChannelRouter {
  private channels: Channel[] = [];

  /**
   * Register a channel pattern
   * Patterns use <paramName> syntax for dynamic parts
   * Example: "session:<sessionId>" matches "session:abc123"
   */
  channel(pattern: string): ChannelBuilder {
    const parts = pattern.split(':');
    const channel: Channel = {
      pattern,
      parts,
      handlers: new Map(),
    };
    this.channels.push(channel);
    return new ChannelBuilder(channel);
  }

  /**
   * Find matching channel for a topic
   */
  findMatch(topic: string): { channel: Channel; params: Record<string, string> } | null {
    const topicParts = topic.split(':');

    for (const channel of this.channels) {
      const match = this.matchParts(channel.parts, topicParts);
      if (match) {
        return { channel, params: match.params };
      }
    }
    return null;
  }

  private matchParts(
    patternParts: string[],
    topicParts: string[]
  ): ChannelMatch | null {
    // Must have same number of parts
    if (patternParts.length !== topicParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < patternParts.length; i++) {
      const pattern = patternParts[i];
      const topic = topicParts[i];

      // Check if this is a dynamic parameter
      if (pattern.startsWith('<') && pattern.endsWith('>')) {
        // Extract parameter name and capture value
        const paramName = pattern.slice(1, -1);
        params[paramName] = topic;
      } else if (pattern !== topic) {
        // Static part must match exactly
        return null;
      }
    }

    return { params };
  }

  /**
   * Route a message to the appropriate handler
   */
  route(topic: string, event: string, payload: unknown): boolean {
    const match = this.findMatch(topic);
    if (!match) {
      console.log(`❌ No channel matches topic: ${topic}`);
      return false;
    }

    const handler = match.channel.handlers.get(event);
    if (!handler) {
      console.log(`❌ No handler for event: ${event} on channel: ${match.channel.pattern}`);
      return false;
    }

    console.log(`✅ Routing [${topic}, ${event}] → ${match.channel.pattern}`);
    console.log(`   Params:`, match.params);
    handler(payload, match.params);
    return true;
  }
}

class ChannelBuilder {
  constructor(private channel: Channel) {}

  on(
    event: string,
    handler: (payload: unknown, params: Record<string, string>) => void
  ): ChannelBuilder {
    this.channel.handlers.set(event, handler);
    return this;
  }
}

// Demo: Build a router like Srcbook's
const router = new ChannelRouter();

// Register session channel (like ws.mts)
router
  .channel('session:<sessionId>')
  .on('cell:exec', (payload, params) => {
    console.log(`   📝 Executing cell in session: ${params.sessionId}`, payload);
  })
  .on('cell:stop', (payload, params) => {
    console.log(`   🛑 Stopping cell in session: ${params.sessionId}`, payload);
  })
  .on('cell:updated', (payload, params) => {
    console.log(`   📤 Cell updated in session: ${params.sessionId}`, payload);
  });

// Register app channel (like channels/app.mts)
router
  .channel('app:<appId>')
  .on('preview:start', (payload, params) => {
    console.log(`   🚀 Starting preview for app: ${params.appId}`, payload);
  })
  .on('file:updated', (payload, params) => {
    console.log(`   📄 File updated in app: ${params.appId}`, payload);
  });

// Register MCP channel (like channels/mcp.mts)
router
  .channel('mcp:client')
  .on('server:connect', (payload, params) => {
    console.log(`   🔌 MCP server connecting`, payload);
  })
  .on('tool:invoke', (payload, params) => {
    console.log(`   🔧 MCP tool invoked`, payload);
  });

// Test routing
console.log('\n=== Testing Channel Router ===\n');

router.route('session:abc123', 'cell:exec', { cellId: '001' });
router.route('session:xyz789', 'cell:stop', { cellId: '002' });
router.route('app:myapp', 'preview:start', { port: 3000 });
router.route('app:myapp', 'file:updated', { path: 'src/App.tsx' });
router.route('mcp:client', 'server:connect', { serverId: 'filesystem' });

// Test non-matching
console.log('\n=== Testing Non-Matches ===\n');
router.route('unknown:topic', 'event', {});
router.route('session:abc', 'unknown:event', {});
```

### 3.6 Deep Dive Content

**Source File References:**

1. **`packages/api/server/ws-client.mts`** - Core WebSocket server
   - `channel()` method for pattern registration
   - `findChannelMatch()` for topic → channel matching
   - `broadcast()` for sending to all subscribers

2. **`packages/api/server/ws.mts`** - Session channel implementation
   - Registers `session:<sessionId>` channel
   - Handlers for cell operations, tsserver, deps

3. **`packages/api/server/channels/app.mts`** - App channel
   - Registers `app:<appId>` channel
   - Handlers for preview, files, dependencies

4. **`packages/api/server/channels/mcp.mts`** - MCP channels
   - Registers `mcp:server`, `mcp:client`, `mcp:registry`
   - Handlers for tool invocation, resource subscriptions

**Topic Patterns in Srcbook:**

| Pattern | Example Topic | Use Case |
|---------|---------------|----------|
| `session:<sessionId>` | `session:abc-123` | Notebook operations |
| `app:<appId>` | `app:xyz-789` | App builder operations |
| `mcp:server` | `mcp:server` | Srcbook as MCP server |
| `mcp:client` | `mcp:client` | Srcbook as MCP client |
| `mcp:registry` | `mcp:registry` | MCP capability discovery |

### 3.7 Interactive Exercise

```typescript
// Exercise: Build an Event Router with Middleware
//
// Challenge:
// 1. Implement middleware support (logging, validation)
// 2. Add wildcard matching (e.g., "session:*")
// 3. Support event namespacing (e.g., "cell:exec:start")

interface Middleware {
  (topic: string, event: string, payload: unknown, next: () => void): void;
}

class AdvancedRouter {
  private middlewares: Middleware[] = [];
  // TODO: Add channel storage

  use(middleware: Middleware): void {
    // TODO: Add middleware to stack
  }

  channel(pattern: string): ChannelBuilder {
    // TODO: Implement with wildcard support
    throw new Error('Not implemented');
  }

  route(topic: string, event: string, payload: unknown): void {
    // TODO: Run through middleware stack, then route
  }
}

// Test your implementation:
// const router = new AdvancedRouter();
//
// router.use((topic, event, payload, next) => {
//   console.log(`[LOG] ${topic}:${event}`);
//   next();
// });
//
// router.channel('session:*').on('cell:*', (payload, params) => {
//   console.log('Wildcard match!', params);
// });
//
// router.route('session:abc', 'cell:exec:start', { cellId: '001' });
```

### 3.8 Source References

| File | Purpose |
|------|---------|
| `packages/api/server/ws-client.mts` | Core WebSocket server, channel matching |
| `packages/api/server/ws.mts` | Session channel handlers |
| `packages/api/server/channels/app.mts` | App channel handlers |
| `packages/api/server/channels/mcp.mts` | MCP channel handlers |
| `packages/shared/src/schemas/mcp-websockets.mts` | MCP event/topic constants |

---

## 4. Acceptance Criteria

- [ ] Simple pub/sub demo executes correctly
- [ ] Pattern matching demo shows param extraction
- [ ] All topic patterns documented
- [ ] Exercise is achievable
- [ ] Cross-references to WebSocket Protocol Srcbook work

---

## 5. Implementation Notes

### File Location
```
packages/api/srcbook/examples/internals/channels-topics.src.md
```

### Validation
- Test pattern matching edge cases
- Verify all event handlers documented
