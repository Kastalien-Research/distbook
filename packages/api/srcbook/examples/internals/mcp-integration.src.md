<!-- srcbook:{"language":"typescript"} -->

# MCP Integration - AI Tool Interoperability

###### package.json

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

## Introduction

**What is MCP Integration?**

Model Context Protocol (MCP) is an open standard that enables AI assistants to interact with external systems through a unified interface. Srcbook implements MCP in two modes:

- **Server Mode**: Srcbook exposes its functionality (notebook creation, cell execution, dependency management) as MCP tools that external AI assistants like Claude can invoke.
- **Client Mode**: Srcbook connects to external MCP servers to access additional capabilities like file systems, databases, or third-party APIs.

**Why does it matter?**

Understanding MCP integration is essential for:
- Building AI-powered workflows that interact with Srcbook
- Extending Srcbook with external MCP servers
- Creating custom MCP tools for specialized use cases
- Understanding the security model for AI tool access

**Prerequisites**

Before diving into this Srcbook, you should be familiar with:
- Srcbook's WebSocket protocol (see the "WebSocket Protocol" Srcbook)
- TypeScript basics
- JSON-RPC concepts (MCP is built on JSON-RPC 2.0)

**Learning Objectives**

By the end of this Srcbook, you will understand:
1. The dual-mode MCP architecture (server and client)
2. All 12 Srcbook MCP tools and 5 resources
3. The security model including token management and approval workflows
4. How to build custom MCP tools

## Key Concepts

### Architecture Overview

Srcbook's MCP integration operates in two distinct modes:

```
+-------------------------------------------------------------+
|                    MCP Architecture                          |
|                                                              |
|  SERVER MODE (Srcbook as MCP Provider)                       |
|  +------------------------------------------------------+   |
|  |                                                       |   |
|  |  External AI (Claude, etc.)                          |   |
|  |         |                                            |   |
|  |         v MCP Protocol                               |   |
|  |  +-------------------------------------+            |   |
|  |  |      Srcbook MCP Server             |            |   |
|  |  |                                     |            |   |
|  |  |  Tools (12):                        |            |   |
|  |  |  - notebook_create, notebook_list   |            |   |
|  |  |  - notebook_open, notebook_delete   |            |   |
|  |  |  - notebook_export                  |            |   |
|  |  |  - cell_create, cell_update         |            |   |
|  |  |  - cell_delete, cell_move           |            |   |
|  |  |  - cell_execute, cell_stop          |            |   |
|  |  |  - deps_install                     |            |   |
|  |  |                                     |            |   |
|  |  |  Resources (5):                     |            |   |
|  |  |  - srcbook://notebooks              |            |   |
|  |  |  - srcbook://session/{id}           |            |   |
|  |  |  - srcbook://session/{id}/cell/{id} |            |   |
|  |  |  - srcbook://session/{id}/cell/{id}/output       |   |
|  |  |  - srcbook://session/{id}/package.json           |   |
|  |  +-------------------------------------+            |   |
|  |                                                       |   |
|  +------------------------------------------------------+   |
|                                                              |
|  CLIENT MODE (Srcbook connecting to MCP Servers)             |
|  +------------------------------------------------------+   |
|  |                                                       |   |
|  |  +-----------+    +-----------+    +-----------+     |   |
|  |  |Filesystem |    | Database  |    |   API     |     |   |
|  |  |MCP Server |    |MCP Server |    |MCP Server |     |   |
|  |  +-----+-----+    +-----+-----+    +-----+-----+     |   |
|  |        |               |               |             |   |
|  |        v               v               v             |   |
|  |  +-------------------------------------+            |   |
|  |  |    Srcbook MCP Client Manager       |            |   |
|  |  |                                     |            |   |
|  |  |  - Connection management            |            |   |
|  |  |  - Tool discovery & invocation      |            |   |
|  |  |  - Resource subscriptions           |            |   |
|  |  |  - Capability registry              |            |   |
|  |  +-------------------------------------+            |   |
|  |                                                       |   |
|  +------------------------------------------------------+   |
|                                                              |
+-------------------------------------------------------------+
```

### Core Concepts

**Concept 1: MCP Tools**

Tools are functions that AI assistants can invoke. Each tool has:
- A unique name (e.g., `notebook_create`)
- A description explaining its purpose
- An input schema defining required and optional parameters
- A handler function that performs the operation

**Concept 2: MCP Resources**

Resources are data sources that can be read or subscribed to:
- Identified by URIs (e.g., `srcbook://notebooks`)
- Can be static or dynamic (template URIs with parameters)
- Support subscriptions for real-time updates

**Concept 3: MCP Prompts**

Prompts are pre-configured message templates that help AI assistants perform complex tasks:
- `create_analysis_notebook`: Creates a data analysis notebook
- `debug_code_cell`: Helps debug failing code
- `optimize_notebook`: Suggests performance improvements

**Concept 4: Security Model**

MCP integration includes multiple security layers:
- Token-based authentication for server mode
- Permission-based authorization
- Human-in-the-loop approval for sensitive operations
- Rate limiting to prevent abuse

## Simple Demo: MCP Tool and Resource Schemas

Let's understand how Srcbook defines its MCP tools and resources. This demo shows the schema definitions that match the actual implementation.

###### simple-mcp-tools.ts

```typescript
// Demonstrate MCP tool and resource definition patterns
// Based on packages/api/mcp/server/tools.mts and resources.mts

import { z } from 'zod';

// =============================================================================
// Tool Definition Schema
// =============================================================================

// This matches the MCP protocol's tool schema
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

// =============================================================================
// Resource Definition Schema
// =============================================================================

const MCPResourceSchema = z.object({
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
});

type MCPResource = z.infer<typeof MCPResourceSchema>;

// =============================================================================
// Srcbook's 12 MCP Tools
// =============================================================================

const srcbookTools: MCPTool[] = [
  // Notebook Management Tools (5)
  {
    name: 'notebook_create',
    description: 'Create a new TypeScript or JavaScript notebook',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the notebook' },
        language: { type: 'string', description: 'typescript or javascript' },
      },
      required: ['title'],
    },
  },
  {
    name: 'notebook_list',
    description: 'List all available Srcbook notebooks',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum notebooks to return' },
        offset: { type: 'number', description: 'Pagination offset' },
      },
    },
  },
  {
    name: 'notebook_open',
    description: 'Open an existing Srcbook notebook',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File system path to .src.md' },
        sessionId: { type: 'string', description: 'Existing session ID' },
      },
    },
  },
  {
    name: 'notebook_delete',
    description: 'Delete a Srcbook notebook',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID to delete' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'notebook_export',
    description: 'Export a notebook to .src.md markdown format',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'Session ID to export' },
      },
      required: ['sessionId'],
    },
  },

  // Cell Operation Tools (4)
  {
    name: 'cell_create',
    description: 'Create a new cell in a notebook',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The notebook session ID' },
        type: { type: 'string', description: 'Cell type: code or markdown' },
        content: { type: 'string', description: 'Initial cell content' },
        index: { type: 'number', description: 'Position (default: end)' },
        filename: { type: 'string', description: 'For code cells' },
      },
      required: ['sessionId', 'type', 'content'],
    },
  },
  {
    name: 'cell_update',
    description: 'Update the content of a cell',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The notebook session ID' },
        cellId: { type: 'string', description: 'The cell ID to update' },
        content: { type: 'string', description: 'New cell content' },
      },
      required: ['sessionId', 'cellId', 'content'],
    },
  },
  {
    name: 'cell_delete',
    description: 'Delete a cell from a notebook',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The notebook session ID' },
        cellId: { type: 'string', description: 'The cell ID to delete' },
      },
      required: ['sessionId', 'cellId'],
    },
  },
  {
    name: 'cell_move',
    description: 'Move a cell to a different position',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The notebook session ID' },
        cellId: { type: 'string', description: 'The cell ID to move' },
        newIndex: { type: 'number', description: 'New position index' },
      },
      required: ['sessionId', 'cellId', 'newIndex'],
    },
  },

  // Execution Control Tools (3)
  {
    name: 'cell_execute',
    description: 'Execute a code cell and return the output',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The notebook session ID' },
        cellId: { type: 'string', description: 'The cell ID to execute' },
      },
      required: ['sessionId', 'cellId'],
    },
  },
  {
    name: 'cell_stop',
    description: 'Stop a running cell execution',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The notebook session ID' },
        cellId: { type: 'string', description: 'The cell ID to stop' },
      },
      required: ['sessionId', 'cellId'],
    },
  },
  {
    name: 'deps_install',
    description: 'Install npm dependencies for a notebook',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The notebook session ID' },
        packages: { type: 'array', description: "Package names (e.g., ['lodash'])" },
      },
      required: ['sessionId', 'packages'],
    },
  },
];

// =============================================================================
// Srcbook's 5 MCP Resources
// =============================================================================

const srcbookResources: MCPResource[] = [
  {
    uri: 'srcbook://notebooks',
    name: 'Notebooks List',
    description: 'List of all Srcbook notebooks',
    mimeType: 'application/json',
  },
  {
    uri: 'srcbook://session/{sessionId}',
    name: 'Session State',
    description: 'Complete notebook state including all cells',
    mimeType: 'application/json',
  },
  {
    uri: 'srcbook://session/{sessionId}/cell/{cellId}',
    name: 'Cell Content',
    description: 'Individual cell content and metadata',
    mimeType: 'application/json',
  },
  {
    uri: 'srcbook://session/{sessionId}/cell/{cellId}/output',
    name: 'Cell Output',
    description: 'Cell execution output (stdout, stderr, exitCode)',
    mimeType: 'text/plain',
  },
  {
    uri: 'srcbook://session/{sessionId}/package.json',
    name: 'Dependencies',
    description: 'Notebook npm dependencies',
    mimeType: 'application/json',
  },
];

// =============================================================================
// Demo Output
// =============================================================================

console.log('=== Srcbook MCP Tools & Resources ===\n');

console.log('TOOLS (12 total):');
console.log('');

// Group tools by category
const categories = [
  { name: 'Notebook Management', tools: srcbookTools.slice(0, 5) },
  { name: 'Cell Operations', tools: srcbookTools.slice(5, 9) },
  { name: 'Execution Control', tools: srcbookTools.slice(9, 12) },
];

categories.forEach(category => {
  console.log(`--- ${category.name} ---`);
  category.tools.forEach(tool => {
    const requiredParams = tool.inputSchema.required || [];
    const allParams = Object.keys(tool.inputSchema.properties);
    const optionalParams = allParams.filter(p => !requiredParams.includes(p));

    console.log(`  ${tool.name}`);
    console.log(`    ${tool.description}`);
    console.log(`    Required: ${requiredParams.join(', ') || 'none'}`);
    if (optionalParams.length > 0) {
      console.log(`    Optional: ${optionalParams.join(', ')}`);
    }
    console.log('');
  });
});

console.log('\nRESOURCES (5 total):');
srcbookResources.forEach(resource => {
  console.log(`  ${resource.uri}`);
  console.log(`    ${resource.description}`);
  console.log(`    Type: ${resource.mimeType}`);
  console.log('');
});

// Validate all schemas
console.log('\n=== Schema Validation ===');
let valid = 0;
let invalid = 0;

srcbookTools.forEach(tool => {
  const result = MCPToolSchema.safeParse(tool);
  if (result.success) {
    valid++;
  } else {
    invalid++;
    console.log(`  ${tool.name}: INVALID`);
  }
});

srcbookResources.forEach(resource => {
  const result = MCPResourceSchema.safeParse(resource);
  if (result.success) {
    valid++;
  } else {
    invalid++;
    console.log(`  ${resource.uri}: INVALID`);
  }
});

console.log(`\nValidation: ${valid} valid, ${invalid} invalid`);
```

## Explanation: MCP Protocol Flow

### How Tool Invocation Works

When an external AI (like Claude) invokes a Srcbook tool, this is the flow:

```
External AI                    Srcbook MCP Server
     |                                |
     | 1. tools/list request          |
     |------------------------------->|
     |                                |
     | 2. tools list response         |
     |<-------------------------------|
     |    (12 tools with schemas)     |
     |                                |
     | 3. tools/call "notebook_create"|
     |    {title: "My Notebook"}      |
     |------------------------------->|
     |                                |
     |    [Security checks:           |
     |     - Token validation         |
     |     - Permission check         |
     |     - Rate limiting            |
     |     - Approval if required]    |
     |                                |
     | 4. Result response             |
     |<-------------------------------|
     |    {sessionId: "abc123"}       |
     |                                |
```

### WebSocket Integration

The MCP system integrates with Srcbook's WebSocket protocol for real-time UI updates:

```typescript
// Topics used for MCP WebSocket events
const MCP_TOPICS = {
  SERVER: 'mcp:server',   // Srcbook as MCP provider
  CLIENT: 'mcp:client',   // Srcbook consuming external MCP
  REGISTRY: 'mcp:registry' // Capability discovery
};

// Example events on mcp:server topic
// - client:connected   -> External AI connected
// - client:disconnected -> External AI disconnected
// - tool:invoked       -> Tool being invoked (for UI feedback)
// - tool:completed     -> Tool finished execution
// - approval:request   -> Human approval needed
```

### Security Pipeline

Every MCP operation goes through this security pipeline:

1. **Token Validation**: Bearer token extracted and verified against stored hash
2. **Permission Check**: Token's permissions checked against required permissions
3. **Input Validation**: Schema validation + security checks (path traversal, injection)
4. **Rate Limiting**: Per-client request throttling
5. **Approval Check**: Sensitive operations may require human approval
6. **Audit Logging**: All operations logged with redacted sensitive data

## Advanced Demo: MCP Server and Client Implementation

This demo shows the full server and client patterns used in Srcbook's MCP implementation.

###### mcp-server-client.ts

```typescript
// Full MCP server and client implementation patterns
// Based on packages/api/mcp/server/ and packages/api/mcp/client/

import { z } from 'zod';
import { EventEmitter } from 'events';

// =============================================================================
// Types
// =============================================================================

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: 'text'; text: string }>;
}>;

interface ResourceContent {
  uri: string;
  mimeType: string;
  text: string;
}

interface ServerCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  sampling?: object;
}

// =============================================================================
// MCP Server Implementation
// =============================================================================

class MCPServer extends EventEmitter {
  private tools = new Map<string, {
    description: string;
    schema: z.ZodObject<any>;
    handler: ToolHandler;
  }>();

  private resources = new Map<string, {
    description: string;
    getter: () => Promise<ResourceContent>;
  }>();

  private subscriptions = new Map<string, Set<(content: ResourceContent) => void>>();

  /**
   * Register a tool (like server.tool() in MCP SDK)
   */
  tool(
    name: string,
    description: string,
    schema: z.ZodObject<any>,
    handler: ToolHandler
  ): this {
    this.tools.set(name, { description, schema, handler });
    console.log(`[Server] Registered tool: ${name}`);
    return this;
  }

  /**
   * Register a resource (like server.resource() in MCP SDK)
   */
  resource(
    uri: string,
    description: string,
    getter: () => Promise<ResourceContent>
  ): this {
    this.resources.set(uri, { description, getter });
    console.log(`[Server] Registered resource: ${uri}`);
    return this;
  }

  /**
   * List all registered tools
   */
  async listTools(): Promise<Array<{
    name: string;
    description: string;
    inputSchema: unknown;
  }>> {
    return Array.from(this.tools.entries()).map(([name, info]) => ({
      name,
      description: info.description,
      inputSchema: info.schema,
    }));
  }

  /**
   * List all registered resources
   */
  async listResources(): Promise<Array<{
    uri: string;
    name: string;
    description: string;
  }>> {
    return Array.from(this.resources.entries()).map(([uri, info]) => ({
      uri,
      name: uri.split('/').pop() || uri,
      description: info.description,
    }));
  }

  /**
   * Call a tool with validated input
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<{
    content: Array<{ type: 'text'; text: string }>;
  }> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    // Validate input against schema
    const validated = tool.schema.parse(args);
    console.log(`[Server] Calling tool: ${name}`);

    const result = await tool.handler(validated);
    console.log(`[Server] Tool completed: ${name}`);

    this.emit('tool:completed', { name, args: validated });
    return result;
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<ResourceContent> {
    // Handle parameterized URIs by finding matching pattern
    for (const [pattern, info] of this.resources) {
      if (this.matchUri(pattern, uri)) {
        console.log(`[Server] Reading resource: ${uri}`);
        return info.getter();
      }
    }
    throw new Error(`Resource not found: ${uri}`);
  }

  /**
   * Subscribe to resource updates
   */
  subscribeResource(uri: string, callback: (content: ResourceContent) => void): () => void {
    if (!this.subscriptions.has(uri)) {
      this.subscriptions.set(uri, new Set());
    }
    this.subscriptions.get(uri)!.add(callback);
    console.log(`[Server] Subscribed to: ${uri}`);

    // Return unsubscribe function
    return () => {
      this.subscriptions.get(uri)?.delete(callback);
      console.log(`[Server] Unsubscribed from: ${uri}`);
    };
  }

  /**
   * Notify subscribers of a resource change
   */
  notifyResourceChange(uri: string, content: ResourceContent): void {
    const subs = this.subscriptions.get(uri);
    if (subs) {
      subs.forEach(callback => callback(content));
      console.log(`[Server] Notified ${subs.size} subscribers of change to: ${uri}`);
    }
  }

  private matchUri(pattern: string, uri: string): boolean {
    // Simple pattern matching - {param} matches anything
    const regex = new RegExp(
      '^' + pattern.replace(/\{[^}]+\}/g, '[^/]+') + '$'
    );
    return regex.test(uri);
  }
}

// =============================================================================
// MCP Client Implementation
// =============================================================================

class MCPClient extends EventEmitter {
  private connected = false;
  private capabilities: ServerCapabilities | null = null;
  private discoveredTools: Array<{ name: string; description: string }> = [];

  constructor(
    private serverName: string,
    private transport: 'stdio' | 'http'
  ) {
    super();
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    console.log(`[Client] Connecting to ${this.serverName} via ${this.transport}...`);

    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 100));

    this.connected = true;
    this.capabilities = {
      tools: { listChanged: true },
      resources: { subscribe: true, listChanged: true },
      prompts: { listChanged: true },
    };

    console.log(`[Client] Connected! Capabilities:`, this.capabilities);
    this.emit('connected');
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    console.log(`[Client] Disconnecting from ${this.serverName}...`);
    this.connected = false;
    this.capabilities = null;
    this.discoveredTools = [];
    this.emit('disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  getCapabilities(): ServerCapabilities | null {
    return this.capabilities;
  }

  /**
   * Discover tools from the server
   */
  async listTools(): Promise<Array<{ name: string; description: string }>> {
    if (!this.connected) throw new Error('Not connected');

    // In real implementation, this calls the server
    this.discoveredTools = [
      { name: 'read_file', description: 'Read a file from the filesystem' },
      { name: 'list_dir', description: 'List directory contents' },
      { name: 'write_file', description: 'Write content to a file' },
    ];

    return this.discoveredTools;
  }

  /**
   * Call a tool on the server
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.connected) throw new Error('Not connected');

    console.log(`[Client] Invoking tool: ${name}`);
    // In real implementation, this sends JSON-RPC to server
    return { success: true, tool: name, args };
  }

  /**
   * Read a resource from the server
   */
  async readResource(uri: string): Promise<unknown> {
    if (!this.connected) throw new Error('Not connected');

    console.log(`[Client] Reading resource: ${uri}`);
    return { uri, content: 'Mock resource content' };
  }
}

// =============================================================================
// MCP Client Manager
// =============================================================================

class MCPClientManager {
  private clients = new Map<string, MCPClient>();
  private registry = {
    tools: new Map<string, { serverId: string; name: string; description: string }>(),
    resources: new Map<string, { serverId: string; uri: string }>(),
  };

  /**
   * Add a new server configuration
   */
  async addServer(config: {
    id: string;
    name: string;
    transport: 'stdio' | 'http';
  }): Promise<MCPClient> {
    const client = new MCPClient(config.name, config.transport);
    this.clients.set(config.id, client);
    console.log(`[Manager] Added server config: ${config.name}`);
    return client;
  }

  /**
   * Connect to all configured servers
   */
  async connectAll(): Promise<void> {
    console.log(`[Manager] Connecting to ${this.clients.size} servers...`);

    for (const [id, client] of this.clients) {
      try {
        await client.connect();

        // Discover capabilities
        const tools = await client.listTools();
        tools.forEach(tool => {
          const key = `${id}:${tool.name}`;
          this.registry.tools.set(key, { serverId: id, ...tool });
        });
      } catch (error) {
        console.error(`[Manager] Failed to connect to ${id}:`, error);
      }
    }
  }

  /**
   * Get a client by server ID
   */
  getClient(serverId: string): MCPClient | undefined {
    return this.clients.get(serverId);
  }

  /**
   * List all clients and their status
   */
  listClients(): Array<{ id: string; connected: boolean }> {
    return Array.from(this.clients.entries()).map(([id, client]) => ({
      id,
      connected: client.isConnected(),
    }));
  }

  /**
   * Get all available tools from all connected servers
   */
  getAllTools(): Array<{ serverId: string; name: string; description: string }> {
    return Array.from(this.registry.tools.values());
  }

  /**
   * Find a tool by name
   */
  findTool(toolName: string): { serverId: string; name: string } | undefined {
    for (const entry of this.registry.tools.values()) {
      if (entry.name === toolName) {
        return entry;
      }
    }
    return undefined;
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    for (const client of this.clients.values()) {
      if (client.isConnected()) {
        await client.disconnect();
      }
    }
    this.registry.tools.clear();
    this.registry.resources.clear();
  }
}

// =============================================================================
// Demo
// =============================================================================

async function demo() {
  console.log('=== MCP Server/Client Demo ===\n');

  // ---------------------------------------------------------------------------
  // Part 1: MCP Server Mode (Srcbook as provider)
  // ---------------------------------------------------------------------------
  console.log('--- MCP SERVER MODE ---\n');

  const server = new MCPServer();

  // Register Srcbook tools
  server.tool(
    'notebook_create',
    'Create a new TypeScript or JavaScript notebook',
    z.object({
      title: z.string(),
      language: z.enum(['typescript', 'javascript']).default('typescript'),
    }),
    async (args) => ({
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          sessionId: `session-${Date.now()}`,
          title: args.title,
          language: args.language,
        }),
      }],
    })
  );

  server.tool(
    'cell_execute',
    'Execute a code cell and return the output',
    z.object({
      sessionId: z.string(),
      cellId: z.string(),
    }),
    async (args) => ({
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          exitCode: 0,
          stdout: 'Hello from Srcbook!',
          stderr: '',
          cellId: args.cellId,
        }),
      }],
    })
  );

  // Register resources
  server.resource(
    'srcbook://notebooks',
    'List of all Srcbook notebooks',
    async () => ({
      uri: 'srcbook://notebooks',
      mimeType: 'application/json',
      text: JSON.stringify({
        notebooks: [
          { sessionId: 'session-1', title: 'My Notebook' },
          { sessionId: 'session-2', title: 'Tutorial' },
        ],
        total: 2,
      }),
    })
  );

  server.resource(
    'srcbook://session/{sessionId}',
    'Complete notebook state',
    async () => ({
      uri: 'srcbook://session/session-1',
      mimeType: 'application/json',
      text: JSON.stringify({
        sessionId: 'session-1',
        title: 'My Notebook',
        language: 'typescript',
        cells: [],
      }),
    })
  );

  // Test server operations
  console.log('Available tools:');
  const tools = await server.listTools();
  tools.forEach(t => console.log(`  - ${t.name}: ${t.description}`));

  console.log('\nAvailable resources:');
  const resources = await server.listResources();
  resources.forEach(r => console.log(`  - ${r.uri}: ${r.description}`));

  console.log('\nCalling notebook_create...');
  const createResult = await server.callTool('notebook_create', {
    title: 'AI Generated Notebook',
    language: 'typescript',
  });
  console.log('  Result:', createResult.content[0].text);

  console.log('\nReading notebooks resource...');
  const notebooksResource = await server.readResource('srcbook://notebooks');
  console.log('  Content:', notebooksResource.text);

  // ---------------------------------------------------------------------------
  // Part 2: MCP Client Mode (Srcbook consuming external servers)
  // ---------------------------------------------------------------------------
  console.log('\n\n--- MCP CLIENT MODE ---\n');

  const clientManager = new MCPClientManager();

  // Configure external MCP servers
  await clientManager.addServer({
    id: 'filesystem',
    name: 'Filesystem Server',
    transport: 'stdio',
  });

  await clientManager.addServer({
    id: 'database',
    name: 'Database Server',
    transport: 'stdio',
  });

  // Connect to all servers
  await clientManager.connectAll();

  console.log('\nConnected clients:');
  clientManager.listClients().forEach(c => {
    console.log(`  - ${c.id}: ${c.connected ? 'Connected' : 'Disconnected'}`);
  });

  console.log('\nAll available tools:');
  clientManager.getAllTools().forEach(t => {
    console.log(`  - [${t.serverId}] ${t.name}: ${t.description}`);
  });

  // Invoke a tool
  const fsClient = clientManager.getClient('filesystem');
  if (fsClient) {
    console.log('\nInvoking read_file tool...');
    const result = await fsClient.callTool('read_file', { path: '/example.txt' });
    console.log('  Result:', result);
  }

  // Cleanup
  await clientManager.disconnectAll();
  console.log('\nAll clients disconnected.');
  console.log('\nDemo complete!');
}

demo().catch(console.error);
```

## Deep Dive: Implementation Details

### Source File Structure

Srcbook's MCP implementation spans several directories:

**Server Mode (`packages/api/mcp/server/`):**
- **`index.mts`**: Server initialization and lifecycle
- **`tools.mts`**: All 12 tool handlers with Zod schemas
- **`resources.mts`**: 5 resource handlers with subscription support
- **`prompts.mts`**: 3 prompt templates for AI assistance

**Client Mode (`packages/api/mcp/client/`):**
- **`index.mts`**: Client manager and connection handling
- **`tools.mts`**: Tool invocation with approval workflow
- **`resources.mts`**: Resource reading and subscriptions
- **`sampling.mts`**: AI completion requests through MCP

**Security (`packages/api/mcp/security/`):**
- **`index.mts`**: Complete security framework
  - Token generation and validation
  - Permission checking
  - Rate limiting
  - Approval workflow
  - Audit logging

**WebSocket Integration:**
- **`packages/api/server/channels/mcp.mts`**: WebSocket event handlers
- **`packages/shared/src/schemas/mcp-websockets.mts`**: Message schemas

### WebSocket Events Reference

**Server Mode Events (`mcp:server`):**

| Event | Direction | Description |
|-------|-----------|-------------|
| `client:connected` | Server->Browser | External AI connected |
| `client:disconnected` | Server->Browser | External AI disconnected |
| `tool:invoked` | Server->Browser | Tool being invoked (UI feedback) |
| `tool:completed` | Server->Browser | Tool execution finished |
| `approval:request` | Server->Browser | Human approval needed |
| `approval:respond` | Browser->Server | User's approval response |

**Client Mode Events (`mcp:client`):**

| Event | Direction | Description |
|-------|-----------|-------------|
| `server:connect` | Browser->Server | Connect to external MCP |
| `server:disconnect` | Browser->Server | Disconnect from external MCP |
| `server:status` | Server->Browser | Connection status update |
| `tool:invoke` | Browser->Server | Invoke tool on external server |
| `tool:result` | Server->Browser | Tool invocation result |
| `tool:error` | Server->Browser | Tool invocation failed |
| `resource:read` | Browser->Server | Read external resource |
| `resource:content` | Server->Browser | Resource content response |
| `resource:subscribe` | Browser->Server | Subscribe to updates |
| `resource:subscribed` | Server->Browser | Subscription confirmed |
| `resource:updated` | Server->Browser | Resource changed |

**Registry Events (`mcp:registry`):**

| Event | Direction | Description |
|-------|-----------|-------------|
| `servers:list` | Browser->Server | Request server list |
| `servers:changed` | Server->Browser | Server list updated |
| `tools:list` | Browser->Server | Request tools list |
| `tools:changed` | Server->Browser | Tools list updated |
| `resources:list` | Browser->Server | Request resources list |
| `resources:changed` | Server->Browser | Resources list updated |
| `prompts:list` | Browser->Server | Request prompts list |
| `prompts:changed` | Server->Browser | Prompts list updated |

### Security Considerations

**Token Management:**
```typescript
// Tokens are SHA-256 hashed before storage
// Never store raw tokens - only hashes
const { token, hash } = generateToken();
// token = "srcbook_mcp_..." (given to client)
// hash = "abc123..." (stored in database)
```

**Permission Granularity:**
```typescript
// Available permissions
type MCPPermission =
  | 'tools:execute'    // Invoke tools
  | 'tools:list'       // List available tools
  | 'resources:read'   // Read resources
  | 'resources:subscribe' // Subscribe to updates
  | 'prompts:list'     // List prompts
  | 'prompts:execute'  // Use prompts
  | 'sampling:create'  // Request AI completions
  | 'notebooks:create' // Create notebooks
  | 'notebooks:delete' // Delete notebooks
  | 'notebooks:export' // Export notebooks
  | '*';               // Full access
```

**Approval Workflow:**

Sensitive operations require human approval:
- `notebook_delete`: Deleting notebooks
- `notebook_export`: Exporting data
- `server:install`: Installing new MCP servers
- `first_connection`: First-time AI client connections

The approval can be remembered:
- `session`: Remember for this session only
- `always`: Always allow this operation
- `never`: Always deny this operation

**Rate Limiting:**
```typescript
// Default rate limits
const rateLimits = {
  'tool:invoke': { windowMs: 60000, maxRequests: 100 },
  'resource:read': { windowMs: 60000, maxRequests: 200 },
  'notebook:create': { windowMs: 60000, maxRequests: 10 },
  'auth:token': { windowMs: 60000, maxRequests: 5 },
};
```

## Interactive Exercise: Build a Custom MCP Tool

Now it's your turn! Create a custom MCP tool for data analysis that:
1. Validates input with Zod schemas
2. Reports progress for long operations
3. Handles errors gracefully

###### exercise.ts

```typescript
// Exercise: Build a Custom MCP Tool
//
// Challenge:
// 1. Define a tool schema for data analysis
// 2. Implement input validation
// 3. Add progress reporting
// 4. Handle errors gracefully

import { z } from 'zod';

// =============================================================================
// Step 1: Define the tool schema
// =============================================================================

const DataAnalysisInputSchema = z.object({
  data: z.array(z.record(z.unknown())).describe('Array of data objects'),
  operation: z.enum(['sum', 'average', 'count', 'unique', 'min', 'max']).describe('Operation to perform'),
  column: z.string().describe('Column name to analyze'),
});

type DataAnalysisInput = z.infer<typeof DataAnalysisInputSchema>;

// =============================================================================
// Step 2: Implement the analysis server
// =============================================================================

class DataAnalysisServer {
  private progressCallbacks: Array<(progress: number, message: string) => void> = [];

  /**
   * Register a progress callback
   */
  onProgress(callback: (progress: number, message: string) => void): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Report progress to all listeners
   */
  private reportProgress(progress: number, message: string): void {
    this.progressCallbacks.forEach(cb => cb(progress, message));
  }

  /**
   * Handle the analyze_data tool call
   */
  async handleAnalyze(rawArgs: unknown): Promise<{
    result: number | unknown[];
    details: string;
  }> {
    // Step 2a: Validate input
    const parseResult = DataAnalysisInputSchema.safeParse(rawArgs);
    if (!parseResult.success) {
      throw new Error(`Invalid input: ${parseResult.error.message}`);
    }

    const args = parseResult.data;
    this.reportProgress(10, 'Input validated');

    // Step 2b: Extract column values
    const values: number[] = [];
    const uniqueValues = new Set<unknown>();

    this.reportProgress(20, 'Extracting column values...');

    for (let i = 0; i < args.data.length; i++) {
      const row = args.data[i];
      if (row && args.column in row) {
        const value = row[args.column];

        if (typeof value === 'number') {
          values.push(value);
        }
        uniqueValues.add(value);
      }

      // Report progress for large datasets
      if (i % 100 === 0) {
        this.reportProgress(20 + (i / args.data.length) * 50, `Processing row ${i}...`);
      }
    }

    this.reportProgress(70, 'Computing result...');

    // Step 2c: Perform the operation
    let result: number | unknown[];
    let details: string;

    switch (args.operation) {
      case 'sum':
        result = values.reduce((a, b) => a + b, 0);
        details = `Sum of ${values.length} values in "${args.column}"`;
        break;

      case 'average':
        if (values.length === 0) {
          throw new Error(`No numeric values found in column "${args.column}"`);
        }
        result = values.reduce((a, b) => a + b, 0) / values.length;
        details = `Average of ${values.length} values in "${args.column}"`;
        break;

      case 'count':
        result = values.length;
        details = `Count of numeric values in "${args.column}"`;
        break;

      case 'unique':
        result = Array.from(uniqueValues);
        details = `${uniqueValues.size} unique values in "${args.column}"`;
        break;

      case 'min':
        if (values.length === 0) {
          throw new Error(`No numeric values found in column "${args.column}"`);
        }
        result = Math.min(...values);
        details = `Minimum value in "${args.column}"`;
        break;

      case 'max':
        if (values.length === 0) {
          throw new Error(`No numeric values found in column "${args.column}"`);
        }
        result = Math.max(...values);
        details = `Maximum value in "${args.column}"`;
        break;

      default:
        throw new Error(`Unknown operation: ${args.operation}`);
    }

    this.reportProgress(100, 'Complete');
    return { result, details };
  }
}

// =============================================================================
// Step 3: Test your implementation
// =============================================================================

console.log('=== Data Analysis Tool Demo ===\n');

const server = new DataAnalysisServer();

// Register progress listener
server.onProgress((progress, message) => {
  console.log(`  [${progress}%] ${message}`);
});

// Test data
const testData = [
  { name: 'Alice', value: 10, category: 'A' },
  { name: 'Bob', value: 20, category: 'B' },
  { name: 'Charlie', value: 30, category: 'A' },
  { name: 'Diana', value: 40, category: 'C' },
  { name: 'Eve', value: 50, category: 'B' },
];

// Test operations
const operations = ['sum', 'average', 'count', 'unique', 'min', 'max'] as const;

async function runTests() {
  for (const operation of operations) {
    console.log(`\nOperation: ${operation}`);
    try {
      const result = await server.handleAnalyze({
        data: testData,
        operation,
        column: operation === 'unique' ? 'category' : 'value',
      });
      console.log(`  Result: ${JSON.stringify(result.result)}`);
      console.log(`  Details: ${result.details}`);
    } catch (error) {
      console.log(`  Error: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Test error handling
  console.log('\n--- Error Handling Tests ---');

  console.log('\nTest: Invalid operation');
  try {
    await server.handleAnalyze({
      data: testData,
      operation: 'invalid' as any,
      column: 'value',
    });
  } catch (error) {
    console.log(`  Caught: ${error instanceof Error ? error.message : error}`);
  }

  console.log('\nTest: Missing column');
  try {
    await server.handleAnalyze({
      data: testData,
      operation: 'average',
      column: 'nonexistent',
    });
  } catch (error) {
    console.log(`  Caught: ${error instanceof Error ? error.message : error}`);
  }
}

runTests().catch(console.error);
```

## Source Code References

Want to explore the actual implementation? Here are the key files:

### MCP Server Implementation

| File | Purpose |
|------|---------|
| [`packages/api/mcp/server/index.mts`](../../../mcp/server/index.mts) | Server initialization |
| [`packages/api/mcp/server/tools.mts`](../../../mcp/server/tools.mts) | 12 tool handlers |
| [`packages/api/mcp/server/resources.mts`](../../../mcp/server/resources.mts) | 5 resource handlers |
| [`packages/api/mcp/server/prompts.mts`](../../../mcp/server/prompts.mts) | 3 prompt templates |

### MCP Client Implementation

| File | Purpose |
|------|---------|
| [`packages/api/mcp/client/index.mts`](../../../mcp/client/index.mts) | Client manager |
| [`packages/api/mcp/client/tools.mts`](../../../mcp/client/tools.mts) | Tool invocation |
| [`packages/api/mcp/client/resources.mts`](../../../mcp/client/resources.mts) | Resource access |
| [`packages/api/mcp/client/sampling.mts`](../../../mcp/client/sampling.mts) | AI sampling |

### Security Framework

| File | Purpose |
|------|---------|
| [`packages/api/mcp/security/index.mts`](../../../mcp/security/index.mts) | Complete security module |

### WebSocket Integration

| File | Purpose |
|------|---------|
| [`packages/api/server/channels/mcp.mts`](../../../server/channels/mcp.mts) | WebSocket channel |
| [`packages/shared/src/schemas/mcp-websockets.mts`](../../../../shared/src/schemas/mcp-websockets.mts) | Event schemas |
| [`packages/shared/src/types/mcp.mts`](../../../../shared/src/types/mcp.mts) | Type definitions |

## Next Steps

### Related Topics

Now that you understand MCP integration, explore these related Srcbooks:
- **WebSocket Protocol**: Deep dive into real-time communication
- **Cell Execution**: How code cells are executed
- **Session Management**: Notebook lifecycle management

### Further Reading

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Anthropic's MCP Introduction](https://www.anthropic.com/news/model-context-protocol)

### Contributing

Found an error or want to improve this Srcbook?

1. The source is at `packages/api/srcbook/examples/internals/mcp-integration.src.md`
2. Submit a PR with your improvements
3. Help make Srcbook's documentation even better!

## Summary

In this Srcbook, we covered:

- **Dual-mode architecture**: Srcbook as both MCP server (provider) and client (consumer)
- **12 MCP tools**: Notebook management (5), cell operations (4), execution control (3)
- **5 MCP resources**: Notebooks list, session state, cell content, cell output, package.json
- **3 prompt templates**: create_analysis_notebook, debug_code_cell, optimize_notebook
- **Security model**: Token authentication, permission-based authorization, approval workflow, rate limiting
- **WebSocket integration**: Real-time events for tool invocation and resource updates
- **Custom tool development**: How to build your own MCP tools with validation and progress reporting

You now understand how Srcbook integrates with the Model Context Protocol to enable AI assistants to interact with notebooks programmatically.
