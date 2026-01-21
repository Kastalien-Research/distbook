# MCP Client Implementation Specification

**Version:** 1.0.0
**Date:** 2026-01-13
**Status:** Draft
**Author:** AI-assisted via @loops/authoring/spec-drafting
**Depends on:** [00-mcp-foundation.md](./00-mcp-foundation.md)
**Source:** `docs/mcp-integration-spec.md`, `docs/mcp-quick-reference.md`, `docs/mcp-example-notebook.src.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Background](#2-background)
3. [User Stories](#3-user-stories)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [API Design](#6-api-design)
7. [Data Model](#7-data-model)
8. [UI Components](#8-ui-components)
9. [Migration Path](#9-migration-path)
10. [Acceptance Criteria](#10-acceptance-criteria)

---

## 1. Executive Summary

This specification defines the MCP Client implementation for Srcbook, enabling notebooks to consume capabilities from external MCP servers. The client provides:

- **Server Connection Management**: Connect to multiple MCP servers
- **Tool Invocation**: Call tools from databases, file systems, APIs
- **Resource Access**: Read and subscribe to external data
- **Sampling Integration**: Request LLM completions through MCP

This extends notebook capabilities beyond Srcbook's native features.

---

## 2. Background

### Current State

Srcbook notebooks can only use:
- Built-in TypeScript/JavaScript execution
- npm packages installed per notebook
- Direct HTTP calls from code cells

### Desired State

Notebooks should be able to:
1. Connect to external MCP servers (databases, file systems, etc.)
2. Discover and invoke tools from those servers
3. Read and subscribe to external resources
4. Use MCP sampling for AI operations (when available)
5. Compose multiple MCP capabilities in workflows

### Success Criteria

- Notebook can query a PostgreSQL database via MCP server
- Notebook can read/write files via MCP file system server
- AI features can use MCP sampling as a fallback/enhancement

---

## 3. User Stories

### Notebook Users

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|---------------------|
| US-001 | As a user, I want to add MCP servers so I can access external tools | Must | Can add server via Settings UI |
| US-002 | As a user, I want to see available tools so I can use them in notebooks | Must | Tool list visible in UI and notebook |
| US-003 | As a user, I want to invoke tools from code cells so I can build workflows | Must | `mcpTools.database.query()` works |
| US-004 | As a user, I want to read external resources so I can access live data | Must | `mcpResources.read()` returns data |
| US-005 | As a user, I want to subscribe to resource updates so I can react to changes | Should | Subscription callback fires on update |
| US-006 | As a user, I want AI features to use MCP sampling when available | Could | Sampling used when server provides it |

### Developers

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|---------------------|
| US-007 | As a developer, I want typed tool interfaces so I get autocomplete | Should | TypeScript types for connected tools |
| US-008 | As a developer, I want clear error messages when tools fail | Must | Errors include tool name, input, reason |
| US-009 | As a developer, I want to manage servers programmatically | Should | API endpoints for server CRUD |

---

## 4. Functional Requirements

### 4.1 Server Connection Management

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-CM-001 | Add MCP server via UI | Must | Form accepts all config options |
| FR-CM-002 | Add MCP server via API | Must | POST endpoint creates server |
| FR-CM-003 | Connect to stdio transport servers | Must | Process spawns, connection established |
| FR-CM-004 | Connect to HTTP transport servers | Should | HTTPS connection works |
| FR-CM-005 | Auto-connect on startup (configurable) | Should | Enabled servers connect automatically |
| FR-CM-006 | Disconnect from server | Must | Connection closes gracefully |
| FR-CM-007 | Remove server configuration | Must | Server deleted from database |
| FR-CM-008 | Update server configuration | Must | Changes persist and apply |
| FR-CM-009 | Display connection status | Must | UI shows connected/disconnected |
| FR-CM-010 | Handle connection failures gracefully | Must | Retry logic, clear error display |
| FR-CM-011 | Store credentials securely for HTTP servers | Must | Auth tokens encrypted in database |
| FR-CM-012 | Support auth header configuration for HTTP | Should | Custom Authorization headers configurable |

> **Security Reference**: See [03-mcp-security.md § 4.2.1](./03-mcp-security.md#421-authentication-mechanism-gap-001-resolution) for credential handling requirements.

### 4.2 Tool Discovery and Invocation

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-TI-001 | Discover tools on connection | Must | tools/list called, tools registered |
| FR-TI-002 | List all available tools | Must | API returns tools from all servers |
| FR-TI-003 | Invoke tool by server and name | Must | tools/call works, result returned |
| FR-TI-004 | Validate tool input against schema | Should | Invalid input rejected with clear error |
| FR-TI-005 | Handle tool invocation timeout | Must | Timeout configurable, error on timeout |
| FR-TI-006 | Track tool invocation for audit | Should | Invocations logged to database |
| FR-TI-007 | Tools available in notebook via import | Must | `import { mcpTools }` works |
| FR-TI-008 | Tools dynamically namespaced by server | Must | `mcpTools.serverName.toolName()` |

### 4.3 Resource Access

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-RA-001 | List resources from connected servers | Must | resources/list aggregated |
| FR-RA-002 | Read resource content | Must | resources/read returns data |
| FR-RA-003 | Subscribe to resource updates | Should | resources/subscribe works |
| FR-RA-004 | Handle resource subscription notifications | Should | Callback fires on notification |
| FR-RA-005 | Unsubscribe from resources | Should | resources/unsubscribe works |
| FR-RA-006 | Resources available via import | Must | `import { mcpResources }` works |
| FR-RA-007 | URI-based resource access | Must | `mcpResources.read('uri')` works |

### 4.4 Sampling Integration

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-SA-001 | Detect sampling capability | Should | Check server capabilities on connect |
| FR-SA-002 | Request sampling from MCP | Should | sampling/createMessage works |
| FR-SA-003 | AI features use sampling when available | Could | generateCells uses MCP sampling |
| FR-SA-004 | Fall back to direct API when unavailable | Must | Works without MCP sampling |
| FR-SA-005 | Sampling available in notebook | Could | `mcpSampling.createMessage()` works |

### 4.5 Capability Registry

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-CR-001 | Registry tracks all server capabilities | Must | Tools, resources, prompts registered |
| FR-CR-002 | Registry updates on connection change | Must | Capabilities refresh on connect/disconnect |
| FR-CR-003 | Registry handles capability changes | Should | listChanged notifications processed |
| FR-CR-004 | Registry exposed via API | Must | GET /api/mcp/tools, /api/mcp/resources |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement | Priority | Target | Measurement |
|----|-------------|----------|--------|-------------|
| NFR-PF-001 | Tool invocation overhead | Must | <50ms added latency | Instrumentation |
| NFR-PF-002 | Resource read overhead | Must | <25ms added latency | Instrumentation |
| NFR-PF-003 | Connection establishment | Should | <2s for stdio | Instrumentation |
| NFR-PF-004 | Concurrent server support | Should | 10+ servers | Load test |

### 5.2 Reliability

| ID | Requirement | Priority | Target | Measurement |
|----|-------------|----------|--------|-------------|
| NFR-RL-001 | Connection retry on failure | Must | 3 retries, exponential backoff | Manual test |
| NFR-RL-002 | Graceful handling of server crash | Must | Reconnect attempt, clear error | Manual test |
| NFR-RL-003 | No data loss on disconnect | Must | Pending operations complete or error | Manual test |

### 5.3 Usability

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| NFR-US-001 | Clear connection status indicators | Must | Visual distinction between states |
| NFR-US-002 | Helpful error messages | Must | Include server name, tool name, cause |
| NFR-US-003 | Autocomplete for tools in editor | Should | TypeScript types generated |

---

## 6. API Design

### 6.1 Client Capabilities Declaration

```json
{
  "capabilities": {
    "sampling": {
      "tools": {}
    },
    "roots": {
      "listChanged": true
    }
  }
}
```

### 6.2 Server Configuration Schema

```typescript
interface MCPServerConfig {
  id: string;                  // UUID
  name: string;                // Display name
  transport: 'stdio' | 'http';

  // For stdio transport
  command?: string;            // e.g., "npx"
  args?: string[];             // e.g., ["-y", "@modelcontextprotocol/server-postgres"]
  env?: Record<string, string>; // e.g., { DATABASE_URL: "..." }

  // For HTTP transport
  url?: string;                // e.g., "https://mcp.example.com"
  headers?: Record<string, string>; // Auth headers (encrypted at rest)

  // Connection settings
  autoConnect: boolean;        // Connect on Srcbook startup
  enabled: boolean;            // Can be disabled without deletion
  timeout: number;             // Invocation timeout (ms), default 30000
}
```

> **Security Note**: The `headers` and `env` fields may contain sensitive credentials (tokens, database passwords). These are stored encrypted in the database using the application secret. See [03-mcp-security.md § 4.2.1](./03-mcp-security.md#421-authentication-mechanism-gap-001-resolution) for encryption details.

### 6.3 REST API Endpoints

#### Server Management

```
GET    /api/mcp/servers
  Response: { servers: MCPServerConfig[] }

POST   /api/mcp/servers
  Body: Omit<MCPServerConfig, 'id'>
  Response: { server: MCPServerConfig }

PUT    /api/mcp/servers/:id
  Body: Partial<MCPServerConfig>
  Response: { server: MCPServerConfig }

DELETE /api/mcp/servers/:id
  Response: { success: true }

POST   /api/mcp/servers/:id/connect
  Response: { connected: true, capabilities: ServerCapabilities }

POST   /api/mcp/servers/:id/disconnect
  Response: { disconnected: true }
```

#### Capability Discovery

```
GET    /api/mcp/tools
  Response: {
    tools: Array<{
      serverId: string;
      serverName: string;
      tool: Tool;
    }>
  }

GET    /api/mcp/resources
  Response: {
    resources: Array<{
      serverId: string;
      serverName: string;
      resource: Resource;
    }>
  }
```

#### Tool Invocation

```
POST   /api/mcp/tools/invoke
  Body: {
    serverId: string;
    toolName: string;
    arguments: Record<string, unknown>;
  }
  Response: { result: unknown } | { error: string }
```

#### Resource Access

```
GET    /api/mcp/resources/read?serverId=...&uri=...
  Response: { content: unknown, mimeType: string }

POST   /api/mcp/resources/subscribe
  Body: { serverId: string; uri: string }
  Response: { subscriptionId: string }
  // Updates delivered via WebSocket

DELETE /api/mcp/resources/subscribe/:subscriptionId
  Response: { unsubscribed: true }
```

### 6.4 Notebook API (Available in Cells)

```typescript
// @srcbook/mcp module (injected into notebook runtime)

// Tools
const mcpTools: {
  listServers(): Promise<ServerInfo[]>;
  listTools(): Promise<ToolInfo[]>;
  [serverName: string]: {
    [toolName: string]: (args: unknown) => Promise<unknown>;
  };
};

// Resources
const mcpResources: {
  list(): Promise<ResourceInfo[]>;
  read(uri: string): Promise<unknown>;
  subscribe(uri: string, callback: (data: unknown) => void): Promise<Subscription>;
  unsubscribeAll(): Promise<void>;
};

// Sampling (when available)
const mcpSampling: {
  available(): boolean;
  createMessage(request: SamplingRequest): Promise<SamplingResponse>;
};
```

### 6.5 WebSocket Messages

MCP client operations use the existing Srcbook WebSocket protocol with the `[topic, event, payload]` format:

```typescript
// Topic: "mcp:client" or "mcp:client:{serverId}"
// Events follow the pattern defined in 00-mcp-foundation.md § 6.2

// Client → Server (browser → Srcbook backend)
// Topic: "mcp:client"
['mcp:client', 'tool:invoke', { serverId, toolName, arguments, requestId }]
['mcp:client', 'resource:read', { serverId, uri, requestId }]
['mcp:client', 'resource:subscribe', { serverId, uri }]
['mcp:client', 'resource:unsubscribe', { serverId, uri }]
['mcp:client', 'server:connect', { serverId }]
['mcp:client', 'server:disconnect', { serverId }]

// Server → Client (Srcbook backend → browser)
['mcp:client', 'tool:result', { requestId, result }]
['mcp:client', 'tool:error', { requestId, error: { code, message } }]
['mcp:client', 'resource:content', { requestId, content, mimeType }]
['mcp:client', 'resource:updated', { serverId, uri, content }]
['mcp:client', 'server:status', { serverId, status, capabilities?, error? }]
['mcp:client', 'registry:updated', { tools, resources, prompts }]
```

> **Protocol Reference**: See [00-mcp-foundation.md § 6.2](./00-mcp-foundation.md#62-with-existing-websocket-protocol-gap-002-resolution) for the complete WebSocket message schema including Zod validation types.

---

## 7. Data Model

### 7.1 Database Tables

```sql
-- Already defined in 00-mcp-foundation.md
-- mcp_servers, mcp_tool_invocations, mcp_resource_subscriptions
```

### 7.2 In-Memory State

```typescript
interface MCPClientState {
  connections: Map<string, {
    serverId: string;
    client: Client;  // from @modelcontextprotocol/sdk
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
    capabilities: ServerCapabilities;
    error?: Error;
  }>;

  registry: {
    tools: Map<string, { serverId: string; tool: Tool }>;
    resources: Map<string, { serverId: string; resource: Resource }>;
    prompts: Map<string, { serverId: string; prompt: Prompt }>;
  };

  subscriptions: Map<string, {
    serverId: string;
    uri: string;
    callbacks: Set<(data: unknown) => void>;
  }>;
}
```

---

## 8. UI Components

### 8.1 Settings → MCP Servers Page

```
┌─────────────────────────────────────────────────────────────┐
│ Settings > MCP Servers                                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Connected Servers                                            │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ ● PostgreSQL Database    stdio    Connected    [···]     ││
│ │ ○ File System            stdio    Disconnected [···]     ││
│ │ ○ Web APIs               http     Error        [···]     ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ [+ Add Server]                                               │
│                                                              │
│ Available Capabilities (12 tools, 5 resources)               │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Tools:                                                    ││
│ │   • database.query_users                                  ││
│ │   • database.insert_record                                ││
│ │   • filesystem.read_file                                  ││
│ │   • filesystem.write_file                                 ││
│ │   ...                                                     ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Add Server Dialog

```
┌─────────────────────────────────────────────────────────────┐
│ Add MCP Server                                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Name:        [PostgreSQL Server                    ]         │
│                                                              │
│ Transport:   ○ stdio (process)   ● HTTP                      │
│                                                              │
│ ─── stdio options ───────────────────────────────────────── │
│ Command:     [npx                                  ]         │
│ Arguments:   [-y, @modelcontextprotocol/server-postgres]     │
│ Environment:                                                 │
│   DATABASE_URL = [postgresql://localhost:5432/db  ]          │
│   [+ Add variable]                                           │
│                                                              │
│ ─── Settings ────────────────────────────────────────────── │
│ ☑ Auto-connect on startup                                    │
│ ☑ Enabled                                                    │
│ Timeout:     [30000] ms                                      │
│                                                              │
│                              [Cancel]  [Test Connection]     │
│                                           [Add Server]       │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Notebook Tool Palette (Enhancement)

Add MCP tools to the cell creation menu:

```
┌─────────────────────────────────────┐
│ + Add Cell                          │
├─────────────────────────────────────┤
│ 📝 Markdown                         │
│ 💻 Code                             │
│ ─────────────────────────────────── │
│ 🔧 MCP Tools                        │
│   └─ PostgreSQL                     │
│      ├─ query_users                 │
│      └─ insert_record               │
│   └─ File System                    │
│      ├─ read_file                   │
│      └─ write_file                  │
└─────────────────────────────────────┘
```

### 8.4 Notebook Status Indicator

Show MCP connection status in notebook header:

```
┌──────────────────────────────────────────────────────────────┐
│ 📓 My Analysis Notebook          🔗 3 MCP servers connected   │
└──────────────────────────────────────────────────────────────┘
```

---

## 9. Migration Path

### 9.1 New Installations

- MCP client infrastructure installed with Srcbook
- Settings page shows empty server list
- No servers configured by default

### 9.2 Existing Installations

- Database migration adds MCP tables
- Settings page appears with MCP Servers section
- No breaking changes to existing notebooks

### 9.3 Notebook Compatibility

| Concern | Mitigation |
|---------|------------|
| `@srcbook/mcp` import fails | Module available but empty if no servers |
| Tools not available | Returns empty object, doesn't throw |
| Resources not available | Returns empty list |

---

## 10. Acceptance Criteria

### 10.1 Connection Tests

| Test | Expected Result |
|------|-----------------|
| Add stdio server via UI | Server appears in list |
| Connect to server | Status changes to "Connected" |
| Disconnect from server | Status changes to "Disconnected" |
| Delete server | Server removed from list |
| Auto-connect on startup | Enabled servers connect automatically |

### 10.2 Tool Invocation Tests

| Test | Expected Result |
|------|-----------------|
| List tools from connected server | Tools appear in registry |
| Invoke tool from notebook | Result returned to cell |
| Tool with invalid input | Clear error message |
| Tool timeout | Timeout error after configured duration |

### 10.3 Resource Access Tests

| Test | Expected Result |
|------|-----------------|
| List resources | Resources from all servers |
| Read resource | Content returned |
| Subscribe to resource | Notification on update |
| Unsubscribe | No more notifications |

### 10.4 Integration Tests

| Scenario | Expected Result |
|----------|-----------------|
| Query PostgreSQL via MCP | Data returned to notebook |
| Read file via MCP | File content accessible |
| Multi-server workflow | Tools from different servers work together |
| AI with MCP sampling | Generation uses sampling when available |

---

**Cross-References:**
- [00-mcp-foundation.md](./00-mcp-foundation.md) - Architecture overview
- [01-mcp-server.md](./01-mcp-server.md) - Server implementation
- [03-mcp-security.md](./03-mcp-security.md) - Security requirements
- [04-mcp-testing.md](./04-mcp-testing.md) - Testing strategy

**Source Material:**
- `docs/mcp-integration-spec.md` - Client implementation details
- `docs/mcp-quick-reference.md` - API reference
- `docs/mcp-example-notebook.src.md` - Usage examples
