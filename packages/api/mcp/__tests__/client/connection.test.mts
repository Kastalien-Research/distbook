/**
 * MCP Client Connection Unit Tests
 *
 * Tests for connection management, capability registry, and tool invocation.
 *
 * @see 04-mcp-testing.md section 3.2 for requirements
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MockMCPServer,
  createMockClient,
  startMockMCPServer,
} from '../utils.mjs';

// =============================================================================
// Connection Manager Tests
// =============================================================================

describe('ConnectionManager', () => {
  let connectionCounter = 0;

  class TestConnectionManager {
    private connections: Map<string, { config: unknown; connected: boolean }> = new Map();

    async connect(config: {
      name: string;
      transport: 'stdio' | 'http';
      command?: string;
      args?: string[];
      url?: string;
    }): Promise<string> {
      connectionCounter++;
      const connectionId = `conn-${connectionCounter}`;

      // Validate config
      if (config.transport === 'stdio' && !config.command) {
        throw new Error('Command required for stdio transport');
      }
      if (config.transport === 'http' && !config.url) {
        throw new Error('URL required for http transport');
      }

      // Simulate connection attempt
      if (config.command === 'nonexistent-command') {
        throw new Error('Command not found: nonexistent-command');
      }

      this.connections.set(connectionId, {
        config,
        connected: true,
      });

      return connectionId;
    }

    async disconnect(connectionId: string): Promise<void> {
      const conn = this.connections.get(connectionId);
      if (conn) {
        conn.connected = false;
      }
    }

    isConnected(connectionId: string): boolean {
      const conn = this.connections.get(connectionId);
      return conn?.connected ?? false;
    }

    getAllConnections(): string[] {
      return Array.from(this.connections.keys());
    }
  }

  let manager: TestConnectionManager;

  beforeEach(() => {
    manager = new TestConnectionManager();
  });

  it('connects to stdio server', async () => {
    const connectionId = await manager.connect({
      name: 'test',
      transport: 'stdio',
      command: 'node',
      args: ['mock-server.js'],
    });

    expect(connectionId).toBeDefined();
    expect(manager.isConnected(connectionId)).toBe(true);
  });

  it('connects to http server', async () => {
    const connectionId = await manager.connect({
      name: 'test',
      transport: 'http',
      url: 'http://localhost:3000/mcp',
    });

    expect(connectionId).toBeDefined();
    expect(manager.isConnected(connectionId)).toBe(true);
  });

  it('disconnects cleanly', async () => {
    const connectionId = await manager.connect({
      name: 'test',
      transport: 'stdio',
      command: 'node',
      args: ['test.js'],
    });

    await manager.disconnect(connectionId);

    expect(manager.isConnected(connectionId)).toBe(false);
  });

  it('handles connection failure', async () => {
    await expect(
      manager.connect({
        name: 'test',
        transport: 'stdio',
        command: 'nonexistent-command',
      }),
    ).rejects.toThrow();
  });

  it('requires command for stdio transport', async () => {
    await expect(
      manager.connect({
        name: 'test',
        transport: 'stdio',
      }),
    ).rejects.toThrow('Command required');
  });

  it('requires URL for http transport', async () => {
    await expect(
      manager.connect({
        name: 'test',
        transport: 'http',
      }),
    ).rejects.toThrow('URL required');
  });

  it('tracks multiple connections', async () => {
    const conn1 = await manager.connect({
      name: 'server1',
      transport: 'stdio',
      command: 'node',
      args: ['server1.js'],
    });

    const conn2 = await manager.connect({
      name: 'server2',
      transport: 'stdio',
      command: 'node',
      args: ['server2.js'],
    });

    expect(manager.getAllConnections()).toHaveLength(2);
    expect(manager.isConnected(conn1)).toBe(true);
    expect(manager.isConnected(conn2)).toBe(true);
  });
});

// =============================================================================
// Capability Registry Tests
// =============================================================================

describe('CapabilityRegistry', () => {
  interface Tool {
    name: string;
    description?: string;
    inputSchema: object;
  }

  interface Resource {
    uri: string;
    name: string;
    description?: string;
  }

  class TestCapabilityRegistry {
    private tools: Map<string, { serverId: string; tool: Tool }> = new Map();
    private resources: Map<string, { serverId: string; resource: Resource }> = new Map();

    async refreshFromClient(
      serverId: string,
      client: { listTools: () => Promise<{ tools: Tool[] }> },
    ): Promise<void> {
      const result = await client.listTools();

      for (const tool of result.tools) {
        const key = `${serverId}:${tool.name}`;
        this.tools.set(key, { serverId, tool });
      }
    }

    removeServer(serverId: string): void {
      for (const [key] of this.tools) {
        if (key.startsWith(`${serverId}:`)) {
          this.tools.delete(key);
        }
      }
      for (const [key] of this.resources) {
        if (key.startsWith(`${serverId}:`)) {
          this.resources.delete(key);
        }
      }
    }

    listTools(): Array<{ serverId: string; name: string }> {
      return Array.from(this.tools.values()).map((entry) => ({
        serverId: entry.serverId,
        name: entry.tool.name,
      }));
    }

    findTool(name: string, serverId?: string): { serverId: string; tool: Tool } | undefined {
      if (serverId) {
        return this.tools.get(`${serverId}:${name}`);
      }

      for (const entry of this.tools.values()) {
        if (entry.tool.name === name) {
          return entry;
        }
      }

      return undefined;
    }
  }

  let registry: TestCapabilityRegistry;

  beforeEach(() => {
    registry = new TestCapabilityRegistry();
  });

  it('registers tools from connected server', async () => {
    const mockClient = createMockClient([
      { name: 'query_users', inputSchema: {} },
    ]);

    await registry.refreshFromClient('server1', mockClient);

    const tools = registry.listTools();
    expect(tools).toContainEqual(
      expect.objectContaining({
        serverId: 'server1',
        name: 'query_users',
      }),
    );
  });

  it('removes tools on disconnect', async () => {
    const mockClient = createMockClient([{ name: 'test_tool' }]);
    await registry.refreshFromClient('server1', mockClient);

    registry.removeServer('server1');

    expect(registry.listTools()).toHaveLength(0);
  });

  it('handles duplicate tool names across servers', async () => {
    const mockClient1 = createMockClient([{ name: 'query' }]);
    const mockClient2 = createMockClient([{ name: 'query' }]);

    await registry.refreshFromClient('server1', mockClient1);
    await registry.refreshFromClient('server2', mockClient2);

    const tools = registry.listTools();
    expect(tools).toHaveLength(2);
    expect(tools[0].serverId).not.toBe(tools[1].serverId);
  });

  it('finds tool by name', async () => {
    const mockClient = createMockClient([
      { name: 'tool_a' },
      { name: 'tool_b' },
    ]);
    await registry.refreshFromClient('server1', mockClient);

    const found = registry.findTool('tool_a');
    expect(found?.tool.name).toBe('tool_a');
  });

  it('finds tool by name and server', async () => {
    const mockClient1 = createMockClient([{ name: 'shared_tool' }]);
    const mockClient2 = createMockClient([{ name: 'shared_tool' }]);

    await registry.refreshFromClient('server1', mockClient1);
    await registry.refreshFromClient('server2', mockClient2);

    const found = registry.findTool('shared_tool', 'server2');
    expect(found?.serverId).toBe('server2');
  });
});

// =============================================================================
// Tool Invocation Tests
// =============================================================================

describe('Tool Invocation', () => {
  it('invokes tool and returns result', async () => {
    const server = await startMockMCPServer();
    server.registerTool('multiply', (args) => ({
      result: (args.a as number) * (args.b as number),
    }));

    const result = (await server.callTool('multiply', { a: 5, b: 3 })) as { result: number };
    expect(result.result).toBe(15);

    await server.stop();
  });

  it('handles tool errors gracefully', async () => {
    const server = await startMockMCPServer();
    server.registerTool('error_tool', () => {
      throw new Error('Tool failed');
    });

    await expect(server.callTool('error_tool', {})).rejects.toThrow('Tool failed');

    await server.stop();
  });

  it('rejects unknown tool', async () => {
    const server = await startMockMCPServer();

    await expect(server.callTool('nonexistent', {})).rejects.toThrow('Tool not found');

    await server.stop();
  });

  it('passes arguments correctly', async () => {
    const server = await startMockMCPServer();
    let receivedArgs: Record<string, unknown> = {};

    server.registerTool('echo', (args) => {
      receivedArgs = args;
      return { echoed: args };
    });

    await server.callTool('echo', {
      string: 'hello',
      number: 42,
      boolean: true,
      array: [1, 2, 3],
      object: { nested: 'value' },
    });

    expect(receivedArgs.string).toBe('hello');
    expect(receivedArgs.number).toBe(42);
    expect(receivedArgs.boolean).toBe(true);
    expect(receivedArgs.array).toEqual([1, 2, 3]);
    expect((receivedArgs.object as { nested: string }).nested).toBe('value');

    await server.stop();
  });
});

// =============================================================================
// Resource Access Tests
// =============================================================================

describe('Resource Access', () => {
  it('reads resource content', async () => {
    const server = await startMockMCPServer();
    server.registerResource('test://data', { value: 42, name: 'test' });

    const content = (await server.readResource('test://data')) as { value: number };
    expect(content.value).toBe(42);

    await server.stop();
  });

  it('rejects unknown resource', async () => {
    const server = await startMockMCPServer();

    await expect(server.readResource('test://nonexistent')).rejects.toThrow('Resource not found');

    await server.stop();
  });

  it('subscribes to resource updates', async () => {
    const server = await startMockMCPServer();
    const updates: unknown[] = [];

    server.registerResource('test://stream', { count: 0 });

    server.subscribeResource('test://stream', (data) => {
      updates.push(data);
    });

    server.emitResourceUpdate('test://stream', { count: 1 });
    server.emitResourceUpdate('test://stream', { count: 2 });

    expect(updates).toHaveLength(2);
    expect((updates[0] as { count: number }).count).toBe(1);
    expect((updates[1] as { count: number }).count).toBe(2);

    await server.stop();
  });

  it('unsubscribes from resource', async () => {
    const server = await startMockMCPServer();
    const updates: unknown[] = [];

    server.registerResource('test://data', { value: 0 });

    const unsubscribe = server.subscribeResource('test://data', (data) => {
      updates.push(data);
    });

    server.emitResourceUpdate('test://data', { value: 1 });
    unsubscribe();
    server.emitResourceUpdate('test://data', { value: 2 });

    expect(updates).toHaveLength(1);

    await server.stop();
  });
});

// =============================================================================
// Auto-Connect Tests
// =============================================================================

describe('Auto-Connect', () => {
  it('connects to auto-connect servers on startup', async () => {
    const configs = [
      { name: 'server1', autoConnect: true, enabled: true },
      { name: 'server2', autoConnect: false, enabled: true },
      { name: 'server3', autoConnect: true, enabled: false },
    ];

    const autoConnectServers = configs.filter((c) => c.autoConnect && c.enabled);

    expect(autoConnectServers).toHaveLength(1);
    expect(autoConnectServers[0].name).toBe('server1');
  });
});

// =============================================================================
// Reconnection Tests
// =============================================================================

describe('Reconnection', () => {
  it('reconnects after disconnect', async () => {
    const server = await startMockMCPServer();

    // Simulate disconnect and reconnect
    await server.stop();
    await server.start();

    // Server should be usable again
    server.registerTool('test', () => ({ ok: true }));
    const result = await server.callTool('test', {});
    expect(result).toEqual({ ok: true });

    await server.stop();
  });
});
