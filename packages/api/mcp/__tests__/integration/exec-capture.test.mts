/**
 * Buffered Execution Tests
 *
 * Tests for executeAndCapture function that buffers output for MCP.
 * These are unit tests using mocked child processes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { type ChildProcess } from 'node:child_process';
import type { ExecutionResult } from '../../../exec.mjs';

// Mock child_process.spawn
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

// =============================================================================
// Test Helpers
// =============================================================================

interface MockChildProcess {
  stdout: {
    on: ReturnType<typeof vi.fn>;
  };
  stderr: {
    on: ReturnType<typeof vi.fn>;
  };
  on: ReturnType<typeof vi.fn>;
  kill: ReturnType<typeof vi.fn>;
}

function createMockChild(): MockChildProcess & {
  triggerStdout: (data: string) => void;
  triggerStderr: (data: string) => void;
  triggerExit: (code: number | null, signal?: NodeJS.Signals | null) => void;
  triggerError: (err: Error) => void;
} {
  let stdoutHandler: ((data: Buffer) => void) | null = null;
  let stderrHandler: ((data: Buffer) => void) | null = null;
  const exitHandlers: ((code: number | null, signal: NodeJS.Signals | null) => void)[] = [];
  const errorHandlers: ((err: Error) => void)[] = [];

  const mockChild: MockChildProcess = {
    stdout: {
      on: vi.fn((event: string, handler: (data: Buffer) => void) => {
        if (event === 'data') stdoutHandler = handler;
      }),
    },
    stderr: {
      on: vi.fn((event: string, handler: (data: Buffer) => void) => {
        if (event === 'data') stderrHandler = handler;
      }),
    },
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (event === 'exit') exitHandlers.push(handler as typeof exitHandlers[0]);
      if (event === 'error') errorHandlers.push(handler as typeof errorHandlers[0]);
    }),
    kill: vi.fn(),
  };

  return {
    ...mockChild,
    triggerStdout: (data: string) => {
      if (stdoutHandler) stdoutHandler(Buffer.from(data));
    },
    triggerStderr: (data: string) => {
      if (stderrHandler) stderrHandler(Buffer.from(data));
    },
    triggerExit: (code: number | null, signal: NodeJS.Signals | null = null) => {
      exitHandlers.forEach((h) => h(code, signal));
    },
    triggerError: (err: Error) => {
      errorHandlers.forEach((h) => h(err));
    },
  };
}

// =============================================================================
// Test Suites
// =============================================================================

describe('executeAndCapture', () => {
  let mockChild: ReturnType<typeof createMockChild>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Dynamically import after mocking and return both function and configured mock
  async function setupTest() {
    // Create fresh mock child for this test
    mockChild = createMockChild();

    // Clear module cache to get fresh import with mocks
    vi.resetModules();

    // Re-mock spawn after resetModules (the vi.mock call is hoisted but config is lost)
    const childProcess = await import('node:child_process');
    vi.mocked(childProcess.spawn).mockReturnValue(mockChild as unknown as ChildProcess);

    // Now import the module under test
    const module = await import('../../../exec.mjs');
    return { executeAndCapture: module.executeAndCapture, spawn: childProcess.spawn };
  }

  describe('successful execution', () => {
    it('captures stdout from successful execution', async () => {
      const { executeAndCapture } = await setupTest();

      const promise = executeAndCapture({
        cwd: '/test',
        entry: '/test/index.ts',
        language: 'typescript',
      });

      // Simulate output
      mockChild.triggerStdout('Hello World\n');
      mockChild.triggerExit(0);

      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.stdout).toBe('Hello World\n');
      expect(result.stderr).toBe('');
      expect(result.exitCode).toBe(0);
      expect(result.timedOut).toBe(false);
      expect(result.truncated).toBe(false);
    });

    it('captures multiple stdout chunks', async () => {
      const { executeAndCapture } = await setupTest();

      const promise = executeAndCapture({
        cwd: '/test',
        entry: '/test/index.ts',
        language: 'typescript',
      });

      mockChild.triggerStdout('Line 1\n');
      mockChild.triggerStdout('Line 2\n');
      mockChild.triggerStdout('Line 3\n');
      mockChild.triggerExit(0);

      const result = await promise;

      expect(result.stdout).toBe('Line 1\nLine 2\nLine 3\n');
    });
  });

  describe('failed execution', () => {
    it('captures stderr from failed execution', async () => {
      const { executeAndCapture } = await setupTest();

      const promise = executeAndCapture({
        cwd: '/test',
        entry: '/test/index.ts',
        language: 'typescript',
      });

      mockChild.triggerStderr('Error: Something went wrong\n');
      mockChild.triggerExit(1);

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('Error: Something went wrong\n');
      expect(result.exitCode).toBe(1);
    });

    it('captures mixed stdout and stderr', async () => {
      const { executeAndCapture } = await setupTest();

      const promise = executeAndCapture({
        cwd: '/test',
        entry: '/test/index.ts',
        language: 'typescript',
      });

      mockChild.triggerStdout('Processing...\n');
      mockChild.triggerStderr('Warning: deprecated\n');
      mockChild.triggerStdout('Done.\n');
      mockChild.triggerExit(0);

      const result = await promise;

      expect(result.stdout).toBe('Processing...\nDone.\n');
      expect(result.stderr).toBe('Warning: deprecated\n');
    });
  });

  describe('language selection', () => {
    it('uses tsx for TypeScript (via spawn command)', async () => {
      const { executeAndCapture, spawn: spawnMock } = await setupTest();

      const promise = executeAndCapture({
        cwd: '/test',
        entry: '/test/index.ts',
        language: 'typescript',
      });

      mockChild.triggerExit(0);
      await promise;

      expect(spawnMock).toHaveBeenCalled();
      const calls = vi.mocked(spawnMock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0]![0]).toContain('tsx');
    });

    it('uses node for JavaScript', async () => {
      const { executeAndCapture, spawn: spawnMock } = await setupTest();

      const promise = executeAndCapture({
        cwd: '/test',
        entry: '/test/index.js',
        language: 'javascript',
      });

      mockChild.triggerExit(0);
      await promise;

      expect(spawnMock).toHaveBeenCalled();
      const calls = vi.mocked(spawnMock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0]![0]).toBe('node');
    });
  });

  describe('timeout handling', () => {
    it('times out after specified duration', async () => {
      const { executeAndCapture } = await setupTest();

      const promise = executeAndCapture({
        cwd: '/test',
        entry: '/test/index.ts',
        language: 'typescript',
        timeoutMs: 1000,
      });

      // Advance past timeout
      vi.advanceTimersByTime(1001);

      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');

      // Simulate process being killed
      mockChild.triggerExit(null, 'SIGTERM');

      const result = await promise;

      expect(result.timedOut).toBe(true);
      expect(result.success).toBe(false);
    });

    it('uses default timeout of 30 seconds', async () => {
      const { executeAndCapture } = await setupTest();

      executeAndCapture({
        cwd: '/test',
        entry: '/test/index.ts',
        language: 'typescript',
      });

      // Advance to just before default timeout
      vi.advanceTimersByTime(29999);
      expect(mockChild.kill).not.toHaveBeenCalled();

      // Advance past timeout
      vi.advanceTimersByTime(2);
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
    });
  });

  describe('output truncation', () => {
    it('truncates stdout exceeding maxOutputBytes', async () => {
      const { executeAndCapture } = await setupTest();

      const promise = executeAndCapture({
        cwd: '/test',
        entry: '/test/index.ts',
        language: 'typescript',
        maxOutputBytes: 10,
      });

      mockChild.triggerStdout('12345678901234567890'); // 20 chars
      mockChild.triggerExit(0);

      const result = await promise;

      expect(result.stdout).toBe('1234567890');
      expect(result.truncated).toBe(true);
    });

    it('truncates stderr exceeding maxOutputBytes', async () => {
      const { executeAndCapture } = await setupTest();

      const promise = executeAndCapture({
        cwd: '/test',
        entry: '/test/index.ts',
        language: 'typescript',
        maxOutputBytes: 10,
      });

      mockChild.triggerStderr('ABCDEFGHIJKLMNOPQRST'); // 20 chars
      mockChild.triggerExit(1);

      const result = await promise;

      expect(result.stderr).toBe('ABCDEFGHIJ');
      expect(result.truncated).toBe(true);
    });

    it('stops appending after truncation', async () => {
      const { executeAndCapture } = await setupTest();

      const promise = executeAndCapture({
        cwd: '/test',
        entry: '/test/index.ts',
        language: 'typescript',
        maxOutputBytes: 10,
      });

      mockChild.triggerStdout('12345');
      mockChild.triggerStdout('67890'); // This fills buffer to limit
      mockChild.triggerStdout('XXXXX'); // This should be ignored
      mockChild.triggerExit(0);

      const result = await promise;

      expect(result.stdout).toBe('1234567890');
      expect(result.stdout.length).toBe(10);
    });
  });

  describe('execution time tracking', () => {
    it('tracks execution time', async () => {
      const { executeAndCapture } = await setupTest();

      const promise = executeAndCapture({
        cwd: '/test',
        entry: '/test/index.ts',
        language: 'typescript',
      });

      // Simulate 500ms execution
      vi.advanceTimersByTime(500);
      mockChild.triggerExit(0);

      const result = await promise;

      expect(result.executionTime).toBeGreaterThanOrEqual(500);
    });
  });

  describe('error handling', () => {
    it('handles process errors', async () => {
      const { executeAndCapture } = await setupTest();

      const promise = executeAndCapture({
        cwd: '/test',
        entry: '/test/index.ts',
        language: 'typescript',
      });

      // Give the event loop a tick for handlers to be registered
      await Promise.resolve();
      mockChild.triggerError(new Error('Spawn failed'));

      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.stderr).toContain('Spawn failed');
      expect(result.exitCode).toBe(1);
    });
  });

  describe('environment variables', () => {
    it('passes custom env to spawn', async () => {
      const { executeAndCapture, spawn: spawnMock } = await setupTest();

      const customEnv = { MY_VAR: 'test' };

      const promise = executeAndCapture({
        cwd: '/test',
        entry: '/test/index.ts',
        language: 'typescript',
        env: customEnv,
      });

      mockChild.triggerExit(0);
      await promise;

      expect(spawnMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({ MY_VAR: 'test' }),
        }),
      );
    });
  });
});

// =============================================================================
// Type Export Tests (verify interface is exported correctly)
// =============================================================================

describe('Type exports', () => {
  it('ExecutionResult has all required fields', async () => {
    // This test verifies the type interface at compile time
    const mockResult: ExecutionResult = {
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      executionTime: 100,
      timedOut: false,
      truncated: false,
    };

    expect(mockResult.success).toBeDefined();
    expect(mockResult.stdout).toBeDefined();
    expect(mockResult.stderr).toBeDefined();
    expect(mockResult.exitCode).toBeDefined();
    expect(mockResult.executionTime).toBeDefined();
    expect(mockResult.timedOut).toBeDefined();
    expect(mockResult.truncated).toBeDefined();
  });
});
