/**
 * MCP Server Module
 *
 * Implements Srcbook as an MCP server (provider) that exposes:
 * - 12 Tools: Notebook management, cell operations, execution control
 * - 5 Resources: Notebook state, cell content, outputs, dependencies
 * - 3 Prompts: Analysis notebook, debug cell, optimize notebook
 *
 * Uses the MCP SDK's McpServer class with Streamable HTTP transport.
 *
 * @see 01-mcp-server.md for full specification
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { MCPServerProviderMode } from '@srcbook/shared';
import { registerNotebookTools } from './tools.mjs';
import { registerNotebookResources } from './resources.mjs';
import { registerNotebookPrompts } from './prompts.mjs';

// =============================================================================
// Constants
// =============================================================================

export const MCP_SERVER_NAME = 'srcbook';
export const MCP_SERVER_VERSION = '1.0.0';
export const MCP_PROTOCOL_VERSION = '2025-11-25';

// =============================================================================
// Types
// =============================================================================

export interface MCPServerOptions {
  name?: string;
  version?: string;
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
    sampling?: boolean;
  };
}

export interface MCPServerInstance {
  server: McpServer;
  transport: StreamableHTTPServerTransport | null;
  status: MCPServerProviderMode['status'];
  connectedClients: Map<string, ConnectedClient>;
  startedAt: Date | null;
}

export interface ConnectedClient {
  id: string;
  name: string;
  connectedAt: Date;
  lastActivityAt: Date;
}

// =============================================================================
// Server Instance
// =============================================================================

let serverInstance: MCPServerInstance | null = null;

/**
 * Get the current MCP server capabilities declaration
 * (Per spec section 6.1)
 */
export function getServerCapabilities() {
  return {
    protocolVersion: MCP_PROTOCOL_VERSION,
    capabilities: {
      tools: {
        listChanged: true,
      },
      resources: {
        subscribe: true,
        listChanged: true,
      },
      prompts: {
        listChanged: true,
      },
    },
    serverInfo: {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    },
  };
}

/**
 * Initialize the MCP server
 */
export async function initializeMCPServer(
  options: MCPServerOptions = {},
): Promise<MCPServerInstance> {
  if (serverInstance) {
    console.log('[MCP Server] Already initialized');
    return serverInstance;
  }

  const name = options.name || MCP_SERVER_NAME;
  const version = options.version || MCP_SERVER_VERSION;
  const capabilities = {
    tools: options.capabilities?.tools ?? true,
    resources: options.capabilities?.resources ?? true,
    prompts: options.capabilities?.prompts ?? true,
    sampling: options.capabilities?.sampling ?? false,
  };

  console.log('[MCP Server] Initializing with capabilities:', capabilities);

  // Create McpServer instance
  const server = new McpServer({
    name,
    version,
  });

  // Register capabilities
  if (capabilities.tools) {
    registerNotebookTools(server);
  }

  if (capabilities.resources) {
    registerNotebookResources(server);
  }

  if (capabilities.prompts) {
    registerNotebookPrompts(server);
  }

  serverInstance = {
    server,
    transport: null,
    status: 'stopped',
    connectedClients: new Map(),
    startedAt: null,
  };

  console.log('[MCP Server] Initialized successfully');
  return serverInstance;
}

/**
 * Get the current MCP server instance
 */
export function getMCPServer(): MCPServerInstance | null {
  return serverInstance;
}

/**
 * Start the MCP server with HTTP transport
 */
export async function startMCPServer(port?: number): Promise<void> {
  if (!serverInstance) {
    throw new Error('MCP server not initialized. Call initializeMCPServer first.');
  }

  if (serverInstance.status === 'running') {
    console.log('[MCP Server] Already running');
    return;
  }

  // TODO: Create and configure StreamableHTTPServerTransport
  // 1. Create transport with port
  // 2. Connect to server
  // 3. Start listening

  console.log('[MCP Server] Starting on port:', port || 'default');
  serverInstance.status = 'running';
  serverInstance.startedAt = new Date();
}

/**
 * Stop the MCP server
 */
export async function stopMCPServer(): Promise<void> {
  if (!serverInstance) {
    return;
  }

  if (serverInstance.status === 'stopped') {
    console.log('[MCP Server] Already stopped');
    return;
  }

  // TODO: Implement graceful shutdown
  // 1. Notify connected clients
  // 2. Close all active subscriptions
  // 3. Close transport
  // 4. Clear client list

  console.log('[MCP Server] Stopping...');

  for (const [clientId, client] of serverInstance.connectedClients) {
    console.log('[MCP Server] Disconnecting client:', client.name);
    serverInstance.connectedClients.delete(clientId);
  }

  serverInstance.status = 'stopped';
  serverInstance.transport = null;
  serverInstance.startedAt = null;

  console.log('[MCP Server] Stopped');
}

/**
 * Get server status
 */
export function getMCPServerStatus(): {
  status: MCPServerProviderMode['status'];
  clientCount: number;
  startedAt: Date | null;
  capabilities: ReturnType<typeof getServerCapabilities>;
} {
  if (!serverInstance) {
    return {
      status: 'stopped',
      clientCount: 0,
      startedAt: null,
      capabilities: getServerCapabilities(),
    };
  }

  return {
    status: serverInstance.status,
    clientCount: serverInstance.connectedClients.size,
    startedAt: serverInstance.startedAt,
    capabilities: getServerCapabilities(),
  };
}

/**
 * Register a new client connection
 */
export function registerClient(id: string, name: string): ConnectedClient {
  if (!serverInstance) {
    throw new Error('MCP server not initialized');
  }

  const client: ConnectedClient = {
    id,
    name,
    connectedAt: new Date(),
    lastActivityAt: new Date(),
  };

  serverInstance.connectedClients.set(id, client);
  console.log('[MCP Server] Client connected:', name);

  return client;
}

/**
 * Unregister a client connection
 */
export function unregisterClient(id: string): boolean {
  if (!serverInstance) {
    return false;
  }

  const client = serverInstance.connectedClients.get(id);
  if (!client) {
    return false;
  }

  serverInstance.connectedClients.delete(id);
  console.log('[MCP Server] Client disconnected:', client.name);

  return true;
}

/**
 * Update client activity timestamp
 */
export function updateClientActivity(id: string): boolean {
  if (!serverInstance) {
    return false;
  }

  const client = serverInstance.connectedClients.get(id);
  if (!client) {
    return false;
  }

  client.lastActivityAt = new Date();
  return true;
}

/**
 * Get all connected clients
 */
export function getConnectedClients(): ConnectedClient[] {
  if (!serverInstance) {
    return [];
  }

  return Array.from(serverInstance.connectedClients.values());
}

// =============================================================================
// Re-exports
// =============================================================================

export { registerNotebookTools } from './tools.mjs';
export { registerNotebookResources, subscribeToResource, unsubscribeFromResource } from './resources.mjs';
export { registerNotebookPrompts } from './prompts.mjs';
