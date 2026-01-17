# WebSocket Protocol - Implementation Specification

**Version:** 1.0
**Date:** 2026-01-14
**Status:** Implementation-Ready
**Output:** `packages/api/srcbook/examples/internals/websocket-protocol.src.md`
**Dependencies:** Session Management Srcbook
**Note:** Template exists at `docs/example-websocket-protocol.src.md`

---

## 1. Overview

This specification defines the implementation of an educational Srcbook that explains Srcbook's real-time WebSocket protocol including the message format, topics, and subscription model.

### Learning Objectives

1. Understand the `[topic, event, payload]` message format
2. Learn topic naming patterns (`session:<id>`, `app:<id>`)
3. Comprehend the subscription model
4. Know how to build WebSocket clients for Srcbook

---

## 2. Implementation Source

**Use the existing template** at `docs/example-websocket-protocol.src.md` as the primary content source. This file contains:
- Complete message format documentation
- Working code examples
- Architecture diagrams
- Source references

### Required Modifications

1. **Update package.json** to include zod:
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

2. **Add MCP topic section** (new content):
   ```markdown
   **MCP Topics** (New in 2026):
   - `mcp:client` - MCP client operations
   - `mcp:server` - MCP server status
   ```

3. **Update source references** to include:
   - `packages/api/mcp/ws-channel.mts` - MCP WebSocket channel

4. **Verify all code cells execute** against current Srcbook API

---

## 3. Additional Content Sections

### 3.1 Event Types Deep Dive

Add comprehensive event type documentation:

```markdown
## All WebSocket Event Types

### Session Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `subscribe` | Client→Server | `{id: string}` | Subscribe to topic |
| `unsubscribe` | Client→Server | `{}` | Unsubscribe from topic |
| `cell:updated` | Server→Client | `{cell: Cell}` | Cell content changed |
| `cell:output` | Server→Client | `{cellId, output}` | Execution output |
| `cell:error` | Server→Client | `{cellId, error}` | Execution error |
| `deps:install:status` | Server→Client | `{status, packages}` | npm install progress |
| `tsserver:cell:diagnostics` | Server→Client | `{cellId, diagnostics}` | TypeScript errors |

### App Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `file:created` | Server→Client | `{file}` | New file in app |
| `file:updated` | Server→Client | `{file}` | File content changed |
| `file:deleted` | Server→Client | `{path}` | File removed |
| `preview:status` | Server→Client | `{status, url}` | Vite server status |
| `preview:log` | Server→Client | `{type, data}` | Vite log output |

### MCP Events (New)

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `server:status` | Server→Client | `{status, clients}` | MCP server status |
| `connection:status` | Server→Client | `{serverId, status}` | MCP client connection |
| `tool:invoked` | Server→Client | `{serverId, tool, result}` | Tool invocation result |
```

### 3.2 Schema Validation Example

```typescript
// Demonstrate Zod schema validation for WebSocket messages

import { z } from 'zod';

// Define message schemas (from packages/shared/src/schemas/websockets.mts)
const CellOutputPayloadSchema = z.object({
  cellId: z.string(),
  output: z.discriminatedUnion('type', [
    z.object({ type: z.literal('stdout'), data: z.string() }),
    z.object({ type: z.literal('stderr'), data: z.string() }),
  ]),
});

const WebSocketMessageSchema = z.tuple([
  z.string(), // topic
  z.string(), // event
  z.record(z.unknown()), // payload
]);

// Validate incoming messages
function validateMessage(raw: string) {
  const parsed = JSON.parse(raw);
  const [topic, event, payload] = WebSocketMessageSchema.parse(parsed);

  // Validate specific event payloads
  if (event === 'cell:output') {
    const validatedPayload = CellOutputPayloadSchema.parse(payload);
    console.log('Valid cell output:', validatedPayload);
  }

  return { topic, event, payload };
}

// Example
const testMessage = JSON.stringify([
  'session:abc123',
  'cell:output',
  { cellId: 'xyz', output: { type: 'stdout', data: 'Hello!' } }
]);

console.log('Validating:', testMessage);
console.log('Result:', validateMessage(testMessage));
```

---

## 4. Acceptance Criteria

- [ ] Template content from `docs/example-websocket-protocol.src.md` integrated
- [ ] All code cells execute successfully
- [ ] MCP events documented
- [ ] Schema validation example works
- [ ] Cross-references to Channels & Topics Srcbook

---

## 5. Implementation Notes

### File Location
```
packages/api/srcbook/examples/internals/websocket-protocol.src.md
```

### Validation
- Test against running Srcbook instance
- Verify schema imports work in TypeScript cells
