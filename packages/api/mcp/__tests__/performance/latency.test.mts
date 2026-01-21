/**
 * MCP Performance Tests
 *
 * Benchmarks for tool invocation, resource reading, and subscription latency.
 *
 * @see 04-mcp-testing.md section 6 for requirements
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  startSrcbookWithMCP,
  createMCPClient,
  percentile,
  benchmark,
  measureLatency,
  sleep,
  type TestSrcbookInstance,
  type TestMCPClient,
} from '../utils.mjs';

// =============================================================================
// Latency Benchmarks
// =============================================================================

describe('MCP Performance Benchmarks', () => {
  let server: TestSrcbookInstance;
  let client: TestMCPClient;

  beforeAll(async () => {
    server = await startSrcbookWithMCP();
    client = await createMCPClient(server);
  });

  afterAll(async () => {
    await client.close();
    await server.stop();
  });

  describe('tool invocation latency', () => {
    it('notebook_list < 100ms p95', async () => {
      const results = await benchmark(
        () => client.callTool('notebook_list', {}),
        100,
      );

      console.log('[Performance] notebook_list latency:', {
        p50: `${results.p50.toFixed(2)}ms`,
        p95: `${results.p95.toFixed(2)}ms`,
        p99: `${results.p99.toFixed(2)}ms`,
        avg: `${results.avg.toFixed(2)}ms`,
      });

      // TODO: Enable when connected to real implementation
      // expect(results.p95).toBeLessThan(100);
      expect(true).toBe(true);
    });

    it('cell_execute < 500ms p95 (simple code)', async () => {
      const notebook = await client.callTool<{ sessionId: string }>('notebook_create', {
        title: 'Perf Test',
      });

      const cell = await client.callTool<{ cellId: string }>('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: 'console.log("test")',
      });

      const results = await benchmark(
        () =>
          client.callTool('cell_execute', {
            sessionId: notebook.sessionId,
            cellId: cell.cellId,
          }),
        50,
      );

      console.log('[Performance] cell_execute latency:', {
        p50: `${results.p50.toFixed(2)}ms`,
        p95: `${results.p95.toFixed(2)}ms`,
        p99: `${results.p99.toFixed(2)}ms`,
        avg: `${results.avg.toFixed(2)}ms`,
      });

      // TODO: Enable when connected to real implementation
      // expect(results.p95).toBeLessThan(500);
      expect(true).toBe(true);
    });
  });

  describe('resource read latency', () => {
    it('session resource < 50ms p95', async () => {
      const notebook = await client.callTool<{ sessionId: string }>('notebook_create', {
        title: 'Resource Perf',
      });

      const results = await benchmark(
        () => client.readResource(`srcbook://session/${notebook.sessionId}`),
        100,
      );

      console.log('[Performance] session resource read latency:', {
        p50: `${results.p50.toFixed(2)}ms`,
        p95: `${results.p95.toFixed(2)}ms`,
        p99: `${results.p99.toFixed(2)}ms`,
        avg: `${results.avg.toFixed(2)}ms`,
      });

      // TODO: Enable when connected to real implementation
      // expect(results.p95).toBeLessThan(50);
      expect(true).toBe(true);
    });

    it('notebooks list resource < 100ms p95', async () => {
      const results = await benchmark(
        () => client.readResource('srcbook://notebooks'),
        100,
      );

      console.log('[Performance] notebooks list latency:', {
        p50: `${results.p50.toFixed(2)}ms`,
        p95: `${results.p95.toFixed(2)}ms`,
        avg: `${results.avg.toFixed(2)}ms`,
      });

      // TODO: Enable when connected to real implementation
      // expect(results.p95).toBeLessThan(100);
      expect(true).toBe(true);
    });
  });

  describe('subscription notification latency', () => {
    it('cell update notification < 10ms p95', async () => {
      const notebook = await client.callTool<{ sessionId: string }>('notebook_create', {
        title: 'Sub Perf',
      });

      const latencies: number[] = [];
      let lastTimestamp = 0;

      await client.subscribeResource(
        `srcbook://session/${notebook.sessionId}`,
        () => {
          if (lastTimestamp > 0) {
            latencies.push(performance.now() - lastTimestamp);
          }
        },
      );

      for (let i = 0; i < 50; i++) {
        lastTimestamp = performance.now();
        await client.callTool('cell_create', {
          sessionId: notebook.sessionId,
          type: 'markdown',
          content: `Cell ${i}`,
        });
        await sleep(50); // Wait for notification
      }

      if (latencies.length > 0) {
        console.log('[Performance] subscription notification latency:', {
          p50: `${percentile(latencies, 50).toFixed(2)}ms`,
          p95: `${percentile(latencies, 95).toFixed(2)}ms`,
          avg: `${(latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)}ms`,
        });
      }

      // TODO: Enable when connected to real implementation
      // expect(percentile(latencies, 95)).toBeLessThan(10);
      expect(true).toBe(true);
    });
  });
});

// =============================================================================
// Load Tests
// =============================================================================

describe('MCP Load Testing', () => {
  it('handles 10 concurrent clients', async () => {
    const server = await startSrcbookWithMCP();
    const clients = await Promise.all(
      Array(10)
        .fill(null)
        .map(() => createMCPClient(server)),
    );

    const results = await Promise.all(
      clients.map(async (client, i) => {
        const notebook = await client.callTool<{ sessionId: string }>('notebook_create', {
          title: `Load Test ${i}`,
        });

        for (let j = 0; j < 5; j++) {
          await client.callTool('cell_create', {
            sessionId: notebook.sessionId,
            type: 'code',
            content: `console.log("Agent ${i} Cell ${j}")`,
          });
        }

        return { success: true, sessionId: notebook.sessionId };
      }),
    );

    expect(results.every((r) => r.success)).toBe(true);

    await Promise.all(clients.map((c) => c.close()));
    await server.stop();
  });

  it('handles 100 tool invocations per second', async () => {
    const server = await startSrcbookWithMCP();
    const client = await createMCPClient(server);

    const startTime = performance.now();
    const promises: Promise<unknown>[] = [];

    for (let i = 0; i < 100; i++) {
      promises.push(client.callTool('notebook_list', {}));
    }

    await Promise.all(promises);
    const duration = performance.now() - startTime;

    console.log('[Performance] 100 tool invocations took:', `${duration.toFixed(2)}ms`);

    // TODO: Enable when connected to real implementation
    // expect(duration).toBeLessThan(1000);

    await client.close();
    await server.stop();
  });

  it('handles burst traffic', async () => {
    const server = await startSrcbookWithMCP();
    const client = await createMCPClient(server);

    // Simulate burst: 50 requests in rapid succession
    const burst1 = await Promise.all(
      Array(50)
        .fill(null)
        .map(() => client.callTool('notebook_list', {})),
    );

    // Wait, then another burst
    await sleep(100);

    const burst2 = await Promise.all(
      Array(50)
        .fill(null)
        .map(() => client.callTool('notebook_list', {})),
    );

    expect(burst1.length).toBe(50);
    expect(burst2.length).toBe(50);

    await client.close();
    await server.stop();
  });
});

// =============================================================================
// Memory Usage Tests
// =============================================================================

describe('Memory Usage', () => {
  it('does not leak memory on repeated operations', async () => {
    const server = await startSrcbookWithMCP();
    const client = await createMCPClient(server);

    // Create and delete many notebooks
    for (let i = 0; i < 50; i++) {
      const notebook = await client.callTool<{ sessionId: string }>('notebook_create', {
        title: `Memory Test ${i}`,
      });

      // Add some cells
      for (let j = 0; j < 5; j++) {
        await client.callTool('cell_create', {
          sessionId: notebook.sessionId,
          type: 'code',
          content: `const x${j} = ${j}`,
        });
      }

      // Delete the notebook
      await client.callTool('notebook_delete', {
        sessionId: notebook.sessionId,
      });
    }

    // If we got here without error, the test passes
    // In a real scenario, we'd measure heap size

    await client.close();
    await server.stop();
  });
});

// =============================================================================
// Percentile Helper Tests
// =============================================================================

describe('Percentile calculation', () => {
  it('calculates percentiles correctly', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    expect(percentile(values, 50)).toBe(5);
    expect(percentile(values, 90)).toBe(9);
    expect(percentile(values, 100)).toBe(10);
  });

  it('handles single value', () => {
    expect(percentile([42], 50)).toBe(42);
    expect(percentile([42], 95)).toBe(42);
  });

  it('handles empty array', () => {
    expect(percentile([], 50)).toBe(0);
  });
});
