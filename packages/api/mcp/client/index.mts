/**
 * MCP Client Module
 *
 * Implements Srcbook as an MCP client that consumes external servers:
 * - Server Connection Management: Connect to multiple MCP servers (stdio/HTTP)
 * - Tool Invocation: Call tools from databases, file systems, APIs
 * - Resource Access: Read and subscribe to external data
 * - Sampling Integration: Request LLM completions through MCP
 *
 * Uses the MCP SDK's Client class with stdio or HTTP transports.
 *
 * @see 02-mcp-client.md for full specification
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type {
  MCPServerConfig,
  MCPConnectionStatus,
  MCPToolDefinition,
  MCPResourceDefinition,
  MCPPromptDefinition,
} from '@srcbook/shared';

// =============================================================================
// Types
// =============================================================================

export interface MCPClientConnection {
  config: MCPServerConfig;
  client: Client;
  transport: StdioClientTransport | StreamableHTTPClientTransport;
  status: MCPConnectionStatus;
  capabilities: ServerCapabilities | null;
  tools: MCPToolDefinition[];
  resources: MCPResourceDefinition[];
  prompts: MCPPromptDefinition[];
  lastError?: string;
  connectedAt?: Date;
  lastActivityAt?: Date;
}

export interface ServerCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  sampling?: object;
}

export interface MCPClientState {
  connections: Map<string, MCPClientConnection>;
  registry: {
    tools: Map<string, { serverId: string; tool: MCPToolDefinition }>;
    resources: Map<string, { serverId: string; resource: MCPResourceDefinition }>;
    prompts: Map<string, { serverId: string; prompt: MCPPromptDefinition }>;
  };
}

// =============================================================================
// Client State
// =============================================================================

const clientState: MCPClientState = {
  connections: new Map(),
  registry: {
    tools: new Map(),
    resources: new Map(),
    prompts: new Map(),
  },
};

/**
 * Get the client state
 */
export function getClientState(): MCPClientState {
  return clientState;
}

/**
 * Get the client manager (alias for backwards compatibility)
 */
export function getClientManager(): { connections: Map<string, MCPClientConnection> } {
  return clientState;
}

// =============================================================================
// Connection Management
// =============================================================================

/**
 * Connect to an external MCP server
 */
export async function connectToMCPServer(config: MCPServerConfig): Promise<MCPClientConnection> {
  // Check if already connected
  const existing = clientState.connections.get(config.id);
  if (existing && existing.status === 'connected') {
    console.log('[MCP Client] Already connected to:', config.name);
    return existing;
  }

  console.log('[MCP Client] Connecting to server:', config.name, '(', config.transport, ')');

  // Create client with our capabilities
  const client = new Client(
    {
      name: 'srcbook-client',
      version: '1.0.0',
    },
    {
      capabilities: {
        sampling: {},
        roots: {
          listChanged: true,
        },
      },
    },
  );

  // Create placeholder connection
  const connection: MCPClientConnection = {
    config,
    client,
    transport: null as unknown as StdioClientTransport,
    status: 'connecting',
    capabilities: null,
    tools: [],
    resources: [],
    prompts: [],
  };

  clientState.connections.set(config.id, connection);

  try {
    // TODO: Create transport based on type
    if (config.transport === 'stdio') {
      // Create stdio transport
      // const transport = new StdioClientTransport({
      //   command: config.command!,
      //   args: config.args,
      //   env: config.env,
      // });
      // connection.transport = transport;
      // await client.connect(transport);
      console.log('[MCP Client] Stdio transport not yet fully implemented');
    } else if (config.transport === 'http') {
      // Create HTTP transport
      // const transport = new StreamableHTTPClientTransport({
      //   url: config.url!,
      //   headers: config.headers,
      // });
      // connection.transport = transport;
      // await client.connect(transport);
      console.log('[MCP Client] HTTP transport not yet fully implemented');
    }

    // TODO: Get server capabilities after connection
    // const initResult = await client.initialize();
    // connection.capabilities = initResult.capabilities;

    // TODO: Discover tools, resources, prompts
    // await discoverCapabilities(connection);

    connection.status = 'error';
    connection.lastError = 'Transport connection not yet implemented';

    console.log('[MCP Client] Connection setup pending implementation');
    return connection;
  } catch (error) {
    connection.status = 'error';
    connection.lastError = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MCP Client] Connection failed:', connection.lastError);
    return connection;
  }
}

/**
 * Disconnect from an external MCP server
 */
export async function disconnectFromMCPServer(serverId: string): Promise<void> {
  const connection = clientState.connections.get(serverId);

  if (!connection) {
    console.log('[MCP Client] No connection found for:', serverId);
    return;
  }

  console.log('[MCP Client] Disconnecting from:', connection.config.name);

  try {
    // TODO: Close transport
    // if (connection.transport) {
    //   await connection.transport.close();
    // }

    // Remove capabilities from registry
    unregisterServerCapabilities(serverId);

    // Update connection status
    connection.status = 'disconnected';
    connection.capabilities = null;
    connection.tools = [];
    connection.resources = [];
    connection.prompts = [];
  } catch (error) {
    console.error('[MCP Client] Disconnect error:', error);
  }
}

/**
 * Reconnect to a server
 */
export async function reconnectToMCPServer(serverId: string): Promise<MCPClientConnection | null> {
  const connection = clientState.connections.get(serverId);
  if (!connection) {
    return null;
  }

  await disconnectFromMCPServer(serverId);
  return connectToMCPServer(connection.config);
}

/**
 * Get connection by server ID
 */
export function getConnection(serverId: string): MCPClientConnection | undefined {
  return clientState.connections.get(serverId);
}

/**
 * Get all connections
 */
export function getAllConnections(): MCPClientConnection[] {
  return Array.from(clientState.connections.values());
}

/**
 * Get active (connected) connections
 */
export function getActiveConnections(): MCPClientConnection[] {
  return Array.from(clientState.connections.values()).filter(
    (conn) => conn.status === 'connected',
  );
}

/**
 * Get connection status for a server
 */
export function getConnectionStatus(serverId: string): MCPConnectionStatus {
  const connection = clientState.connections.get(serverId);
  return connection?.status || 'disconnected';
}

// =============================================================================
// Capability Discovery
// =============================================================================

/**
 * Discover capabilities from a connected server
 */
async function discoverCapabilities(connection: MCPClientConnection): Promise<void> {
  const { client, config } = connection;
  const serverId = config.id;

  console.log('[MCP Client] Discovering capabilities from:', config.name);

  try {
    // TODO: List tools
    // const toolsResult = await client.listTools();
    // connection.tools = toolsResult.tools.map(tool => ({
    //   ...tool,
    //   serverId,
    // }));

    // TODO: List resources
    // const resourcesResult = await client.listResources();
    // connection.resources = resourcesResult.resources.map(resource => ({
    //   ...resource,
    //   serverId,
    // }));

    // TODO: List prompts
    // const promptsResult = await client.listPrompts();
    // connection.prompts = promptsResult.prompts.map(prompt => ({
    //   ...prompt,
    //   serverId,
    // }));

    // Register in global registry
    registerServerCapabilities(connection);

    console.log(
      '[MCP Client] Discovered:',
      connection.tools.length,
      'tools,',
      connection.resources.length,
      'resources,',
      connection.prompts.length,
      'prompts',
    );
  } catch (error) {
    console.error('[MCP Client] Discovery failed:', error);
  }
}

/**
 * Register server capabilities in global registry
 */
function registerServerCapabilities(connection: MCPClientConnection): void {
  const serverId = connection.config.id;

  // Register tools
  for (const tool of connection.tools) {
    const key = `${serverId}:${tool.name}`;
    clientState.registry.tools.set(key, { serverId, tool });
  }

  // Register resources
  for (const resource of connection.resources) {
    const key = `${serverId}:${resource.uri}`;
    clientState.registry.resources.set(key, { serverId, resource });
  }

  // Register prompts
  for (const prompt of connection.prompts) {
    const key = `${serverId}:${prompt.name}`;
    clientState.registry.prompts.set(key, { serverId, prompt });
  }
}

/**
 * Unregister server capabilities from global registry
 */
function unregisterServerCapabilities(serverId: string): void {
  // Remove tools
  for (const [key] of clientState.registry.tools) {
    if (key.startsWith(`${serverId}:`)) {
      clientState.registry.tools.delete(key);
    }
  }

  // Remove resources
  for (const [key] of clientState.registry.resources) {
    if (key.startsWith(`${serverId}:`)) {
      clientState.registry.resources.delete(key);
    }
  }

  // Remove prompts
  for (const [key] of clientState.registry.prompts) {
    if (key.startsWith(`${serverId}:`)) {
      clientState.registry.prompts.delete(key);
    }
  }
}

// =============================================================================
// Registry Access
// =============================================================================

/**
 * Get all tools from all connected servers
 */
export function getAllTools(): Array<{ serverId: string; tool: MCPToolDefinition }> {
  return Array.from(clientState.registry.tools.values());
}

/**
 * Get all resources from all connected servers
 */
export function getAllResources(): Array<{ serverId: string; resource: MCPResourceDefinition }> {
  return Array.from(clientState.registry.resources.values());
}

/**
 * Get all prompts from all connected servers
 */
export function getAllPrompts(): Array<{ serverId: string; prompt: MCPPromptDefinition }> {
  return Array.from(clientState.registry.prompts.values());
}

/**
 * Find a tool by name (optionally scoped to server)
 */
export function findTool(
  toolName: string,
  serverId?: string,
): { serverId: string; tool: MCPToolDefinition } | undefined {
  if (serverId) {
    return clientState.registry.tools.get(`${serverId}:${toolName}`);
  }

  // Search all servers
  for (const entry of clientState.registry.tools.values()) {
    if (entry.tool.name === toolName) {
      return entry;
    }
  }

  return undefined;
}

// =============================================================================
// Auto-Connect
// =============================================================================

/**
 * Connect to all auto-connect servers
 */
export async function connectAutoConnectServers(
  configs: MCPServerConfig[],
): Promise<void> {
  const autoConnectServers = configs.filter((c) => c.autoConnect && c.enabled);

  console.log('[MCP Client] Auto-connecting to', autoConnectServers.length, 'servers');

  for (const config of autoConnectServers) {
    try {
      await connectToMCPServer(config);
    } catch (error) {
      console.error('[MCP Client] Auto-connect failed for', config.name, ':', error);
    }
  }
}

// =============================================================================
// Re-exports
// =============================================================================

export { invokeTool, invokeToolWithApproval, requiresApproval } from './tools.mjs';
export { readResource, subscribeToResource, unsubscribeFromResource } from './resources.mjs';
export { createSamplingMessage, isSamplingAvailable } from './sampling.mjs';
