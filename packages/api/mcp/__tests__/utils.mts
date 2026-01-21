/**
 * MCP Test Utilities
 *
 * Provides helpers for testing MCP server and client components:
 * - Mock MCP server and client factories
 * - Test session and notebook helpers
 * - Performance measurement utilities
 * - Wait and assertion helpers
 *
 * @see 04-mcp-testing.md section 8 for requirements
 */

import type {
  MCPServerConfig,
  MCPRegisteredTool,
  MCPRegisteredResource,
} from '@srcbook/shared';

// =============================================================================
// Types
// =============================================================================

export interface TestSrcbookInstance {
  url: string;
  mcpEndpoint: string;
  api: {
    get: (path: string) => Promise<{ result: unknown }>;
    post: (path: string, body: unknown) => Promise<{ result: unknown }>;
  };
  stop: () => Promise<void>;
}

export interface TestMCPClient {
  callTool: <T = unknown>(name: string, args: Record<string, unknown>) => Promise<T>;
  readResource: <T = unknown>(uri: string) => Promise<T>;
  subscribeResource: (
    uri: string,
    callback: (update: unknown) => void,
  ) => Promise<() => Promise<void>>;
  getServerCapabilities: () => {
    tools?: { listChanged?: boolean };
    resources?: { subscribe?: boolean; listChanged?: boolean };
    prompts?: { listChanged?: boolean };
  };
  close: () => Promise<void>;
}

export interface TestSession {
  id: string;
  title: string;
  language: 'typescript' | 'javascript';
}

export interface TestCell {
  id: string;
  type: 'code' | 'markdown';
  content: string;
}

export type ToolHandler = (args: Record<string, unknown>) => unknown | Promise<unknown>;

// =============================================================================
// Mock MCP Server
// =============================================================================

export class MockMCPServer {
  private tools: Map<string, ToolHandler> = new Map();
  private resources: Map<string, unknown> = new Map();
  private resourceSubscribers: Map<string, Set<(data: unknown) => void>> = new Map();

  readonly id: string;
  readonly config: MCPServerConfig;

  constructor(name: string = 'mock-server') {
    this.id = `mock-${Date.now()}`;
    this.config = {
      id: this.id,
      name,
      transport: 'stdio',
      enabled: true,
      autoConnect: false,
      timeout: 30000,
    };
  }

  registerTool(name: string, handler: ToolHandler): void {
    this.tools.set(name, handler);
  }

  registerResource(uri: string, content: unknown): void {
    this.resources.set(uri, content);
  }

  emitResourceUpdate(uri: string, content: unknown): void {
    this.resources.set(uri, content);
    const subscribers = this.resourceSubscribers.get(uri);
    if (subscribers) {
      for (const callback of subscribers) {
        callback(content);
      }
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const handler = this.tools.get(name);
    if (!handler) {
      throw new Error(`Tool not found: ${name}`);
    }
    return handler(args);
  }

  async readResource(uri: string): Promise<unknown> {
    const content = this.resources.get(uri);
    if (content === undefined) {
      throw new Error(`Resource not found: ${uri}`);
    }
    return content;
  }

  subscribeResource(uri: string, callback: (data: unknown) => void): () => void {
    if (!this.resourceSubscribers.has(uri)) {
      this.resourceSubscribers.set(uri, new Set());
    }
    this.resourceSubscribers.get(uri)!.add(callback);

    return () => {
      this.resourceSubscribers.get(uri)?.delete(callback);
    };
  }

  async start(): Promise<void> {
    console.log('[MockMCPServer] Started:', this.config.name);
  }

  async stop(): Promise<void> {
    this.tools.clear();
    this.resources.clear();
    this.resourceSubscribers.clear();
    console.log('[MockMCPServer] Stopped:', this.config.name);
  }
}

// =============================================================================
// Mock MCP Client
// =============================================================================

export function createMockClient(
  tools: Array<{ name: string; inputSchema?: object }> = [],
): {
  listTools: () => Promise<{ tools: MCPRegisteredTool[] }>;
  listResources: () => Promise<{ resources: MCPRegisteredResource[] }>;
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
} {
  return {
    listTools: async () => ({
      tools: tools.map((t) => ({
        name: t.name,
        description: `Mock tool: ${t.name}`,
        serverId: 'mock-server',
        serverName: 'Mock Server',
        inputSchema: (t.inputSchema as MCPRegisteredTool['inputSchema']) || {
          type: 'object' as const,
          properties: {},
        },
      })),
    }),
    listResources: async () => ({
      resources: [],
    }),
    callTool: async (name: string, args: Record<string, unknown>) => {
      console.log(`[MockClient] callTool: ${name}`, args);
      return { success: true, name, args };
    },
  };
}

// =============================================================================
// Test Session Helpers
// =============================================================================

let sessionCounter = 0;
let cellCounter = 0;

/**
 * Create a test session for notebook operations
 */
export async function createTestSession(options?: {
  title?: string;
  language?: 'typescript' | 'javascript';
}): Promise<TestSession> {
  sessionCounter++;
  return {
    id: `test-session-${sessionCounter}`,
    title: options?.title || `Test Session ${sessionCounter}`,
    language: options?.language || 'typescript',
  };
}

/**
 * Add a code cell to a test session
 */
export async function addCodeCell(
  _sessionId: string,
  content: string,
): Promise<TestCell> {
  cellCounter++;
  return {
    id: `test-cell-${cellCounter}`,
    type: 'code',
    content,
  };
}

/**
 * Add a markdown cell to a test session
 */
export async function addMarkdownCell(
  _sessionId: string,
  content: string,
): Promise<TestCell> {
  cellCounter++;
  return {
    id: `test-cell-${cellCounter}`,
    type: 'markdown',
    content,
  };
}

// =============================================================================
// Test Server Helpers
// =============================================================================

/**
 * Start a Srcbook instance with MCP server enabled
 */
export async function startSrcbookWithMCP(options?: {
  port?: number;
  mcpConfig?: Partial<MCPServerConfig>;
}): Promise<TestSrcbookInstance> {
  const port = options?.port || 2150;
  const url = `http://localhost:${port}`;

  // TODO: Implement actual Srcbook startup with MCP
  // For now, return a mock instance

  return {
    url,
    mcpEndpoint: `${url}/mcp`,
    api: {
      get: async (path: string) => {
        console.log(`[TestSrcbook] GET ${path}`);
        return { result: [] };
      },
      post: async (path: string, body: unknown) => {
        console.log(`[TestSrcbook] POST ${path}`, body);
        return { result: {} };
      },
    },
    stop: async () => {
      console.log('[TestSrcbook] Stopped');
    },
  };
}

/**
 * Create a test MCP client connected to a server
 */
let mockSessionCounter = 0;
let mockCellCounter = 0;

export async function createMCPClient(
  _server: TestSrcbookInstance,
): Promise<TestMCPClient> {
  // TODO: Implement actual MCP client creation
  // For now, return a mock client that returns realistic responses

  return {
    callTool: async <T = unknown,>(name: string, args: Record<string, unknown>): Promise<T> => {
      console.log(`[TestMCPClient] callTool: ${name}`, args);

      // Return realistic mock responses based on tool name
      switch (name) {
        case 'notebook_create':
          mockSessionCounter++;
          return { sessionId: `mock-session-${mockSessionCounter}`, success: true } as T;
        case 'notebook_list':
          return { notebooks: [], success: true } as T;
        case 'notebook_delete':
          return { success: true } as T;
        case 'cell_create':
          mockCellCounter++;
          return { cellId: `mock-cell-${mockCellCounter}`, success: true } as T;
        case 'cell_update':
        case 'cell_delete':
        case 'cell_move':
        case 'cell_stop':
          return { success: true } as T;
        case 'cell_execute':
          return { exitCode: 0, stdout: '', stderr: '', success: true } as T;
        case 'deps_install':
          return { success: true, packages: args.packages || [] } as T;
        default:
          return { success: true } as T;
      }
    },
    readResource: async <T = unknown,>(uri: string): Promise<T> => {
      console.log(`[TestMCPClient] readResource: ${uri}`);
      return {} as T;
    },
    subscribeResource: async (uri: string, _callback: (update: unknown) => void) => {
      console.log(`[TestMCPClient] subscribeResource: ${uri}`);
      return async () => {
        console.log(`[TestMCPClient] unsubscribe: ${uri}`);
      };
    },
    getServerCapabilities: () => ({
      tools: { listChanged: true },
      resources: { subscribe: true, listChanged: true },
      prompts: { listChanged: true },
    }),
    close: async () => {
      console.log('[TestMCPClient] Closed');
    },
  };
}

/**
 * Start a mock MCP server for testing
 */
export async function startMockMCPServer(
  name: string = 'mock-server',
): Promise<MockMCPServer> {
  const server = new MockMCPServer(name);
  await server.start();
  return server;
}

// =============================================================================
// Test Agent
// =============================================================================

let agentSessionCounter = 0;
let agentCellCounter = 0;

export class TestAgent {
  async discoverTools(
    mcpEndpoint: string,
  ): Promise<Array<{ name: string; description: string }>> {
    // TODO: Connect to endpoint and discover tools
    console.log(`[TestAgent] Discovering tools at: ${mcpEndpoint}`);
    return [
      { name: 'notebook_create', description: 'Create a new notebook' },
      { name: 'notebook_list', description: 'List all notebooks' },
      { name: 'cell_create', description: 'Create a new cell' },
      { name: 'cell_execute', description: 'Execute a code cell' },
    ];
  }

  async execute<T = unknown>(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<T> {
    console.log(`[TestAgent] Executing: ${toolName}`, args);

    // Return realistic mock responses based on tool name
    switch (toolName) {
      case 'notebook_create':
        agentSessionCounter++;
        return { sessionId: `agent-session-${agentSessionCounter}`, success: true } as T;
      case 'notebook_list':
        return { notebooks: [], success: true } as T;
      case 'notebook_delete':
        return { success: true } as T;
      case 'cell_create':
        agentCellCounter++;
        return { cellId: `agent-cell-${agentCellCounter}`, success: true } as T;
      case 'cell_update':
      case 'cell_delete':
      case 'cell_move':
      case 'cell_stop':
        return { success: true } as T;
      case 'cell_execute':
        return { exitCode: 0, stdout: '', stderr: '', success: true } as T;
      case 'deps_install':
        return { success: true, packages: args.packages || [] } as T;
      default:
        return { success: true } as T;
    }
  }
}

// =============================================================================
// Performance Helpers
// =============================================================================

/**
 * Calculate percentile from array of values
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)]!;
}

/**
 * Measure execution time of an async function
 */
export async function measureLatency<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; latencyMs: number }> {
  const start = performance.now();
  const result = await fn();
  const latencyMs = performance.now() - start;
  return { result, latencyMs };
}

/**
 * Run multiple iterations and collect latencies
 */
export async function benchmark<T>(
  fn: () => Promise<T>,
  iterations: number = 100,
): Promise<{
  latencies: number[];
  p50: number;
  p95: number;
  p99: number;
  avg: number;
  min: number;
  max: number;
}> {
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { latencyMs } = await measureLatency(fn);
    latencies.push(latencyMs);
  }

  return {
    latencies,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    p99: percentile(latencies, 99),
    avg: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    min: Math.min(...latencies),
    max: Math.max(...latencies),
  };
}

// =============================================================================
// Wait Helpers
// =============================================================================

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options?: {
    timeout?: number;
    interval?: number;
  },
): Promise<void> {
  const timeout = options?.timeout ?? 5000;
  const interval = options?.interval ?? 50;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await sleep(interval);
  }

  throw new Error(`waitFor timed out after ${timeout}ms`);
}

/**
 * Wait for array to reach expected length
 */
export async function waitForLength<T>(
  getArray: () => T[],
  expectedLength: number,
  timeout: number = 5000,
): Promise<void> {
  await waitFor(() => getArray().length >= expectedLength, { timeout });
}

// =============================================================================
// Resource URI Helpers
// =============================================================================

/**
 * Validate a srcbook:// resource URI
 */
export function validateResourceUri(uri: string): boolean {
  if (!uri.startsWith('srcbook://')) {
    return false;
  }

  // Check for path traversal
  if (uri.includes('..')) {
    return false;
  }

  // Validate allowed patterns
  const patterns = [
    /^srcbook:\/\/notebooks$/,
    /^srcbook:\/\/session\/[a-zA-Z0-9_-]+$/,
    /^srcbook:\/\/session\/[a-zA-Z0-9_-]+\/cell\/[a-zA-Z0-9_-]+$/,
    /^srcbook:\/\/session\/[a-zA-Z0-9_-]+\/outputs$/,
    /^srcbook:\/\/session\/[a-zA-Z0-9_-]+\/deps$/,
  ];

  return patterns.some((pattern) => pattern.test(uri));
}

// =============================================================================
// Test Data Generators
// =============================================================================

/**
 * Generate sample test data for data analysis scenarios
 */
export function generateTestData(rows: number = 10): Array<{ id: number; amount: number }> {
  return Array.from({ length: rows }, (_, i) => ({
    id: i + 1,
    amount: Math.round(Math.random() * 1000),
  }));
}

/**
 * Generate a unique test ID
 */
export function uniqueTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
