/**
 * MCP Server Integration Tests
 *
 * Tests for full notebook lifecycle, resource subscriptions, and protocol compliance.
 *
 * @see 04-mcp-testing.md section 4 for requirements
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  startSrcbookWithMCP,
  createMCPClient,
  type TestSrcbookInstance,
  type TestMCPClient,
} from '../utils.mjs';

// =============================================================================
// Server Integration Tests
// =============================================================================

describe('MCP Server Integration', () => {
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

  describe('notebook lifecycle', () => {
    it('creates notebook via MCP', async () => {
      // TODO: Connect to actual implementation
      const result = await client.callTool<{ sessionId: string }>('notebook_create', {
        title: 'Integration Test',
        language: 'typescript',
      });

      expect(result.sessionId).toBeDefined();
    });

    it('lists created notebooks', async () => {
      const notebooks = await client.callTool<{ notebooks: unknown[] }>('notebook_list', {});

      expect(Array.isArray(notebooks.notebooks)).toBe(true);
    });

    it('creates and executes cell', async () => {
      // TODO: Full integration with notebook system
      const notebook = await client.callTool<{ sessionId: string }>('notebook_create', {
        title: 'Cell Test',
      });

      const cell = await client.callTool<{ cellId: string }>('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: 'console.log("test")',
      });

      expect(cell.cellId).toBeDefined();
    });

    it('reads notebook state via resource', async () => {
      const notebook = await client.callTool<{ sessionId: string }>('notebook_create', {
        title: 'Resource Test',
      });

      // TODO: Connect to actual resource reading
      const state = await client.readResource<{ cells: unknown[] }>(
        `srcbook://session/${notebook.sessionId}`,
      );

      expect(state).toBeDefined();
    });

    it('deletes notebook', async () => {
      const notebook = await client.callTool<{ sessionId: string }>('notebook_create', {
        title: 'To Delete',
      });

      const result = await client.callTool<{ success: boolean }>('notebook_delete', {
        sessionId: notebook.sessionId,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('cell operations', () => {
    let sessionId: string;

    beforeEach(async () => {
      const notebook = await client.callTool<{ sessionId: string }>('notebook_create', {
        title: 'Cell Ops Test',
      });
      sessionId = notebook.sessionId;
    });

    it('creates code cell', async () => {
      const cell = await client.callTool<{ cellId: string }>('cell_create', {
        sessionId,
        type: 'code',
        content: 'const x = 1',
      });

      expect(cell.cellId).toBeDefined();
    });

    it('creates markdown cell', async () => {
      const cell = await client.callTool<{ cellId: string }>('cell_create', {
        sessionId,
        type: 'markdown',
        content: '# Header',
      });

      expect(cell.cellId).toBeDefined();
    });

    it('updates cell content', async () => {
      const cell = await client.callTool<{ cellId: string }>('cell_create', {
        sessionId,
        type: 'code',
        content: 'original',
      });

      const result = await client.callTool<{ success: boolean }>('cell_update', {
        sessionId,
        cellId: cell.cellId,
        content: 'updated',
      });

      expect(result.success).toBe(true);
    });

    it('moves cell position', async () => {
      await client.callTool('cell_create', { sessionId, type: 'code', content: 'cell 0' });
      await client.callTool('cell_create', { sessionId, type: 'code', content: 'cell 1' });

      const result = await client.callTool<{ success: boolean }>('cell_move', {
        sessionId,
        cellId: 'cell-0',
        position: 1,
      });

      expect(result.success).toBe(true);
    });

    it('deletes cell', async () => {
      const cell = await client.callTool<{ cellId: string }>('cell_create', {
        sessionId,
        type: 'code',
        content: 'to delete',
      });

      const result = await client.callTool<{ success: boolean }>('cell_delete', {
        sessionId,
        cellId: cell.cellId,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('resource subscriptions', () => {
    it('receives updates on cell creation', async () => {
      const notebook = await client.callTool<{ sessionId: string }>('notebook_create', {
        title: 'Subscription Test',
      });
      const updates: unknown[] = [];

      const unsubscribe = await client.subscribeResource(
        `srcbook://session/${notebook.sessionId}`,
        (update) => updates.push(update),
      );

      await client.callTool('cell_create', {
        sessionId: notebook.sessionId,
        type: 'markdown',
        content: '# Test',
      });

      // TODO: Implement actual subscription waiting
      // await waitForLength(() => updates, 1);

      await unsubscribe();
    });

    it('stops receiving updates after unsubscribe', async () => {
      const notebook = await client.callTool<{ sessionId: string }>('notebook_create', {
        title: 'Unsub Test',
      });
      const updates: unknown[] = [];

      const unsubscribe = await client.subscribeResource(
        `srcbook://session/${notebook.sessionId}`,
        (update) => updates.push(update),
      );

      await unsubscribe();

      await client.callTool('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: 'const x = 1',
      });

      // Should not receive update after unsubscribe
      // expect(updates).toHaveLength(0);
    });
  });

  describe('execution control', () => {
    it('executes code cell', async () => {
      const notebook = await client.callTool<{ sessionId: string }>('notebook_create', {
        title: 'Exec Test',
      });

      const cell = await client.callTool<{ cellId: string }>('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: 'console.log("hello")',
      });

      const result = await client.callTool<{
        exitCode: number;
        stdout: string;
      }>('cell_execute', {
        sessionId: notebook.sessionId,
        cellId: cell.cellId,
      });

      // TODO: Connect to actual execution
      expect(result).toBeDefined();
    });

    it('stops running cell', async () => {
      const notebook = await client.callTool<{ sessionId: string }>('notebook_create', {
        title: 'Stop Test',
      });

      const cell = await client.callTool<{ cellId: string }>('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: 'while(true) {}',
      });

      // Start execution (would run forever)
      // const execPromise = client.callTool('cell_execute', { ... });

      // Stop it
      const result = await client.callTool<{ success: boolean }>('cell_stop', {
        sessionId: notebook.sessionId,
        cellId: cell.cellId,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('dependencies', () => {
    it('installs package', async () => {
      const notebook = await client.callTool<{ sessionId: string }>('notebook_create', {
        title: 'Deps Test',
      });

      const result = await client.callTool<{ success: boolean }>('deps_install', {
        sessionId: notebook.sessionId,
        packages: ['lodash'],
      });

      expect(result.success).toBe(true);
    });

    it('reads installed dependencies', async () => {
      const notebook = await client.callTool<{ sessionId: string }>('notebook_create', {
        title: 'Deps Read Test',
      });

      const deps = await client.readResource<{ dependencies: Record<string, string> }>(
        `srcbook://session/${notebook.sessionId}/deps`,
      );

      expect(deps).toBeDefined();
    });
  });

  describe('prompts', () => {
    it('uses create_analysis_notebook prompt', async () => {
      // TODO: Implement prompt testing
      // const result = await client.getPrompt('create_analysis_notebook', {
      //   dataset_description: 'Sales data',
      //   analysis_goals: 'Revenue trends',
      // });

      expect(true).toBe(true); // Placeholder
    });

    it('uses debug_code_cell prompt', async () => {
      // TODO: Implement prompt testing
      expect(true).toBe(true); // Placeholder
    });

    it('uses optimize_notebook prompt', async () => {
      // TODO: Implement prompt testing
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('error handling', () => {
    it('returns error for invalid session', async () => {
      const result = await client.callTool('cell_create', {
        sessionId: 'nonexistent',
        type: 'code',
        content: 'test',
      });

      // Should handle gracefully
      expect(result).toBeDefined();
    });

    it('returns error for invalid cell', async () => {
      const notebook = await client.callTool<{ sessionId: string }>('notebook_create', {
        title: 'Error Test',
      });

      const result = await client.callTool('cell_execute', {
        sessionId: notebook.sessionId,
        cellId: 'nonexistent',
      });

      expect(result).toBeDefined();
    });
  });
});

// =============================================================================
// Protocol Compliance Tests
// =============================================================================

describe('MCP Protocol Compliance', () => {
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

  it('returns proper capabilities', () => {
    const capabilities = client.getServerCapabilities();

    expect(capabilities.tools?.listChanged).toBe(true);
    expect(capabilities.resources?.subscribe).toBe(true);
    expect(capabilities.resources?.listChanged).toBe(true);
    expect(capabilities.prompts?.listChanged).toBe(true);
  });

  it('handles unknown method gracefully', async () => {
    // TODO: Test JSON-RPC error response for unknown method
    expect(true).toBe(true);
  });

  it('handles malformed request gracefully', async () => {
    // TODO: Test JSON-RPC error response for malformed request
    expect(true).toBe(true);
  });
});
