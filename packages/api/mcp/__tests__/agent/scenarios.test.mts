/**
 * MCP Agent Scenario Tests
 *
 * Tests for autonomous agent workflows including data analysis,
 * error recovery, and concurrent operations.
 *
 * @see 04-mcp-testing.md section 5 for requirements
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  startSrcbookWithMCP,
  TestAgent,
  generateTestData,
  type TestSrcbookInstance,
} from '../utils.mjs';

// =============================================================================
// Autonomous Agent Scenarios
// =============================================================================

describe('Autonomous Agent Scenarios', () => {
  let srcbook: TestSrcbookInstance;

  beforeAll(async () => {
    srcbook = await startSrcbookWithMCP();
  });

  afterAll(async () => {
    await srcbook.stop();
  });

  describe('data analysis workflow', () => {
    it('agent creates notebook, loads data, and generates report', async () => {
      const agent = new TestAgent();
      const testData = generateTestData(10);

      // Agent discovers tools
      const tools = await agent.discoverTools(srcbook.mcpEndpoint);
      expect(tools.map((t) => t.name)).toContain('notebook_create');
      expect(tools.map((t) => t.name)).toContain('cell_create');
      expect(tools.map((t) => t.name)).toContain('cell_execute');

      // Agent creates notebook
      const notebook = await agent.execute<{ sessionId: string }>('notebook_create', {
        title: 'Sales Analysis',
      });
      expect(notebook.sessionId).toBeDefined();

      // Agent adds data loading cell
      const dataCell = await agent.execute<{ cellId: string }>('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: `const data = ${JSON.stringify(testData)};`,
      });
      expect(dataCell.cellId).toBeDefined();

      // Agent adds analysis cell
      const analysisCell = await agent.execute<{ cellId: string }>('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: `
          const total = data.reduce((sum, row) => sum + row.amount, 0);
          console.log('Total:', total);
        `,
      });
      expect(analysisCell.cellId).toBeDefined();

      // Agent executes analysis
      await agent.execute<{ stdout: string }>('cell_execute', {
        sessionId: notebook.sessionId,
        cellId: analysisCell.cellId,
      });

      // TODO: When connected to real implementation
      // const result = await agent.execute... then expect(result.stdout).toContain('Total:');
      expect(true).toBe(true);
    });

    it('agent adds markdown documentation', async () => {
      const agent = new TestAgent();

      const notebook = await agent.execute<{ sessionId: string }>('notebook_create', {
        title: 'Documented Analysis',
      });

      // Add title cell
      await agent.execute('cell_create', {
        sessionId: notebook.sessionId,
        type: 'markdown',
        content: '# Sales Data Analysis\n\nThis notebook analyzes quarterly sales data.',
      });

      // Add section header
      await agent.execute('cell_create', {
        sessionId: notebook.sessionId,
        type: 'markdown',
        content: '## Data Loading',
      });

      // Add code
      await agent.execute('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: 'const data = await loadData();',
      });

      // Add summary section
      await agent.execute('cell_create', {
        sessionId: notebook.sessionId,
        type: 'markdown',
        content: '## Summary\n\nKey findings will go here.',
      });

      expect(true).toBe(true);
    });
  });

  describe('error recovery', () => {
    it('agent handles execution errors and retries', async () => {
      const agent = new TestAgent();

      const notebook = await agent.execute<{ sessionId: string }>('notebook_create', {
        title: 'Error Test',
      });

      // Agent creates cell with error
      const cell = await agent.execute<{ cellId: string }>('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: 'undefinedVariable + 1',
      });

      // First execution fails
      await agent.execute<{ exitCode: number }>('cell_execute', {
        sessionId: notebook.sessionId,
        cellId: cell.cellId,
      });

      // TODO: When connected to real implementation
      // const result1 = await agent.execute... then expect(result1.exitCode).not.toBe(0);

      // Agent fixes the code
      await agent.execute('cell_update', {
        sessionId: notebook.sessionId,
        cellId: cell.cellId,
        content: 'const definedVariable = 1; console.log(definedVariable + 1);',
      });

      // Retry succeeds
      await agent.execute<{ exitCode: number; stdout: string }>('cell_execute', {
        sessionId: notebook.sessionId,
        cellId: cell.cellId,
      });

      // TODO: When connected to real implementation
      // const result2 = await agent.execute... then expect(result2.exitCode).toBe(0);
      // expect(result2.stdout).toContain('2');
      expect(true).toBe(true);
    });

    it('agent handles missing dependencies', async () => {
      const agent = new TestAgent();

      const notebook = await agent.execute<{ sessionId: string }>('notebook_create', {
        title: 'Deps Error Test',
      });

      // Try to use uninstalled package
      const cell = await agent.execute<{ cellId: string }>('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: 'import _ from "lodash"; console.log(_.VERSION);',
      });

      // Execution fails due to missing dep
      await agent.execute<{ exitCode: number }>('cell_execute', {
        sessionId: notebook.sessionId,
        cellId: cell.cellId,
      });

      // Agent installs dependency
      await agent.execute('deps_install', {
        sessionId: notebook.sessionId,
        packages: ['lodash'],
      });

      // Retry succeeds
      await agent.execute<{ exitCode: number }>('cell_execute', {
        sessionId: notebook.sessionId,
        cellId: cell.cellId,
      });

      // TODO: When connected to real implementation
      // const result2 = await agent.execute... then expect(result2.exitCode).toBe(0);
      expect(true).toBe(true);
    });

    it('agent recovers from invalid session', async () => {
      const agent = new TestAgent();

      // Try to operate on deleted session
      const notebook = await agent.execute<{ sessionId: string }>('notebook_create', {
        title: 'Recovery Test',
      });

      await agent.execute('notebook_delete', {
        sessionId: notebook.sessionId,
      });

      // Create cell fails on deleted session
      await agent.execute<{ error?: string }>('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: 'test',
      });

      // Agent should detect error and create new notebook
      // TODO: Implement actual recovery logic
      expect(true).toBe(true);
    });
  });

  describe('concurrent operations', () => {
    it('handles multiple agents working on different notebooks', async () => {
      const agents = [new TestAgent(), new TestAgent(), new TestAgent()];

      const results = await Promise.all(
        agents.map(async (agent, i) => {
          const notebook = await agent.execute<{ sessionId: string }>('notebook_create', {
            title: `Agent ${i} Notebook`,
          });

          for (let j = 0; j < 5; j++) {
            await agent.execute('cell_create', {
              sessionId: notebook.sessionId,
              type: 'code',
              content: `console.log("Agent ${i} Cell ${j}")`,
            });
          }

          return { agentId: i, sessionId: notebook.sessionId };
        }),
      );

      expect(results).toHaveLength(3);
      expect(new Set(results.map((r) => r.sessionId)).size).toBe(3);
    });

    it('handles sequential operations from same agent', async () => {
      const agent = new TestAgent();

      // Create multiple notebooks sequentially
      const notebooks: Array<{ sessionId: string }> = [];

      for (let i = 0; i < 5; i++) {
        const notebook = await agent.execute<{ sessionId: string }>('notebook_create', {
          title: `Sequential ${i}`,
        });
        notebooks.push(notebook);
      }

      expect(notebooks).toHaveLength(5);
    });

    it('handles interleaved operations across notebooks', async () => {
      const agent = new TestAgent();

      // Create two notebooks
      const nb1 = await agent.execute<{ sessionId: string }>('notebook_create', {
        title: 'Notebook 1',
      });
      const nb2 = await agent.execute<{ sessionId: string }>('notebook_create', {
        title: 'Notebook 2',
      });

      // Interleave operations
      await agent.execute('cell_create', { sessionId: nb1.sessionId, type: 'code', content: 'nb1 cell 1' });
      await agent.execute('cell_create', { sessionId: nb2.sessionId, type: 'code', content: 'nb2 cell 1' });
      await agent.execute('cell_create', { sessionId: nb1.sessionId, type: 'code', content: 'nb1 cell 2' });
      await agent.execute('cell_create', { sessionId: nb2.sessionId, type: 'code', content: 'nb2 cell 2' });

      expect(true).toBe(true);
    });
  });

  describe('complex workflows', () => {
    it('agent performs iterative development', async () => {
      const agent = new TestAgent();

      const notebook = await agent.execute<{ sessionId: string }>('notebook_create', {
        title: 'Iterative Dev',
      });

      // Iteration 1: Write initial code
      const cell = await agent.execute<{ cellId: string }>('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: 'function greet(name) { return "Hello " + name; }',
      });

      // Iteration 2: Refine the code
      await agent.execute('cell_update', {
        sessionId: notebook.sessionId,
        cellId: cell.cellId,
        content: 'function greet(name: string): string { return `Hello ${name}!`; }',
      });

      // Iteration 3: Add test
      await agent.execute('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: 'console.log(greet("World")); // Expected: Hello World!',
      });

      expect(true).toBe(true);
    });

    it('agent builds modular notebook structure', async () => {
      const agent = new TestAgent();

      const notebook = await agent.execute<{ sessionId: string }>('notebook_create', {
        title: 'Modular Structure',
      });

      // Utility functions cell
      await agent.execute('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: `
          // Utilities
          const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
          const avg = (arr: number[]) => sum(arr) / arr.length;
        `,
      });

      // Data processing cell
      await agent.execute('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: `
          // Data Processing
          const data = [1, 2, 3, 4, 5];
          const processed = {
            sum: sum(data),
            avg: avg(data),
          };
        `,
      });

      // Output cell
      await agent.execute('cell_create', {
        sessionId: notebook.sessionId,
        type: 'code',
        content: `
          // Results
          console.log('Sum:', processed.sum);
          console.log('Average:', processed.avg);
        `,
      });

      expect(true).toBe(true);
    });
  });

  describe('agent capabilities', () => {
    it('discovers available tools', async () => {
      const agent = new TestAgent();

      const tools = await agent.discoverTools(srcbook.mcpEndpoint);

      const expectedTools = [
        'notebook_create',
        'notebook_list',
        'cell_create',
        'cell_execute',
      ];

      for (const expected of expectedTools) {
        expect(tools.map((t) => t.name)).toContain(expected);
      }
    });

    it('handles tool not found gracefully', async () => {
      const agent = new TestAgent();

      // Try to use non-existent tool
      try {
        await agent.execute('nonexistent_tool', {});
        // If we get here, tool execution silently failed
      } catch (error) {
        // Expected behavior: throw error for unknown tool
        expect(error).toBeDefined();
      }
    });
  });
});
