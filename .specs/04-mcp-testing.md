# MCP Testing Strategy Specification

**Version:** 1.0.0
**Date:** 2026-01-13
**Status:** Draft
**Author:** AI-assisted via @loops/authoring/spec-drafting
**Depends on:** [01-mcp-server.md](./01-mcp-server.md), [02-mcp-client.md](./02-mcp-client.md), [03-mcp-security.md](./03-mcp-security.md)
**Source:** `docs/mcp-integration-spec.md`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Test Categories](#2-test-categories)
3. [Unit Tests](#3-unit-tests)
4. [Integration Tests](#4-integration-tests)
5. [Agent Tests](#5-agent-tests)
6. [Performance Tests](#6-performance-tests)
7. [Security Tests](#7-security-tests)
8. [Test Infrastructure](#8-test-infrastructure)
9. [Success Metrics](#9-success-metrics)
10. [Acceptance Criteria](#10-acceptance-criteria)

---

## 1. Overview

This specification defines the testing strategy for the MCP integration, ensuring all components work correctly individually and together.

### Testing Principles

1. **Test at Every Layer**: Unit, integration, end-to-end
2. **Agent-First Testing**: Include autonomous agent scenarios
3. **Security-Centric**: Dedicated security test suite
4. **Performance Validation**: Benchmark critical paths
5. **Regression Prevention**: Comprehensive coverage

### Test Coverage Targets

| Component | Target Coverage | Priority |
|-----------|-----------------|----------|
| MCP Server Tools | 90% | P0 |
| MCP Server Resources | 85% | P0 |
| MCP Client Connection | 85% | P0 |
| MCP Client Tools | 85% | P0 |
| Security Middleware | 95% | P0 |
| Integration Bridge | 80% | P1 |
| UI Components | 70% | P2 |

---

## 2. Test Categories

```
┌─────────────────────────────────────────────────────────────────┐
│                         Test Pyramid                             │
│                                                                  │
│                         ╱╲                                       │
│                        ╱  ╲        E2E Tests                     │
│                       ╱────╲       (Agent Scenarios)             │
│                      ╱      ╲      ~10 tests                     │
│                     ╱────────╲                                   │
│                    ╱          ╲    Integration Tests             │
│                   ╱────────────╲   (Component + Protocol)        │
│                  ╱              ╲  ~50 tests                     │
│                 ╱────────────────╲                               │
│                ╱                  ╲ Unit Tests                   │
│               ╱────────────────────╲(Functions + Classes)        │
│              ╱                      ╲~200 tests                  │
│             ╱────────────────────────╲                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Unit Tests

### 3.1 MCP Server Unit Tests

#### Tool Handler Tests

```typescript
// packages/mcp-server/src/tools/__tests__/notebook-tools.test.ts

describe('notebook_create tool', () => {
  it('creates notebook with valid title', async () => {
    const result = await notebookCreateTool.execute({
      title: 'Test Notebook',
      language: 'typescript'
    });
    expect(result.sessionId).toBeDefined();
    expect(result.title).toBe('Test Notebook');
  });

  it('rejects empty title', async () => {
    await expect(notebookCreateTool.execute({ title: '' }))
      .rejects.toThrow('Title is required');
  });

  it('defaults language to typescript', async () => {
    const result = await notebookCreateTool.execute({ title: 'Test' });
    expect(result.language).toBe('typescript');
  });
});

describe('cell_execute tool', () => {
  it('returns stdout from successful execution', async () => {
    const session = await createTestSession();
    const cell = await addCodeCell(session.id, 'console.log("hello")');

    const result = await cellExecuteTool.execute({
      sessionId: session.id,
      cellId: cell.id
    });

    expect(result.stdout).toContain('hello');
    expect(result.exitCode).toBe(0);
  });

  it('returns stderr from failed execution', async () => {
    const session = await createTestSession();
    const cell = await addCodeCell(session.id, 'throw new Error("test")');

    const result = await cellExecuteTool.execute({
      sessionId: session.id,
      cellId: cell.id
    });

    expect(result.stderr).toContain('Error: test');
    expect(result.exitCode).not.toBe(0);
  });

  it('rejects invalid session ID', async () => {
    await expect(cellExecuteTool.execute({
      sessionId: 'invalid',
      cellId: 'invalid'
    })).rejects.toThrow('Session not found');
  });
});
```

#### Resource Provider Tests

```typescript
// packages/mcp-server/src/resources/__tests__/resource-providers.test.ts

describe('session resource provider', () => {
  it('returns complete notebook state', async () => {
    const session = await createTestSession();
    await addCodeCell(session.id, 'const x = 1');
    await addMarkdownCell(session.id, '# Header');

    const resource = await readResource(`srcbook://session/${session.id}`);

    expect(resource.cells).toHaveLength(3); // title + 2 cells
    expect(resource.language).toBe('typescript');
  });

  it('returns 404 for invalid session', async () => {
    await expect(readResource('srcbook://session/invalid'))
      .rejects.toThrow('Resource not found');
  });
});

describe('resource URI validation', () => {
  it('accepts valid srcbook:// URIs', () => {
    expect(validateResourceUri('srcbook://notebooks')).toBe(true);
    expect(validateResourceUri('srcbook://session/abc')).toBe(true);
    expect(validateResourceUri('srcbook://session/abc/cell/xyz')).toBe(true);
  });

  it('rejects invalid schemes', () => {
    expect(validateResourceUri('file:///etc/passwd')).toBe(false);
    expect(validateResourceUri('http://example.com')).toBe(false);
  });
});
```

### 3.2 MCP Client Unit Tests

#### Connection Manager Tests

```typescript
// packages/mcp-client/src/__tests__/connection-manager.test.ts

describe('ConnectionManager', () => {
  it('connects to stdio server', async () => {
    const manager = new ConnectionManager();
    const mockServer = createMockStdioServer();

    const connectionId = await manager.connect({
      name: 'test',
      transport: 'stdio',
      command: 'node',
      args: ['mock-server.js']
    });

    expect(connectionId).toBeDefined();
    expect(manager.isConnected(connectionId)).toBe(true);
  });

  it('disconnects cleanly', async () => {
    const manager = new ConnectionManager();
    const connectionId = await manager.connect(testConfig);

    await manager.disconnect(connectionId);

    expect(manager.isConnected(connectionId)).toBe(false);
  });

  it('handles connection failure', async () => {
    const manager = new ConnectionManager();

    await expect(manager.connect({
      name: 'test',
      transport: 'stdio',
      command: 'nonexistent-command'
    })).rejects.toThrow();
  });
});
```

#### Capability Registry Tests

```typescript
// packages/mcp-client/src/__tests__/capability-registry.test.ts

describe('CapabilityRegistry', () => {
  it('registers tools from connected server', async () => {
    const registry = new CapabilityRegistry();
    const mockClient = createMockClient([
      { name: 'query_users', inputSchema: {} }
    ]);

    await registry.refreshFromClient('server1', mockClient);

    const tools = registry.listTools();
    expect(tools).toContainEqual(expect.objectContaining({
      serverId: 'server1',
      name: 'query_users'
    }));
  });

  it('removes tools on disconnect', async () => {
    const registry = new CapabilityRegistry();
    await registry.refreshFromClient('server1', mockClient);

    registry.removeServer('server1');

    expect(registry.listTools()).toHaveLength(0);
  });

  it('handles duplicate tool names across servers', async () => {
    const registry = new CapabilityRegistry();
    await registry.refreshFromClient('server1', createMockClient([{ name: 'query' }]));
    await registry.refreshFromClient('server2', createMockClient([{ name: 'query' }]));

    const tools = registry.listTools();
    expect(tools).toHaveLength(2);
    expect(tools[0].serverId).not.toBe(tools[1].serverId);
  });
});
```

### 3.3 Security Unit Tests

```typescript
// packages/api/mcp/__tests__/security.test.ts

describe('InputValidator', () => {
  it('rejects path traversal', () => {
    expect(validateInput({ path: '../../../etc/passwd' })).toEqual({
      valid: false,
      errors: ['Path traversal detected in path']
    });
  });

  it('rejects command injection patterns', () => {
    expect(validateInput({ cmd: 'ls; rm -rf /' })).toEqual({
      valid: false,
      errors: ['Potential command injection in cmd']
    });
  });

  it('accepts clean input', () => {
    expect(validateInput({ title: 'My Notebook', count: 5 })).toEqual({
      valid: true
    });
  });
});

describe('RateLimiter', () => {
  it('allows requests within limit', async () => {
    const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 5 });

    for (let i = 0; i < 5; i++) {
      expect(await limiter.check('client1')).toBe(true);
    }
  });

  it('blocks requests exceeding limit', async () => {
    const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 5 });

    for (let i = 0; i < 5; i++) {
      await limiter.check('client1');
    }

    expect(await limiter.check('client1')).toBe(false);
  });

  it('resets after window expires', async () => {
    const limiter = new RateLimiter({ windowMs: 100, maxRequests: 1 });

    await limiter.check('client1');
    expect(await limiter.check('client1')).toBe(false);

    await sleep(150);
    expect(await limiter.check('client1')).toBe(true);
  });
});
```

---

## 4. Integration Tests

### 4.1 MCP Server Integration Tests

```typescript
// packages/mcp-server/src/__tests__/integration/server.test.ts

describe('MCP Server Integration', () => {
  let server: SrcbookMCPServer;
  let client: TestMCPClient;

  beforeAll(async () => {
    server = await startTestServer();
    client = await createTestClient(server.endpoint);
  });

  afterAll(async () => {
    await client.close();
    await server.stop();
  });

  describe('notebook lifecycle', () => {
    it('creates, modifies, and deletes notebook', async () => {
      // Create
      const created = await client.callTool('notebook_create', {
        title: 'Integration Test',
        language: 'typescript'
      });
      expect(created.sessionId).toBeDefined();

      // Add cell
      const cell = await client.callTool('cell_create', {
        sessionId: created.sessionId,
        type: 'code',
        content: 'console.log("test")'
      });
      expect(cell.cellId).toBeDefined();

      // Execute cell
      const execution = await client.callTool('cell_execute', {
        sessionId: created.sessionId,
        cellId: cell.cellId
      });
      expect(execution.stdout).toContain('test');

      // Read state via resource
      const state = await client.readResource(`srcbook://session/${created.sessionId}`);
      expect(state.cells).toHaveLength(2);

      // Delete
      await client.callTool('notebook_delete', {
        sessionId: created.sessionId
      });
    });
  });

  describe('resource subscriptions', () => {
    it('receives updates on cell change', async () => {
      const session = await client.callTool('notebook_create', { title: 'Sub Test' });
      const updates: any[] = [];

      const unsubscribe = await client.subscribeResource(
        `srcbook://session/${session.sessionId}`,
        (update) => updates.push(update)
      );

      await client.callTool('cell_create', {
        sessionId: session.sessionId,
        type: 'markdown',
        content: '# Test'
      });

      await waitFor(() => updates.length > 0);
      expect(updates[0].cells).toHaveLength(2);

      await unsubscribe();
    });
  });
});
```

### 4.2 MCP Client Integration Tests

```typescript
// packages/mcp-client/src/__tests__/integration/client.test.ts

describe('MCP Client Integration', () => {
  let mockServer: MockMCPServer;
  let client: SrcbookMCPClient;

  beforeAll(async () => {
    mockServer = await startMockMCPServer();
    client = new SrcbookMCPClient();
    await client.connect(mockServer.config);
  });

  afterAll(async () => {
    await client.disconnectAll();
    await mockServer.stop();
  });

  describe('tool invocation', () => {
    it('invokes tool and returns result', async () => {
      mockServer.registerTool('test_tool', (args) => ({ result: args.input * 2 }));

      const result = await client.invokeTool(mockServer.id, 'test_tool', { input: 5 });
      expect(result.result).toBe(10);
    });

    it('handles tool errors gracefully', async () => {
      mockServer.registerTool('error_tool', () => { throw new Error('Tool failed'); });

      await expect(client.invokeTool(mockServer.id, 'error_tool', {}))
        .rejects.toThrow('Tool failed');
    });
  });

  describe('resource access', () => {
    it('reads resource content', async () => {
      mockServer.registerResource('test://data', { value: 42 });

      const content = await client.readResource(mockServer.id, 'test://data');
      expect(content.value).toBe(42);
    });

    it('subscribes to resource updates', async () => {
      const updates: any[] = [];
      mockServer.registerResource('test://stream', { count: 0 });

      await client.subscribeResource(mockServer.id, 'test://stream', (data) => {
        updates.push(data);
      });

      mockServer.emitResourceUpdate('test://stream', { count: 1 });
      mockServer.emitResourceUpdate('test://stream', { count: 2 });

      await waitFor(() => updates.length >= 2);
      expect(updates.map(u => u.count)).toEqual([1, 2]);
    });
  });
});
```

### 4.3 End-to-End Protocol Tests

```typescript
// packages/api/mcp/__tests__/e2e/protocol.test.ts

describe('MCP Protocol End-to-End', () => {
  it('full notebook workflow via HTTP transport', async () => {
    // Start Srcbook with MCP server
    const app = await startSrcbookWithMCP();

    // Connect via Streamable HTTP
    const client = new MCPClient();
    await client.connect({ type: 'http', url: `${app.url}/mcp` });

    // Verify capabilities
    const capabilities = client.getServerCapabilities();
    expect(capabilities.tools.listChanged).toBe(true);

    // Create notebook
    const result = await client.callTool('notebook_create', { title: 'E2E Test' });
    expect(result.sessionId).toBeDefined();

    // Verify in UI
    const notebooks = await app.api.get('/api/srcbooks');
    expect(notebooks.result).toContainEqual(expect.objectContaining({
      id: result.sessionId
    }));

    await client.close();
    await app.stop();
  });
});
```

---

## 5. Agent Tests

### 5.1 Autonomous Agent Scenarios

```typescript
// tests/agent-scenarios/autonomous-notebook.test.ts

describe('Autonomous Agent Scenarios', () => {
  describe('data analysis workflow', () => {
    it('agent creates notebook, loads data, and generates report', async () => {
      const agent = new TestAgent();
      const srcbook = await startSrcbookWithMCP();

      // Agent discovers tools
      const tools = await agent.discoverTools(srcbook.mcpEndpoint);
      expect(tools.map(t => t.name)).toContain('notebook_create');

      // Agent creates notebook
      const notebook = await agent.execute('notebook_create', {
        title: 'Sales Analysis'
      });

      // Agent adds data loading cell
      await agent.execute('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: `const data = ${JSON.stringify(testData)};`
      });

      // Agent adds analysis cell
      const analysisCell = await agent.execute('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: `
          const total = data.reduce((sum, row) => sum + row.amount, 0);
          console.log('Total:', total);
        `
      });

      // Agent executes
      const result = await agent.execute('cell_execute', {
        sessionId: notebook.sessionId,
        cellId: analysisCell.cellId
      });

      expect(result.stdout).toContain('Total:');

      await srcbook.stop();
    });
  });

  describe('error recovery', () => {
    it('agent handles execution errors and retries', async () => {
      const agent = new TestAgent();
      const srcbook = await startSrcbookWithMCP();

      const notebook = await agent.execute('notebook_create', { title: 'Error Test' });

      // Agent creates cell with error
      const cell = await agent.execute('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: 'undefinedVariable + 1'
      });

      // First execution fails
      const result1 = await agent.execute('cell_execute', {
        sessionId: notebook.sessionId,
        cellId: cell.cellId
      });
      expect(result1.exitCode).not.toBe(0);

      // Agent fixes the code
      await agent.execute('cell_update', {
        sessionId: notebook.sessionId,
        cellId: cell.cellId,
        content: 'const definedVariable = 1; console.log(definedVariable + 1);'
      });

      // Retry succeeds
      const result2 = await agent.execute('cell_execute', {
        sessionId: notebook.sessionId,
        cellId: cell.cellId
      });
      expect(result2.exitCode).toBe(0);
      expect(result2.stdout).toContain('2');

      await srcbook.stop();
    });
  });

  describe('concurrent operations', () => {
    it('handles multiple agents working on different notebooks', async () => {
      const srcbook = await startSrcbookWithMCP();
      const agents = [new TestAgent(), new TestAgent(), new TestAgent()];

      // Each agent creates and works on a notebook
      const results = await Promise.all(agents.map(async (agent, i) => {
        const notebook = await agent.execute('notebook_create', {
          title: `Agent ${i} Notebook`
        });

        for (let j = 0; j < 5; j++) {
          await agent.execute('cell_create', {
            sessionId: notebook.sessionId,
            type: 'code',
            content: `console.log("Agent ${i} Cell ${j}")`
          });
        }

        return notebook;
      }));

      // Verify all notebooks created
      const notebooks = await srcbook.api.get('/api/srcbooks');
      expect(notebooks.result.length).toBeGreaterThanOrEqual(3);

      await srcbook.stop();
    });
  });
});
```

---

## 6. Performance Tests

### 6.1 Latency Benchmarks

```typescript
// tests/performance/latency.test.ts

describe('MCP Performance', () => {
  let server: SrcbookMCPServer;
  let client: MCPClient;

  beforeAll(async () => {
    server = await startSrcbookWithMCP();
    client = await createMCPClient(server);
  });

  describe('tool invocation latency', () => {
    it('notebook_list < 100ms p95', async () => {
      const latencies: number[] = [];

      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await client.callTool('notebook_list', {});
        latencies.push(performance.now() - start);
      }

      const p95 = percentile(latencies, 95);
      expect(p95).toBeLessThan(100);
    });

    it('cell_execute < 500ms p95 (simple code)', async () => {
      const notebook = await client.callTool('notebook_create', { title: 'Perf Test' });
      const cell = await client.callTool('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: 'console.log("test")'
      });

      const latencies: number[] = [];
      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        await client.callTool('cell_execute', {
          sessionId: notebook.sessionId,
          cellId: cell.cellId
        });
        latencies.push(performance.now() - start);
      }

      const p95 = percentile(latencies, 95);
      expect(p95).toBeLessThan(500);
    });
  });

  describe('resource read latency', () => {
    it('session resource < 50ms p95', async () => {
      const notebook = await client.callTool('notebook_create', { title: 'Resource Perf' });
      const latencies: number[] = [];

      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        await client.readResource(`srcbook://session/${notebook.sessionId}`);
        latencies.push(performance.now() - start);
      }

      const p95 = percentile(latencies, 95);
      expect(p95).toBeLessThan(50);
    });
  });

  describe('subscription notification latency', () => {
    it('cell update notification < 10ms p95', async () => {
      const notebook = await client.callTool('notebook_create', { title: 'Sub Perf' });
      const latencies: number[] = [];
      let lastTimestamp: number;

      await client.subscribeResource(
        `srcbook://session/${notebook.sessionId}`,
        () => {
          latencies.push(performance.now() - lastTimestamp);
        }
      );

      for (let i = 0; i < 50; i++) {
        lastTimestamp = performance.now();
        await client.callTool('cell_create', {
          sessionId: notebook.sessionId,
          type: 'markdown',
          content: `Cell ${i}`
        });
        await sleep(50); // Wait for notification
      }

      const p95 = percentile(latencies, 95);
      expect(p95).toBeLessThan(10);
    });
  });
});
```

### 6.2 Load Tests

```typescript
// tests/performance/load.test.ts

describe('MCP Load Testing', () => {
  it('handles 10 concurrent clients', async () => {
    const server = await startSrcbookWithMCP();
    const clients = await Promise.all(
      Array(10).fill(null).map(() => createMCPClient(server))
    );

    // Each client performs operations concurrently
    const results = await Promise.all(clients.map(async (client) => {
      const notebook = await client.callTool('notebook_create', { title: 'Load Test' });

      for (let i = 0; i < 10; i++) {
        await client.callTool('cell_create', {
          sessionId: notebook.sessionId,
          type: 'code',
          content: `console.log(${i})`
        });
      }

      return { success: true, sessionId: notebook.sessionId };
    }));

    expect(results.every(r => r.success)).toBe(true);

    await Promise.all(clients.map(c => c.close()));
    await server.stop();
  });

  it('handles 100 tool invocations per second', async () => {
    const server = await startSrcbookWithMCP();
    const client = await createMCPClient(server);

    const startTime = performance.now();
    const promises: Promise<any>[] = [];

    for (let i = 0; i < 100; i++) {
      promises.push(client.callTool('notebook_list', {}));
    }

    await Promise.all(promises);
    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(1000);

    await client.close();
    await server.stop();
  });
});
```

---

## 7. Security Tests

### 7.1 Penetration Test Scenarios

```typescript
// tests/security/penetration.test.ts

describe('Security Penetration Tests', () => {
  describe('input validation', () => {
    it('rejects SQL injection in tool inputs', async () => {
      const client = await createMCPClient();

      await expect(client.callTool('notebook_create', {
        title: "'; DROP TABLE notebooks; --"
      })).resolves.toBeDefined(); // Should sanitize, not execute

      // Verify data integrity
      const notebooks = await client.callTool('notebook_list', {});
      expect(notebooks.notebooks).toBeDefined();
    });

    it('rejects path traversal in resource URIs', async () => {
      const client = await createMCPClient();

      await expect(client.readResource('srcbook://../../../etc/passwd'))
        .rejects.toThrow();

      await expect(client.readResource('file:///etc/passwd'))
        .rejects.toThrow('Invalid scheme');
    });

    it('rejects command injection in cell content', async () => {
      const client = await createMCPClient();
      const notebook = await client.callTool('notebook_create', { title: 'Security Test' });

      // This should execute in sandbox, not affect host
      const cell = await client.callTool('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: 'require("child_process").execSync("rm -rf /")'
      });

      const result = await client.callTool('cell_execute', {
        sessionId: notebook.sessionId,
        cellId: cell.cellId
      });

      // Should fail safely within sandbox
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('rate limiting', () => {
    it('blocks excessive requests', async () => {
      const client = await createMCPClient();
      const requests: Promise<any>[] = [];

      // Send 200 requests rapidly (limit is 100/min)
      for (let i = 0; i < 200; i++) {
        requests.push(client.callTool('notebook_list', {}));
      }

      const results = await Promise.allSettled(requests);
      const rejected = results.filter(r => r.status === 'rejected');

      expect(rejected.length).toBeGreaterThan(0);
      expect(rejected[0].reason).toContain('rate limit');
    });
  });

  describe('authentication', () => {
    it('rejects requests with invalid origin', async () => {
      const response = await fetch('http://localhost:2150/mcp', {
        method: 'POST',
        headers: {
          'Origin': 'http://malicious.com',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ method: 'tools/list' })
      });

      expect(response.status).toBe(403);
    });
  });
});
```

---

## 8. Test Infrastructure

### 8.1 Test Utilities

```typescript
// tests/utils/mcp-test-utils.ts

export async function startSrcbookWithMCP(options?: {
  port?: number;
  mcpConfig?: Partial<MCPServerConfig>;
}): Promise<TestSrcbookInstance> {
  // Start Srcbook with MCP server enabled
}

export async function createMCPClient(
  server: TestSrcbookInstance
): Promise<TestMCPClient> {
  // Create test client connected to server
}

export class MockMCPServer {
  registerTool(name: string, handler: ToolHandler): void;
  registerResource(uri: string, content: unknown): void;
  emitResourceUpdate(uri: string, content: unknown): void;
}

export function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[index];
}
```

### 8.2 CI Configuration

```yaml
# .github/workflows/mcp-tests.yml

name: MCP Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:mcp:unit

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:mcp:integration

  agent-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:mcp:agent

  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:mcp:performance
      - uses: actions/upload-artifact@v4
        with:
          name: performance-results
          path: test-results/performance/

  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:mcp:security
```

---

## 9. Success Metrics

### 9.1 Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Unit test coverage | >85% | Jest coverage report |
| Integration test pass rate | 100% | CI pipeline |
| Agent scenario success rate | >95% | Test results |
| Performance regression | <10% | Benchmark comparison |
| Security vulnerability count | 0 critical | Security scan |

### 9.2 Performance Targets

| Metric | Target | Measured |
|--------|--------|----------|
| Tool invocation latency p95 | <100ms | Performance tests |
| Resource read latency p95 | <50ms | Performance tests |
| Subscription notification p95 | <10ms | Performance tests |
| Concurrent client support | 10+ | Load tests |
| Tool invocation throughput | 100/s | Load tests |

---

## 10. Acceptance Criteria

### 10.1 Test Suite Requirements

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All agent scenario tests pass
- [ ] Performance targets met
- [ ] Security tests pass
- [ ] Coverage targets achieved

### 10.2 Release Criteria

| Criterion | Requirement |
|-----------|-------------|
| Unit test pass rate | 100% |
| Integration test pass rate | 100% |
| Agent test pass rate | >95% |
| Performance regression | <10% from baseline |
| Security vulnerabilities | 0 high/critical |
| Code coverage | >85% |

---

**Cross-References:**
- [00-mcp-foundation.md](./00-mcp-foundation.md) - Architecture overview
- [01-mcp-server.md](./01-mcp-server.md) - Server implementation
- [02-mcp-client.md](./02-mcp-client.md) - Client implementation
- [03-mcp-security.md](./03-mcp-security.md) - Security requirements

**Source Material:**
- `docs/mcp-integration-spec.md` - Testing strategy section
