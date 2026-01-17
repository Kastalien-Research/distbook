# MCP Server Implementation Specification

**Version:** 1.0.0
**Date:** 2026-01-13
**Status:** Draft
**Author:** AI-assisted via @loops/authoring/spec-drafting
**Depends on:** [00-mcp-foundation.md](./00-mcp-foundation.md)
**Source:** `docs/mcp-integration-spec.md`, `docs/mcp-quick-reference.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Background](#2-background)
3. [User Stories](#3-user-stories)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [API Design](#6-api-design)
7. [Data Model](#7-data-model)
8. [Migration Path](#8-migration-path)
9. [Acceptance Criteria](#9-acceptance-criteria)

---

## 1. Executive Summary

This specification defines the MCP Server implementation for Srcbook, enabling external AI agents and applications to control notebooks through the Model Context Protocol. The server exposes:

- **12 Tools**: Complete notebook lifecycle management
- **5 Resource Types**: Real-time access to notebook state
- **3 Prompt Templates**: Common workflow templates

This transforms Srcbook into an agent-controllable notebook platform.

---

## 2. Background

### Current State

Srcbook notebooks are currently controlled through:
- Web UI (primary)
- REST API (limited automation)
- WebSocket events (real-time sync)

### Desired State

AI agents should be able to:
1. Discover Srcbook capabilities through MCP
2. Create and manage notebooks programmatically
3. Execute code and retrieve results
4. Subscribe to real-time updates
5. Use prompt templates for common workflows

### Success Criteria

- Claude Desktop can create and execute Srcbook notebooks
- VS Code MCP extension can control notebooks
- Custom agents can build complete workflows

---

## 3. User Stories

### Agent Users

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|---------------------|
| US-001 | As an AI agent, I want to create notebooks so I can automate analysis tasks | Must | Agent calls `notebook_create`, receives valid sessionId |
| US-002 | As an AI agent, I want to add code cells so I can build computational workflows | Must | Agent calls `cell_create` with code, cell appears in notebook |
| US-003 | As an AI agent, I want to execute cells and get output so I can iterate on results | Must | Agent calls `cell_execute`, receives stdout/stderr |
| US-004 | As an AI agent, I want to read notebook state so I can understand current context | Must | Agent reads `srcbook://session/{id}` resource |
| US-005 | As an AI agent, I want to subscribe to cell updates so I can react to changes | Should | Agent receives notifications when cells change |
| US-006 | As an AI agent, I want prompt templates so I can bootstrap common workflows | Should | Agent uses `create_analysis_notebook` prompt |

### Human Users

| ID | Story | Priority | Acceptance Criteria |
|----|-------|----------|---------------------|
| US-007 | As a user, I want to see when agents are controlling my notebook | Should | UI indicator shows MCP session active |
| US-008 | As a user, I want to approve sensitive operations | Should | Prompt appears before delete operations |
| US-009 | As a user, I want to disconnect agents | Must | Can terminate MCP session from UI |

---

## 4. Functional Requirements

### 4.1 Server Lifecycle

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-SL-001 | Server starts with Srcbook application | Must | MCP endpoint available when Srcbook starts |
| FR-SL-002 | Server supports Streamable HTTP transport | Must | POST/GET /mcp endpoints functional |
| FR-SL-003 | Server supports stdio transport | Should | `npx srcbook mcp-server` works |
| FR-SL-004 | Server handles graceful shutdown | Must | In-flight requests complete, subscriptions close |
| FR-SL-005 | Server supports multiple concurrent clients | Should | At least 10 simultaneous connections |
| FR-SL-006 | Server validates authentication (HTTP transport) | Must | Bearer token required, validated per SEC-AA-006 |
| FR-SL-007 | Server trusts local stdio connections | Must | Implicit trust for Srcbook-spawned processes |

> **Auth Reference**: See [03-mcp-security.md § 4.2.1](./03-mcp-security.md#421-authentication-mechanism-gap-001-resolution) for full authentication mechanism specification.

### 4.2 Notebook Management Tools

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-NB-001 | `notebook_create` creates new notebook | Must | Returns valid sessionId, notebook accessible |
| FR-NB-002 | `notebook_list` returns all notebooks | Must | Returns array with sessionId, title, language |
| FR-NB-003 | `notebook_open` opens existing notebook | Must | Works with path or sessionId |
| FR-NB-004 | `notebook_delete` deletes notebook | Must | Notebook removed, returns success |
| FR-NB-005 | `notebook_export` exports to .src.md | Must | Returns valid markdown content |

### 4.3 Cell Operation Tools

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-CE-001 | `cell_create` creates cell at position | Must | Cell appears at correct index |
| FR-CE-002 | `cell_update` modifies cell content | Must | Content persisted, UI updates |
| FR-CE-003 | `cell_delete` removes cell | Must | Cell removed, indices adjust |
| FR-CE-004 | `cell_move` repositions cell | Must | Cell moves to new index |
| FR-CE-005 | Cell operations validate sessionId exists | Must | Returns error for invalid session |

### 4.4 Execution Control Tools

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-EX-001 | `cell_execute` runs code cell | Must | Returns stdout, stderr, exitCode |
| FR-EX-002 | `cell_execute` blocks until complete | Must | Response includes full output |
| FR-EX-003 | `cell_stop` terminates execution | Must | Running cell stops, returns status |
| FR-EX-004 | `deps_install` installs npm packages | Must | Packages added to package.json |
| FR-EX-005 | Execution respects notebook timeout settings | Should | Long-running cells timeout appropriately |

### 4.5 Resource Providers

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-RS-001 | `srcbook://notebooks` lists all notebooks | Must | Returns JSON array |
| FR-RS-002 | `srcbook://session/{id}` returns full state | Must | Includes all cells and metadata |
| FR-RS-003 | `srcbook://session/{id}/cell/{cellId}` returns cell | Must | Returns cell content and type |
| FR-RS-004 | `srcbook://session/{id}/cell/{cellId}/output` returns output | Must | Returns last execution output |
| FR-RS-005 | Resources support subscription | Should | Changes pushed to subscribers |
| FR-RS-006 | Invalid URIs return clear errors | Must | Error message indicates issue |

### 4.6 Prompt Templates

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| FR-PR-001 | `create_analysis_notebook` generates data analysis template | Should | Returns structured prompt with cells |
| FR-PR-002 | `debug_code_cell` generates debugging prompt | Should | Returns prompt with error context |
| FR-PR-003 | `optimize_notebook` generates optimization suggestions | Could | Returns analysis of notebook structure |
| FR-PR-004 | Prompts accept required arguments | Must | Error if required args missing |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement | Priority | Target | Measurement |
|----|-------------|----------|--------|-------------|
| NFR-PF-001 | Tool invocation latency | Must | <100ms p95 | Instrumentation |
| NFR-PF-002 | Resource read latency | Must | <50ms p95 | Instrumentation |
| NFR-PF-003 | Subscription notification latency | Should | <10ms p95 | Timestamp delta |
| NFR-PF-004 | Concurrent client support | Should | 10+ | Load test |

### 5.2 Reliability

| ID | Requirement | Priority | Target | Measurement |
|----|-------------|----------|--------|-------------|
| NFR-RL-001 | Tool invocation success rate | Must | >99% | Error rate monitoring |
| NFR-RL-002 | Server uptime | Must | 99.9% | Availability monitoring |
| NFR-RL-003 | Graceful degradation | Should | N/A | Manual testing |

### 5.3 Compatibility

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| NFR-CP-001 | MCP protocol 2025-11-25 | Must | Passes protocol conformance tests |
| NFR-CP-002 | Works with Claude Desktop | Must | Manual verification |
| NFR-CP-003 | Works with VS Code MCP | Should | Manual verification |
| NFR-CP-004 | Works with MCP Inspector | Must | Debug tool functional |

---

## 6. API Design

### 6.1 Server Capabilities Declaration

```json
{
  "protocolVersion": "2025-11-25",
  "capabilities": {
    "tools": {
      "listChanged": true
    },
    "resources": {
      "subscribe": true,
      "listChanged": true
    },
    "prompts": {
      "listChanged": true
    }
  },
  "serverInfo": {
    "name": "srcbook",
    "version": "1.0.0"
  }
}
```

### 6.1.1 HTTP Transport Authentication

All HTTP transport requests MUST include a Bearer token:

```http
POST /mcp HTTP/1.1
Host: localhost:2150
Authorization: Bearer srcbook_mcp_<base64url_token>
Content-Type: application/json
```

**Token Generation**: Tokens are created via the `/api/mcp/tokens` endpoint (see [03-mcp-security.md § 4.2.1](./03-mcp-security.md#421-authentication-mechanism-gap-001-resolution)).

**Error Responses**:
| HTTP Status | Error | Description |
|-------------|-------|-------------|
| 401 | `missing_authorization` | No Authorization header |
| 401 | `invalid_token_format` | Token doesn't match expected format |
| 401 | `token_expired` | Token has expired |
| 401 | `token_revoked` | Token has been revoked |
| 403 | `insufficient_permissions` | Token lacks required permission |

### 6.1.2 WebSocket Protocol Integration

MCP operations are also available via WebSocket using the existing `[topic, event, payload]` format.

**Topic**: `mcp:server`

**Events** (see [00-mcp-foundation.md § 6.2](./00-mcp-foundation.md#62-with-existing-websocket-protocol-gap-002-resolution) for full list):
- `tool:invoke` / `tool:result` / `tool:error`
- `resource:read` / `resource:content`
- `resource:subscribe` / `resource:unsubscribe` / `resource:updated`

WebSocket connections inherit authentication from the web session (no separate token required).

### 6.2 Tool Definitions

#### Notebook Management

```typescript
// notebook_create
{
  name: "notebook_create",
  description: "Create a new TypeScript or JavaScript notebook",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Title of the notebook" },
      language: {
        type: "string",
        enum: ["typescript", "javascript"],
        default: "typescript"
      }
    },
    required: ["title"]
  }
}

// notebook_list
{
  name: "notebook_list",
  description: "List all available Srcbook notebooks",
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "number", default: 50 },
      offset: { type: "number", default: 0 }
    }
  }
}

// notebook_open
{
  name: "notebook_open",
  description: "Open an existing Srcbook notebook",
  inputSchema: {
    type: "object",
    properties: {
      path: { type: "string", description: "File system path to .src.md" },
      sessionId: { type: "string", description: "Existing session ID" }
    },
    oneOf: [{ required: ["path"] }, { required: ["sessionId"] }]
  }
}

// notebook_delete
{
  name: "notebook_delete",
  description: "Delete a Srcbook notebook",
  inputSchema: {
    type: "object",
    properties: {
      sessionId: { type: "string" }
    },
    required: ["sessionId"]
  }
}

// notebook_export
{
  name: "notebook_export",
  description: "Export a notebook to .src.md markdown format",
  inputSchema: {
    type: "object",
    properties: {
      sessionId: { type: "string" }
    },
    required: ["sessionId"]
  }
}
```

#### Cell Operations

```typescript
// cell_create
{
  name: "cell_create",
  description: "Create a new cell in a notebook",
  inputSchema: {
    type: "object",
    properties: {
      sessionId: { type: "string" },
      type: { type: "string", enum: ["code", "markdown"] },
      content: { type: "string" },
      index: { type: "number", description: "Position (default: end)" },
      filename: { type: "string", description: "For code cells (auto-generated if omitted)" }
    },
    required: ["sessionId", "type", "content"]
  }
}

// cell_update
{
  name: "cell_update",
  description: "Update the content of a cell",
  inputSchema: {
    type: "object",
    properties: {
      sessionId: { type: "string" },
      cellId: { type: "string" },
      content: { type: "string" }
    },
    required: ["sessionId", "cellId", "content"]
  }
}

// cell_delete
{
  name: "cell_delete",
  description: "Delete a cell from a notebook",
  inputSchema: {
    type: "object",
    properties: {
      sessionId: { type: "string" },
      cellId: { type: "string" }
    },
    required: ["sessionId", "cellId"]
  }
}

// cell_move
{
  name: "cell_move",
  description: "Move a cell to a different position",
  inputSchema: {
    type: "object",
    properties: {
      sessionId: { type: "string" },
      cellId: { type: "string" },
      newIndex: { type: "number" }
    },
    required: ["sessionId", "cellId", "newIndex"]
  }
}
```

#### Execution Control

```typescript
// cell_execute
{
  name: "cell_execute",
  description: "Execute a code cell and return the output",
  inputSchema: {
    type: "object",
    properties: {
      sessionId: { type: "string" },
      cellId: { type: "string" }
    },
    required: ["sessionId", "cellId"]
  }
}

// cell_stop
{
  name: "cell_stop",
  description: "Stop a running cell execution",
  inputSchema: {
    type: "object",
    properties: {
      sessionId: { type: "string" },
      cellId: { type: "string" }
    },
    required: ["sessionId", "cellId"]
  }
}

// deps_install
{
  name: "deps_install",
  description: "Install npm dependencies for a notebook",
  inputSchema: {
    type: "object",
    properties: {
      sessionId: { type: "string" },
      packages: {
        type: "array",
        items: { type: "string" },
        description: "Package names (e.g., ['lodash', 'axios'])"
      }
    },
    required: ["sessionId", "packages"]
  }
}
```

### 6.3 Resource URIs

| URI Pattern | Description | MIME Type | Subscribable |
|-------------|-------------|-----------|--------------|
| `srcbook://notebooks` | List of all notebooks | application/json | No |
| `srcbook://session/{sessionId}` | Complete notebook state | application/json | Yes |
| `srcbook://session/{sessionId}/cell/{cellId}` | Individual cell | application/json | Yes |
| `srcbook://session/{sessionId}/cell/{cellId}/output` | Cell execution output | text/plain | Yes |
| `srcbook://session/{sessionId}/package.json` | npm dependencies | application/json | Yes |

### 6.4 Resource Content Schemas

```typescript
// srcbook://notebooks
interface NotebookList {
  notebooks: Array<{
    sessionId: string;
    title: string;
    language: "typescript" | "javascript";
    cellCount: number;
    updatedAt: string;
  }>;
  total: number;
}

// srcbook://session/{sessionId}
interface SessionState {
  sessionId: string;
  title: string;
  language: "typescript" | "javascript";
  cells: Array<{
    id: string;
    type: "code" | "markdown" | "title";
    content: string;
    filename?: string;
    output?: string;
  }>;
  dependencies: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// srcbook://session/{sessionId}/cell/{cellId}
interface CellContent {
  id: string;
  type: "code" | "markdown" | "title";
  content: string;
  filename?: string;
}

// srcbook://session/{sessionId}/cell/{cellId}/output
interface CellOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  executedAt: string;
}
```

### 6.5 Prompt Definitions

```typescript
// create_analysis_notebook
{
  name: "create_analysis_notebook",
  description: "Create a data analysis notebook with standard structure",
  arguments: [
    { name: "dataset_description", description: "Dataset to analyze", required: true },
    { name: "analysis_goals", description: "Insights to extract", required: true }
  ]
}

// debug_code_cell
{
  name: "debug_code_cell",
  description: "Debug a failing code cell",
  arguments: [
    { name: "cell_content", description: "The failing code", required: true },
    { name: "error_message", description: "The error received", required: true }
  ]
}

// optimize_notebook
{
  name: "optimize_notebook",
  description: "Suggest optimizations for notebook performance and structure",
  arguments: [
    { name: "session_id", description: "The notebook to optimize", required: true }
  ]
}
```

---

## 7. Data Model

### 7.1 Tool Invocation Logging

All tool invocations are logged for auditing:

```typescript
interface ToolInvocationLog {
  id: number;
  sessionId: string;
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  durationMs: number;
  createdAt: Date;
}
```

### 7.2 Subscription State

```typescript
interface ResourceSubscription {
  id: string;
  clientId: string;
  uri: string;
  active: boolean;
  lastNotified: Date;
}
```

---

## 8. Migration Path

### 8.1 New Installations

- MCP server starts automatically with Srcbook
- Default configuration exposes HTTP transport on port 2150
- No additional setup required

### 8.2 Existing Installations

- Database migration adds MCP tables
- No changes to existing functionality
- MCP can be disabled via configuration

### 8.3 Backward Compatibility

| Concern | Mitigation |
|---------|------------|
| Existing API endpoints | No changes, MCP is additive |
| Existing WebSocket protocol | Extended, not modified |
| Existing database schema | New tables added, existing unchanged |

---

## 9. Acceptance Criteria

### 9.1 Integration Tests

| Test | Expected Result |
|------|-----------------|
| Create notebook via MCP | Notebook visible in UI and API |
| Add cells via MCP | Cells appear in correct order |
| Execute cell via MCP | Output matches direct execution |
| Read notebook resource | Returns accurate state |
| Subscribe to cell changes | Receives notification on edit |
| Use prompt template | Returns valid prompt content |

### 9.2 Compatibility Tests

| Client | Test | Expected Result |
|--------|------|-----------------|
| Claude Desktop | Add to config, invoke tools | Tools work correctly |
| MCP Inspector | Connect, list capabilities | All tools/resources visible |
| Custom client | Use SDK to connect | Full functionality available |

### 9.3 Performance Tests

| Test | Target | Method |
|------|--------|--------|
| Tool latency | <100ms p95 | Benchmark 1000 invocations |
| Resource read latency | <50ms p95 | Benchmark 1000 reads |
| Subscription delivery | <10ms p95 | Measure notification delay |
| Concurrent clients | 10+ | Load test with concurrent connections |

---

**Cross-References:**
- [00-mcp-foundation.md](./00-mcp-foundation.md) - Architecture overview
- [02-mcp-client.md](./02-mcp-client.md) - Client implementation
- [03-mcp-security.md](./03-mcp-security.md) - Security requirements
- [04-mcp-testing.md](./04-mcp-testing.md) - Testing strategy

**Source Material:**
- `docs/mcp-integration-spec.md` - Tool schemas
- `docs/mcp-quick-reference.md` - API reference
