export type McpServerTransport = 'stdio' | 'http';

export type McpServerConfig = {
  id: number;
  name: string;
  transport: McpServerTransport;
  command: string | null;
  args: string | null; // JSON-encoded string[]
  url: string | null;
  env: string | null; // JSON-encoded Record<string, string>
  enabled: boolean;
};

export type McpServerStatus = 'connected' | 'disconnected' | 'error';

export type McpServerInfo = {
  name: string;
  status: McpServerStatus;
  toolCount: number;
  error?: string;
};

export type McpToolDefinition = {
  serverName: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};
