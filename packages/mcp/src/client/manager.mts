import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type {
  McpServerConfig,
  McpServerInfo,
  McpServerStatus,
  McpToolDefinition,
} from './types.mjs';

type ConnectedServer = {
  config: McpServerConfig;
  client: Client;
  status: McpServerStatus;
  error?: string;
  tools: McpToolDefinition[];
};

export class McpClientManager {
  private servers: Map<string, ConnectedServer> = new Map();

  async connect(config: McpServerConfig): Promise<void> {
    // Disconnect existing connection with same name
    if (this.servers.has(config.name)) {
      await this.disconnect(config.name);
    }

    const client = new Client({
      name: 'srcbook',
      version: '0.0.1',
    });

    let transport;
    if (config.transport === 'stdio') {
      if (!config.command) {
        throw new Error(`MCP server "${config.name}" requires a command for stdio transport`);
      }
      const args = config.args ? JSON.parse(config.args) : [];
      const env = config.env ? JSON.parse(config.env) : {};
      transport = new StdioClientTransport({
        command: config.command,
        args,
        env: { ...process.env, ...env },
      });
    } else {
      if (!config.url) {
        throw new Error(`MCP server "${config.name}" requires a URL for HTTP transport`);
      }
      transport = new StreamableHTTPClientTransport(new URL(config.url));
    }

    try {
      await client.connect(transport);

      // Fetch tools from the connected server
      const toolsResult = await client.listTools();
      const tools: McpToolDefinition[] = (toolsResult.tools || []).map((t) => ({
        serverName: config.name,
        name: t.name,
        description: t.description || '',
        inputSchema: t.inputSchema as Record<string, unknown>,
      }));

      this.servers.set(config.name, {
        config,
        client,
        status: 'connected',
        tools,
      });
    } catch (e) {
      this.servers.set(config.name, {
        config,
        client,
        status: 'error',
        error: (e as Error).message,
        tools: [],
      });
      throw e;
    }
  }

  async disconnect(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (server) {
      try {
        await server.client.close();
      } catch {
        // Ignore close errors
      }
      this.servers.delete(name);
    }
  }

  async disconnectAll(): Promise<void> {
    const names = Array.from(this.servers.keys());
    await Promise.allSettled(names.map((name) => this.disconnect(name)));
  }

  getAllTools(): McpToolDefinition[] {
    const tools: McpToolDefinition[] = [];
    for (const server of this.servers.values()) {
      if (server.status === 'connected') {
        tools.push(...server.tools);
      }
    }
    return tools;
  }

  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<any> {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`MCP server "${serverName}" not found`);
    }
    if (server.status !== 'connected') {
      throw new Error(`MCP server "${serverName}" is not connected (status: ${server.status})`);
    }

    const result = await server.client.callTool({ name: toolName, arguments: args });
    return result;
  }

  listConnectedServers(): McpServerInfo[] {
    return Array.from(this.servers.values()).map((s) => ({
      name: s.config.name,
      status: s.status,
      toolCount: s.tools.length,
      error: s.error,
    }));
  }

  isConnected(name: string): boolean {
    const server = this.servers.get(name);
    return server?.status === 'connected' || false;
  }

  getToolsForServer(name: string): McpToolDefinition[] {
    const server = this.servers.get(name);
    return server?.tools || [];
  }
}

// Singleton instance
export const mcpClientManager = new McpClientManager();
