/**
 * Cell Execute Integration Tests
 *
 * Tests for the cell_execute tool with real session and execution flow.
 * Uses mocked session accessor and execution to test the integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SessionType } from '../../../types.mjs';
import type { CodeCellType, MarkdownCellType } from '@srcbook/shared';

// Mock the session accessor module
vi.mock('../../server/session-accessor.mjs', () => ({
  getCodeCell: vi.fn(),
  SessionNotFoundError: class SessionNotFoundError extends Error {
    readonly code = 'SESSION_NOT_FOUND' as const;
    constructor(sessionId: string) {
      super(`Session not found: ${sessionId}`);
      this.name = 'SessionNotFoundError';
    }
  },
  CellNotFoundError: class CellNotFoundError extends Error {
    readonly code = 'CELL_NOT_FOUND' as const;
    constructor(cellId: string, sessionId: string) {
      super(`Cell not found: ${cellId} in session ${sessionId}`);
      this.name = 'CellNotFoundError';
    }
  },
}));

// Mock the exec module
vi.mock('../../../exec.mjs', () => ({
  executeAndCapture: vi.fn(),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const mockCodeCell: CodeCellType = {
  id: 'cell-1',
  type: 'code',
  source: 'console.log("Hello World")',
  language: 'typescript',
  filename: 'index.ts',
  status: 'idle',
};

const mockMarkdownCell: MarkdownCellType = {
  id: 'cell-2',
  type: 'markdown',
  text: '# Header',
};

const mockSession: SessionType = {
  id: 'session-1',
  dir: '/tmp/srcbook/session-1',
  cells: [mockCodeCell, mockMarkdownCell],
  language: 'typescript',
  openedAt: Date.now(),
};

// =============================================================================
// Test Suites
// =============================================================================

describe('cell_execute integration', () => {
  let getCodeCell: ReturnType<typeof vi.fn>;
  let executeAndCapture: ReturnType<typeof vi.fn>;
  let SessionNotFoundError: new (sessionId: string) => Error;
  let CellNotFoundError: new (cellId: string, sessionId: string) => Error;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import mocked modules after clearing
    const sessionAccessor = await import('../../server/session-accessor.mjs');
    const exec = await import('../../../exec.mjs');

    getCodeCell = vi.mocked(sessionAccessor.getCodeCell);
    executeAndCapture = vi.mocked(exec.executeAndCapture);
    SessionNotFoundError = sessionAccessor.SessionNotFoundError as unknown as new (sessionId: string) => Error;
    CellNotFoundError = sessionAccessor.CellNotFoundError as unknown as new (cellId: string, sessionId: string) => Error;
  });

  describe('successful execution', () => {
    it('returns stdout from successful execution', async () => {
      getCodeCell.mockResolvedValue({ session: mockSession, cell: mockCodeCell });
      executeAndCapture.mockResolvedValue({
        success: true,
        stdout: 'Hello World\n',
        stderr: '',
        exitCode: 0,
        executionTime: 150,
        timedOut: false,
        truncated: false,
      });

      // Import the tools module to get access to the handler
      const { registerNotebookTools } = await import('../../server/tools.mjs');

      // Create a mock server to capture the handler
      let cellExecuteHandler: ((input: unknown, extra?: unknown) => Promise<unknown>) | null = null;
      const mockServer = {
        registerTool: vi.fn((name: string, _options: unknown, handler: (input: unknown, extra?: unknown) => Promise<unknown>) => {
          if (name === 'cell_execute') {
            cellExecuteHandler = handler;
          }
        }),
        sendToolListChanged: vi.fn(),
      };

      registerNotebookTools(mockServer as never);

      expect(cellExecuteHandler).not.toBeNull();

      // Call the handler
      const result = await cellExecuteHandler!({ sessionId: 'session-1', cellId: 'cell-1' });

      // Verify the result structure (it returns a task wrapper)
      expect(result).toHaveProperty('structuredContent');
      expect((result as { structuredContent: { taskId: string } }).structuredContent).toHaveProperty('taskId');

      // Verify getCodeCell was called with correct args
      expect(getCodeCell).toHaveBeenCalledWith('session-1', 'cell-1');
    });

    it('passes correct options to executeAndCapture', async () => {
      getCodeCell.mockResolvedValue({ session: mockSession, cell: mockCodeCell });
      executeAndCapture.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0,
        executionTime: 50,
        timedOut: false,
        truncated: false,
      });

      const { registerNotebookTools } = await import('../../server/tools.mjs');

      let cellExecuteHandler: ((input: unknown, extra?: unknown) => Promise<unknown>) | null = null;
      const mockServer = {
        registerTool: vi.fn((name: string, _options: unknown, handler: (input: unknown, extra?: unknown) => Promise<unknown>) => {
          if (name === 'cell_execute') {
            cellExecuteHandler = handler;
          }
        }),
        sendToolListChanged: vi.fn(),
      };

      registerNotebookTools(mockServer as never);
      await cellExecuteHandler!({ sessionId: 'session-1', cellId: 'cell-1' });

      // Wait for the task to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(executeAndCapture).toHaveBeenCalledWith({
        cwd: '/tmp/srcbook/session-1',
        entry: '/tmp/srcbook/session-1/src/index.ts',
        language: 'typescript',
        timeoutMs: 30_000,
        maxOutputBytes: 1_048_576,
      });
    });
  });

  describe('error handling', () => {
    it('handles session not found error', async () => {
      getCodeCell.mockRejectedValue(new SessionNotFoundError('nonexistent'));

      const { registerNotebookTools } = await import('../../server/tools.mjs');

      let cellExecuteHandler: ((input: unknown, extra?: unknown) => Promise<unknown>) | null = null;
      const mockServer = {
        registerTool: vi.fn((name: string, _options: unknown, handler: (input: unknown, extra?: unknown) => Promise<unknown>) => {
          if (name === 'cell_execute') {
            cellExecuteHandler = handler;
          }
        }),
        sendToolListChanged: vi.fn(),
      };

      registerNotebookTools(mockServer as never);

      // The handler creates a task, so we need to verify the task was created
      const result = await cellExecuteHandler!({ sessionId: 'nonexistent', cellId: 'cell-1' });

      expect(result).toHaveProperty('structuredContent');
      expect((result as { structuredContent: { taskId: string } }).structuredContent).toHaveProperty('taskId');
    });

    it('handles cell not found error', async () => {
      getCodeCell.mockRejectedValue(new CellNotFoundError('nonexistent', 'session-1'));

      const { registerNotebookTools } = await import('../../server/tools.mjs');

      let cellExecuteHandler: ((input: unknown, extra?: unknown) => Promise<unknown>) | null = null;
      const mockServer = {
        registerTool: vi.fn((name: string, _options: unknown, handler: (input: unknown, extra?: unknown) => Promise<unknown>) => {
          if (name === 'cell_execute') {
            cellExecuteHandler = handler;
          }
        }),
        sendToolListChanged: vi.fn(),
      };

      registerNotebookTools(mockServer as never);

      const result = await cellExecuteHandler!({ sessionId: 'session-1', cellId: 'nonexistent' });

      expect(result).toHaveProperty('structuredContent');
      expect((result as { structuredContent: { taskId: string } }).structuredContent).toHaveProperty('taskId');
    });

    it('handles execution failure', async () => {
      getCodeCell.mockResolvedValue({ session: mockSession, cell: mockCodeCell });
      executeAndCapture.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'Error: Something went wrong\n',
        exitCode: 1,
        executionTime: 100,
        timedOut: false,
        truncated: false,
      });

      const { registerNotebookTools } = await import('../../server/tools.mjs');

      let cellExecuteHandler: ((input: unknown, extra?: unknown) => Promise<unknown>) | null = null;
      const mockServer = {
        registerTool: vi.fn((name: string, _options: unknown, handler: (input: unknown, extra?: unknown) => Promise<unknown>) => {
          if (name === 'cell_execute') {
            cellExecuteHandler = handler;
          }
        }),
        sendToolListChanged: vi.fn(),
      };

      registerNotebookTools(mockServer as never);

      const result = await cellExecuteHandler!({ sessionId: 'session-1', cellId: 'cell-1' });

      expect(result).toHaveProperty('structuredContent');
      expect(executeAndCapture).toHaveBeenCalled();
    });

    it('handles execution timeout', async () => {
      getCodeCell.mockResolvedValue({ session: mockSession, cell: mockCodeCell });
      executeAndCapture.mockResolvedValue({
        success: false,
        stdout: 'partial output...',
        stderr: '',
        exitCode: 137,
        executionTime: 30000,
        timedOut: true,
        truncated: false,
      });

      const { registerNotebookTools } = await import('../../server/tools.mjs');

      let cellExecuteHandler: ((input: unknown, extra?: unknown) => Promise<unknown>) | null = null;
      const mockServer = {
        registerTool: vi.fn((name: string, _options: unknown, handler: (input: unknown, extra?: unknown) => Promise<unknown>) => {
          if (name === 'cell_execute') {
            cellExecuteHandler = handler;
          }
        }),
        sendToolListChanged: vi.fn(),
      };

      registerNotebookTools(mockServer as never);

      const result = await cellExecuteHandler!({ sessionId: 'session-1', cellId: 'cell-1' });

      expect(result).toHaveProperty('structuredContent');
      expect(executeAndCapture).toHaveBeenCalled();
    });
  });

  describe('language handling', () => {
    it('uses typescript for TypeScript sessions', async () => {
      getCodeCell.mockResolvedValue({ session: mockSession, cell: mockCodeCell });
      executeAndCapture.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0,
        executionTime: 50,
        timedOut: false,
        truncated: false,
      });

      const { registerNotebookTools } = await import('../../server/tools.mjs');

      let cellExecuteHandler: ((input: unknown, extra?: unknown) => Promise<unknown>) | null = null;
      const mockServer = {
        registerTool: vi.fn((name: string, _options: unknown, handler: (input: unknown, extra?: unknown) => Promise<unknown>) => {
          if (name === 'cell_execute') {
            cellExecuteHandler = handler;
          }
        }),
        sendToolListChanged: vi.fn(),
      };

      registerNotebookTools(mockServer as never);
      await cellExecuteHandler!({ sessionId: 'session-1', cellId: 'cell-1' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(executeAndCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'typescript',
        }),
      );
    });

    it('uses javascript for JavaScript sessions', async () => {
      const jsSession: SessionType = { ...mockSession, language: 'javascript' };
      const jsCell: CodeCellType = { ...mockCodeCell, filename: 'index.js', language: 'javascript' };

      getCodeCell.mockResolvedValue({ session: jsSession, cell: jsCell });
      executeAndCapture.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0,
        executionTime: 50,
        timedOut: false,
        truncated: false,
      });

      const { registerNotebookTools } = await import('../../server/tools.mjs');

      let cellExecuteHandler: ((input: unknown, extra?: unknown) => Promise<unknown>) | null = null;
      const mockServer = {
        registerTool: vi.fn((name: string, _options: unknown, handler: (input: unknown, extra?: unknown) => Promise<unknown>) => {
          if (name === 'cell_execute') {
            cellExecuteHandler = handler;
          }
        }),
        sendToolListChanged: vi.fn(),
      };

      registerNotebookTools(mockServer as never);
      await cellExecuteHandler!({ sessionId: 'session-1', cellId: 'cell-1' });

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(executeAndCapture).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'javascript',
        }),
      );
    });
  });
});
