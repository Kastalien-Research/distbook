import Path from 'node:path';
import { spawn } from 'node:child_process';

interface NodeError extends Error {
  code?: string;
}

export type BaseExecRequestType = {
  cwd: string;
  stdout: (data: Buffer) => void;
  stderr: (data: Buffer) => void;
  onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
  onError?: (err: NodeError) => void;
};

export type NodeRequestType = BaseExecRequestType & {
  env: NodeJS.ProcessEnv;
  entry: string;
};

export type NPMInstallRequestType = BaseExecRequestType & {
  packages?: Array<string>;
  args?: Array<string>;
};

type NpxRequestType = BaseExecRequestType & {
  args: Array<string>;
};

type SpawnCallRequestType = {
  cwd: string;
  env: NodeJS.ProcessEnv;
  command: string;
  args: Array<string>;
  stdout: (data: Buffer) => void;
  stderr: (data: Buffer) => void;
  onExit: (code: number | null, signal: NodeJS.Signals | null) => void;
  onError?: (err: NodeError) => void;
};

export function spawnCall(options: SpawnCallRequestType) {
  const { cwd, env, command, args, stdout, stderr, onExit, onError } = options;
  const child = spawn(command, args, { cwd: cwd, env: env });

  child.stdout.on('data', stdout);
  child.stderr.on('data', stderr);

  child.on('error', (err) => {
    if (onError) {
      onError(err);
    } else {
      console.error(err);
    }
  });

  child.on('exit', (code, signal) => {
    onExit(code, signal);
  });

  return child;
}

/**
 * Execute a JavaScript file using node.
 *
 * Example:
 *
 *     node({
 *       cwd: '/Users/ben/.srcbook/30v2av4eee17m59dg2c29758to',
 *       env: {FOO_ENV_VAR: 'foooooooo'},
 *       entry: '/Users/ben/.srcbook/30v2av4eee17m59dg2c29758to/src/foo.js',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 *
 */
export function node(options: NodeRequestType) {
  const { cwd, env, entry, stdout, stderr, onExit, onError } = options;

  return spawnCall({
    command: 'node',
    cwd,
    args: [entry],
    stdout,
    stderr,
    onExit,
    onError,
    env: { ...process.env, ...env },
  });
}

/**
 * Execute a TypeScript file using tsx.
 *
 * Example:
 *
 *     tsx({
 *       cwd: '/Users/ben/.srcbook/30v2av4eee17m59dg2c29758to',
 *       env: {FOO_ENV_VAR: 'foooooooo'},
 *       entry: '/Users/ben/.srcbook/30v2av4eee17m59dg2c29758to/src/foo.ts',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 *
 */
export function tsx(options: NodeRequestType) {
  const { cwd, env, entry, stdout, stderr, onExit, onError } = options;

  // We are making an assumption about `tsx` being the tool of choice
  // for running TypeScript, as well as where it's located on the file system.
  return spawnCall({
    command: Path.join(cwd, 'node_modules', '.bin', 'tsx'),
    cwd,
    args: [entry],
    stdout,
    stderr,
    onExit,
    onError,
    env: { ...process.env, ...env },
  });
}

/**
 * Run npm install.
 *
 * Install all packages:
 *
 *     npmInstall({
 *       cwd: '/Users/ben/.srcbook/foo',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 *
 * Install a specific package:
 *
 *     npmInstall({
 *       cwd: '/Users/ben/.srcbook/foo',
 *       package: 'marked',
 *       stdout(data) {console.log(data.toString('utf8'))},
 *       stderr(data) {console.error(data.toString('utf8'))},
 *       onExit(code) {console.log(`Exit code: ${code}`)}
 *     });
 *
 */
export function npmInstall(options: NPMInstallRequestType) {
  const { cwd, stdout, stderr, onExit } = options;
  const args = options.packages
    ? ['install', '--include=dev', ...(options.args || []), ...options.packages]
    : ['install', '--include=dev', ...(options.args || [])];

  return spawnCall({
    command: 'npm',
    cwd,
    args,
    stdout,
    stderr,
    onExit,
    env: process.env,
  });
}

/**
 * Run vite.
 */
export function vite(options: NpxRequestType) {
  return spawnCall({
    ...options,
    command: Path.join(options.cwd, 'node_modules', '.bin', 'vite'),
    env: process.env,
  });
}

// =============================================================================
// Buffered Execution for MCP
// =============================================================================

export interface ExecuteAndCaptureOptions {
  cwd: string;
  entry: string;
  language: 'javascript' | 'typescript';
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number; // default 30s
  maxOutputBytes?: number; // default 1MB
}

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTime: number;
  timedOut: boolean;
  truncated: boolean;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_BYTES = 1_048_576; // 1MB

/**
 * Execute a JavaScript or TypeScript file and capture all output.
 *
 * Unlike the streaming `node()` and `tsx()` functions, this buffers all output
 * and returns a structured result. Designed for MCP cell_execute.
 *
 * Features:
 * - Timeout support (default 30s)
 * - Output truncation (default 1MB)
 * - Tracks execution time
 * - Non-streaming: waits for completion
 *
 * Example:
 *
 *     const result = await executeAndCapture({
 *       cwd: '/Users/ben/.srcbook/foo',
 *       entry: '/Users/ben/.srcbook/foo/src/index.ts',
 *       language: 'typescript',
 *       timeoutMs: 5000,
 *     });
 *
 *     console.log(result.stdout); // "Hello World\n"
 *     console.log(result.exitCode); // 0
 *
 */
export function executeAndCapture(options: ExecuteAndCaptureOptions): Promise<ExecutionResult> {
  const {
    cwd,
    entry,
    language,
    env = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
  } = options;

  return new Promise((resolve) => {
    const startTime = Date.now();
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let stdoutTruncated = false;
    let stderrTruncated = false;
    let timedOut = false;
    let resolved = false;

    const appendStdout = (data: Buffer) => {
      if (stdoutTruncated) return;
      const chunk = data.toString('utf8');
      if (stdoutBuffer.length + chunk.length > maxOutputBytes) {
        stdoutBuffer += chunk.slice(0, maxOutputBytes - stdoutBuffer.length);
        stdoutTruncated = true;
      } else {
        stdoutBuffer += chunk;
      }
    };

    const appendStderr = (data: Buffer) => {
      if (stderrTruncated) return;
      const chunk = data.toString('utf8');
      if (stderrBuffer.length + chunk.length > maxOutputBytes) {
        stderrBuffer += chunk.slice(0, maxOutputBytes - stderrBuffer.length);
        stderrTruncated = true;
      } else {
        stderrBuffer += chunk;
      }
    };

    const finalize = (exitCode: number | null, signal: NodeJS.Signals | null) => {
      if (resolved) return;
      resolved = true;

      const executionTime = Date.now() - startTime;

      // If killed by signal (e.g., SIGTERM from timeout), treat as failure
      const effectiveExitCode = signal ? 137 : exitCode;

      resolve({
        success: effectiveExitCode === 0,
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
        exitCode: effectiveExitCode,
        executionTime,
        timedOut,
        truncated: stdoutTruncated || stderrTruncated,
      });
    };

    const executeOptions = {
      cwd,
      env,
      entry,
      stdout: appendStdout,
      stderr: appendStderr,
      onExit: finalize,
      onError: (err: NodeError) => {
        if (resolved) return;
        appendStderr(Buffer.from(err.message || 'Unknown error'));
        finalize(1, null);
      },
    };

    // Choose executor based on language
    const child = language === 'typescript' ? tsx(executeOptions) : node(executeOptions);

    // Set up timeout
    const timeoutId = setTimeout(() => {
      if (resolved) return;
      timedOut = true;
      child.kill('SIGTERM');

      // Give process a chance to clean up, then force kill
      setTimeout(() => {
        if (!resolved) {
          child.kill('SIGKILL');
        }
      }, 1000);
    }, timeoutMs);

    // Clean up timeout when process exits
    child.on('exit', () => {
      clearTimeout(timeoutId);
    });
  });
}
