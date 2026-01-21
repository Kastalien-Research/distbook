# MCP Integration - Implementation Specification

**Version:** 1.0
**Date:** 2026-01-14
**Status:** Implementation-Ready
**Output:** `packages/api/srcbook/examples/internals/mcp-integration.src.md`
**Dependencies:** WebSocket Protocol Srcbook

---

## 1. Overview

This specification defines the implementation of an educational Srcbook that explains how Srcbook integrates with the Model Context Protocol (MCP) for tool and resource sharing with AI systems.

### Learning Objectives

1. Understand MCP architecture (server and client modes)
2. Learn how Srcbook exposes tools and resources via MCP
3. Comprehend the client connection management
4. Know how to extend MCP capabilities

---

## 2. File Structure

### 2.1 Srcbook Metadata

```markdown
<!-- srcbook:{"language":"typescript"} -->
```

### 2.2 Required Sections

| Section | Type | Purpose |
|---------|------|---------|
| Title | Title Cell | "MCP Integration - AI Tool Interoperability" |
| package.json | Package Cell | MCP SDK dependencies |
| Introduction | Markdown | Context and objectives |
| Key Concepts | Markdown | Server/client architecture |
| Simple Demo | Code | Basic MCP tool definition |
| Explanation | Markdown | Protocol mechanics |
| Advanced Demo | Code | Full MCP server/client |
| Deep Dive | Markdown | Srcbook's implementation |
| Interactive Exercise | Code | Build custom tool |
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
    "typescript": "latest",
    "zod": "^3.23.8"
  }
}
```

### 3.2 Introduction Content

**What is MCP Integration?**
- Model Context Protocol (MCP) enables AI tools to share capabilities
- Srcbook operates in two modes:
  - **Server Mode**: Exposes Srcbook functionality as MCP tools
  - **Client Mode**: Connects to external MCP servers for additional tools
- Enables AI assistants to create notebooks, run code, manage apps

**Why does it matter?**
- Understanding enables building MCP-compatible tools
- Necessary for extending AI capabilities
- Foundation for AI-assisted workflows

### 3.3 Key Concepts - Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Architecture                          │
│                                                              │
│  SERVER MODE (Srcbook as MCP Provider)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │  External AI (Claude, etc.)                          │   │
│  │         │                                            │   │
│  │         ▼ MCP Protocol                               │   │
│  │  ┌─────────────────────────────────────┐            │   │
│  │  │      Srcbook MCP Server             │            │   │
│  │  │                                     │            │   │
│  │  │  Tools:                             │            │   │
│  │  │  • notebook_create                  │            │   │
│  │  │  • cell_execute                     │            │   │
│  │  │  • deps_install                     │            │   │
│  │  │  • ...                              │            │   │
│  │  │                                     │            │   │
│  │  │  Resources:                         │            │   │
│  │  │  • srcbook://notebooks              │            │   │
│  │  │  • srcbook://session/{id}           │            │   │
│  │  │  • ...                              │            │   │
│  │  └─────────────────────────────────────┘            │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  CLIENT MODE (Srcbook connecting to MCP Servers)             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │  ┌─────────────┐    ┌─────────────┐                 │   │
│  │  │ Filesystem  │    │   GitHub    │                 │   │
│  │  │ MCP Server  │    │ MCP Server  │  ...            │   │
│  │  └──────┬──────┘    └──────┬──────┘                 │   │
│  │         │                  │                         │   │
│  │         ▼                  ▼                         │   │
│  │  ┌─────────────────────────────────────┐            │   │
│  │  │    Srcbook MCP Client Manager       │            │   │
│  │  │                                     │            │   │
│  │  │  • Connection management            │            │   │
│  │  │  • Tool discovery                   │            │   │
│  │  │  • Resource subscriptions           │            │   │
│  │  └─────────────────────────────────────┘            │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Simple Demo

**Filename:** `simple-mcp-tools.ts`

```typescript
// Demonstrate MCP tool definition patterns

import { z } from 'zod';

// Tool definition schema (from @srcbook/shared)
const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.object({
      type: z.string(),
      description: z.string().optional(),
    })),
    required: z.array(z.string()).optional(),
  }),
});

type MCPTool = z.infer<typeof MCPToolSchema>;

// Resource definition schema
const MCPResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});

type MCPResource = z.infer<typeof MCPResourceSchema>;

// Srcbook's MCP tools (simplified from mcp/tools/)
const srcbookTools: MCPTool[] = [
  {
    name: 'notebook_create',
    description: 'Create a new Srcbook notebook',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Notebook title' },
        language: { type: 'string', description: 'typescript or javascript' },
      },
      required: ['title'],
    },
  },
  {
    name: 'cell_create',
    description: 'Create a new cell in a notebook',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        type: { type: 'string', description: 'code or markdown' },
        content: { type: 'string', description: 'Cell content' },
        index: { type: 'number', description: 'Position to insert' },
      },
      required: ['sessionId', 'type', 'content'],
    },
  },
  {
    name: 'cell_execute',
    description: 'Execute a code cell',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        cellId: { type: 'string', description: 'Cell ID to execute' },
      },
      required: ['sessionId', 'cellId'],
    },
  },
  {
    name: 'deps_install',
    description: 'Install npm dependencies',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID' },
        packages: {
          type: 'array',
          description: 'Package names to install',
        },
      },
      required: ['sessionId', 'packages'],
    },
  },
];

// Srcbook's MCP resources
const srcbookResources: MCPResource[] = [
  {
    uri: 'srcbook://notebooks',
    name: 'Notebooks List',
    description: 'List of all Srcbook notebooks',
    mimeType: 'application/json',
  },
  {
    uri: 'srcbook://session/{sessionId}',
    name: 'Session Details',
    description: 'Full session data including cells',
    mimeType: 'application/json',
  },
  {
    uri: 'srcbook://session/{sessionId}/cell/{cellId}',
    name: 'Cell Content',
    description: 'Single cell content and metadata',
    mimeType: 'application/json',
  },
];

// Demo
console.log('=== MCP Tools & Resources Demo ===\n');

console.log('📋 Srcbook MCP Tools:');
srcbookTools.forEach(tool => {
  console.log(`\n🔧 ${tool.name}`);
  console.log(`   ${tool.description}`);
  console.log(`   Parameters:`);
  Object.entries(tool.inputSchema.properties).forEach(([name, prop]) => {
    const required = tool.inputSchema.required?.includes(name) ? '*' : '';
    console.log(`     - ${name}${required}: ${prop.type}`);
  });
});

console.log('\n\n📚 Srcbook MCP Resources:');
srcbookResources.forEach(resource => {
  console.log(`\n📄 ${resource.uri}`);
  console.log(`   Name: ${resource.name}`);
  console.log(`   Type: ${resource.mimeType}`);
});

// Validate schemas
console.log('\n\n✅ Schema Validation:');
srcbookTools.forEach(tool => {
  const result = MCPToolSchema.safeParse(tool);
  console.log(`  ${tool.name}: ${result.success ? '✅' : '❌'}`);
});
```

### 3.5 Advanced Demo

**Filename:** `mcp-server-client.ts`

```typescript
// Full MCP server and client implementation patterns

import { z } from 'zod';
import { EventEmitter } from 'events';

// Tool handler type
type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

// Resource content type
interface ResourceContent {
  uri: string;
  mimeType: string;
  content: string | object;
}

// MCP Server implementation (simplified from mcp/server/)
class MCPServer extends EventEmitter {
  private tools: Map<string, { schema: object; handler: ToolHandler }> = new Map();
  private resources: Map<string, () => Promise<ResourceContent>> = new Map();
  private resourceSubscriptions: Map<string, Set<(content: ResourceContent) => void>> = new Map();

  // Register a tool
  registerTool(
    name: string,
    schema: object,
    handler: ToolHandler
  ): void {
    this.tools.set(name, { schema, handler });
    console.log(`📝 Registered tool: ${name}`);
  }

  // Register a resource
  registerResource(
    uri: string,
    getter: () => Promise<ResourceContent>
  ): void {
    this.resources.set(uri, getter);
    console.log(`📝 Registered resource: ${uri}`);
  }

  // List available tools (MCP protocol method)
  async listTools(): Promise<Array<{ name: string; inputSchema: object }>> {
    return Array.from(this.tools.entries()).map(([name, { schema }]) => ({
      name,
      inputSchema: schema,
    }));
  }

  // List available resources
  async listResources(): Promise<Array<{ uri: string; name: string }>> {
    return Array.from(this.resources.keys()).map(uri => ({
      uri,
      name: uri.split('/').pop() || uri,
    }));
  }

  // Call a tool
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    console.log(`🔧 Calling tool: ${name}`);
    const result = await tool.handler(args);
    console.log(`   Result:`, typeof result === 'object' ? JSON.stringify(result).slice(0, 50) : result);

    return result;
  }

  // Read a resource
  async readResource(uri: string): Promise<ResourceContent> {
    // Handle parameterized URIs
    const baseUri = uri.replace(/\/[^\/]+$/, '/{id}');
    const getter = this.resources.get(uri) || this.resources.get(baseUri);

    if (!getter) {
      throw new Error(`Resource not found: ${uri}`);
    }

    console.log(`📖 Reading resource: ${uri}`);
    return getter();
  }

  // Subscribe to resource updates
  subscribeResource(uri: string, callback: (content: ResourceContent) => void): () => void {
    if (!this.resourceSubscriptions.has(uri)) {
      this.resourceSubscriptions.set(uri, new Set());
    }
    this.resourceSubscriptions.get(uri)!.add(callback);

    console.log(`👂 Subscribed to: ${uri}`);

    return () => {
      this.resourceSubscriptions.get(uri)?.delete(callback);
      console.log(`🔕 Unsubscribed from: ${uri}`);
    };
  }

  // Notify subscribers of resource change
  notifyResourceChange(uri: string, content: ResourceContent): void {
    const subscribers = this.resourceSubscriptions.get(uri);
    if (subscribers) {
      for (const callback of subscribers) {
        callback(content);
      }
    }
  }
}

// MCP Client implementation (simplified from mcp/client/)
class MCPClient extends EventEmitter {
  private connected = false;
  private serverCapabilities: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  } = {};

  constructor(
    private serverName: string,
    private transport: 'stdio' | 'http'
  ) {
    super();
  }

  async connect(): Promise<void> {
    console.log(`🔌 Connecting to ${this.serverName} via ${this.transport}...`);
    await new Promise(resolve => setTimeout(resolve, 100));

    this.connected = true;
    this.serverCapabilities = {
      tools: true,
      resources: true,
      prompts: false,
    };

    console.log(`✅ Connected! Capabilities:`, this.serverCapabilities);
    this.emit('connected');
  }

  async disconnect(): Promise<void> {
    console.log(`🔌 Disconnecting from ${this.serverName}...`);
    this.connected = false;
    this.emit('disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  async listTools(): Promise<Array<{ name: string; description: string }>> {
    if (!this.connected) throw new Error('Not connected');

    // In real implementation, this calls the server
    return [
      { name: 'read_file', description: 'Read a file from the filesystem' },
      { name: 'list_dir', description: 'List directory contents' },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.connected) throw new Error('Not connected');

    console.log(`🔧 [${this.serverName}] Calling: ${name}`);
    // In real implementation, this sends JSON-RPC to server
    return { success: true, tool: name, args };
  }
}

// MCP Client Manager (manages multiple connections)
class MCPClientManager {
  private clients: Map<string, MCPClient> = new Map();

  async addServer(config: { id: string; name: string; transport: 'stdio' | 'http' }): Promise<MCPClient> {
    const client = new MCPClient(config.name, config.transport);
    this.clients.set(config.id, client);
    return client;
  }

  async connectAll(): Promise<void> {
    for (const [id, client] of this.clients) {
      if (!client.isConnected()) {
        await client.connect();
      }
    }
  }

  getClient(id: string): MCPClient | undefined {
    return this.clients.get(id);
  }

  listClients(): Array<{ id: string; connected: boolean }> {
    return Array.from(this.clients.entries()).map(([id, client]) => ({
      id,
      connected: client.isConnected(),
    }));
  }

  async disconnectAll(): Promise<void> {
    for (const client of this.clients.values()) {
      if (client.isConnected()) {
        await client.disconnect();
      }
    }
  }
}

// Demo
async function demo() {
  console.log('=== MCP Server/Client Demo ===\n');

  // Create and configure MCP server (Srcbook acting as server)
  console.log('--- MCP SERVER MODE ---\n');

  const server = new MCPServer();

  // Register Srcbook tools
  server.registerTool(
    'notebook_create',
    {
      type: 'object',
      properties: {
        title: { type: 'string' },
        language: { type: 'string' },
      },
    },
    async (args) => {
      return {
        sessionId: `session-${Date.now()}`,
        title: args.title,
        language: args.language || 'typescript',
      };
    }
  );

  server.registerTool(
    'cell_execute',
    {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        cellId: { type: 'string' },
      },
    },
    async (args) => {
      return {
        exitCode: 0,
        stdout: 'Hello from Srcbook!',
        stderr: '',
      };
    }
  );

  // Register resources
  server.registerResource('srcbook://notebooks', async () => ({
    uri: 'srcbook://notebooks',
    mimeType: 'application/json',
    content: [
      { id: 'session-1', title: 'My Notebook' },
      { id: 'session-2', title: 'Tutorial' },
    ],
  }));

  // Test server operations
  console.log('\n📋 Available tools:');
  const tools = await server.listTools();
  tools.forEach(t => console.log(`  - ${t.name}`));

  console.log('\n🔧 Calling notebook_create:');
  const result = await server.callTool('notebook_create', {
    title: 'AI Generated Notebook',
    language: 'typescript',
  });
  console.log(`   Created:`, result);

  console.log('\n📖 Reading notebooks resource:');
  const notebooks = await server.readResource('srcbook://notebooks');
  console.log(`   Found ${(notebooks.content as any[]).length} notebooks`);

  // MCP Client mode (Srcbook connecting to external servers)
  console.log('\n\n--- MCP CLIENT MODE ---\n');

  const clientManager = new MCPClientManager();

  await clientManager.addServer({
    id: 'filesystem',
    name: 'Filesystem Server',
    transport: 'stdio',
  });

  await clientManager.addServer({
    id: 'github',
    name: 'GitHub Server',
    transport: 'stdio',
  });

  await clientManager.connectAll();

  console.log('\n📋 Connected clients:');
  clientManager.listClients().forEach(c => {
    console.log(`  - ${c.id}: ${c.connected ? '✅' : '❌'}`);
  });

  // Use a client
  const fsClient = clientManager.getClient('filesystem');
  if (fsClient) {
    console.log('\n📋 Filesystem tools:');
    const fsTools = await fsClient.listTools();
    fsTools.forEach(t => console.log(`  - ${t.name}: ${t.description}`));
  }

  await clientManager.disconnectAll();
  console.log('\n✅ Demo complete!');
}

demo();
```

### 3.6 Deep Dive Content

**Source File References:**

1. **`packages/api/mcp/server/`** - MCP Server implementation
   - `index.mts` - Server initialization
   - `tools.mts` - Tool handlers (12 tools)
   - `resources.mts` - Resource handlers (5 resources)
   - `prompts.mts` - Prompt templates (3 prompts)

2. **`packages/api/mcp/client/`** - MCP Client implementation
   - `index.mts` - Client manager
   - `connection.mts` - Connection handling
   - `sampling.mts` - AI sampling support

3. **`packages/api/mcp/ws-channel.mts`** - WebSocket integration
   - Real-time tool invocation results
   - Resource subscription updates

4. **`packages/shared/src/schemas/mcp-websockets.mts`** - Event constants
   - `MCP_EVENTS` - All event types
   - `MCP_TOPICS` - Channel topics

**Srcbook MCP Tools (12 Total):**

| Tool | Description |
|------|-------------|
| `notebook_create` | Create new notebook |
| `notebook_list` | List all notebooks |
| `notebook_delete` | Delete notebook |
| `cell_create` | Add cell to notebook |
| `cell_update` | Modify cell content |
| `cell_delete` | Remove cell |
| `cell_move` | Reorder cells |
| `cell_execute` | Run code cell |
| `cell_stop` | Stop execution |
| `deps_install` | Install packages |
| `deps_status` | Check install status |
| `export` | Export notebook |

**Srcbook MCP Resources (5 Total):**

| URI Pattern | Description |
|-------------|-------------|
| `srcbook://notebooks` | All notebooks list |
| `srcbook://session/{id}` | Full session data |
| `srcbook://session/{id}/cell/{cellId}` | Single cell |
| `srcbook://session/{id}/outputs` | Execution outputs |
| `srcbook://session/{id}/deps` | Dependencies |

### 3.7 Interactive Exercise

```typescript
// Exercise: Build a Custom MCP Tool
//
// Challenge:
// 1. Define a tool for data analysis
// 2. Implement input validation
// 3. Add progress reporting
// 4. Handle errors gracefully

interface DataAnalysisTool {
  name: 'analyze_data';
  inputSchema: {
    data: 'array';
    operation: 'sum' | 'average' | 'count' | 'unique';
    column?: string;
  };
}

class DataAnalysisServer {
  async handleAnalyze(args: {
    data: unknown[];
    operation: string;
    column?: string;
  }): Promise<{
    result: number | unknown[];
    details: string;
  }> {
    // TODO: Validate input data
    // TODO: Perform the requested operation
    // TODO: Return structured result
    throw new Error('Not implemented');
  }

  // TODO: Add progress reporting for large datasets
  // TODO: Add error handling for invalid data
}

// Test your implementation:
// const server = new DataAnalysisServer();
// const result = await server.handleAnalyze({
//   data: [{ value: 10 }, { value: 20 }, { value: 30 }],
//   operation: 'average',
//   column: 'value',
// });
// console.log(result);
```

### 3.8 Source References

| File | Purpose |
|------|---------|
| `packages/api/mcp/server/` | MCP server implementation |
| `packages/api/mcp/client/` | MCP client manager |
| `packages/api/mcp/ws-channel.mts` | WebSocket integration |
| `packages/shared/src/schemas/mcp-websockets.mts` | Event definitions |
| `packages/api/db/schema.mts` | MCP database tables |

---

## 4. Acceptance Criteria

- [ ] Server and client modes explained
- [ ] All tools and resources documented
- [ ] Protocol mechanics demonstrated
- [ ] WebSocket integration covered
- [ ] Exercise is achievable

---

## 5. Implementation Notes

### File Location
```
packages/api/srcbook/examples/internals/mcp-integration.src.md
```

### Validation
- Test tool invocation
- Verify resource reading
- Check WebSocket events
