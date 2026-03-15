// MCP Server
export { createSrcbookMcpServer } from './src/server/index.mjs';
export type { SrcbookDeps } from './src/server/index.mjs';

// MCP Client
export { McpClientManager, mcpClientManager } from './src/client/manager.mjs';
export { mcpToolsToVercelTools } from './src/client/tool-adapter.mjs';
export type {
  McpServerConfig,
  McpServerTransport,
  McpServerInfo,
  McpServerStatus,
  McpToolDefinition,
} from './src/client/types.mjs';
