import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerNotebookTools } from './tools/notebooks.mjs';
import { registerAppTools } from './tools/apps.mjs';
import { registerConfigTools } from './tools/config.mjs';
import { registerResources } from './resources.mjs';
import { registerPrompts } from './prompts.mjs';

export type SrcbookDeps = {
  // Session management
  listSessions: () => Promise<Record<string, any>>;
  createSession: (srcbookDir: string) => Promise<any>;
  findSession: (id: string) => Promise<any>;
  addCell: (session: any, cell: any, index: number) => Promise<void>;
  updateCell: (session: any, cell: any, updates: any) => Promise<any>;
  findCell: (session: any, id: string) => any;
  removeCell: (session: any, id: string) => any[];
  updateSession: (session: any, updates: any, flush?: boolean) => Promise<any>;
  exportSrcmdText: (session: any) => string;

  // Srcbook creation
  createSrcbook: (language: string, name?: string) => Promise<{ dir: string; srcbookId: string }>;
  removeSrcbook: (dir: string) => Promise<void>;
  srcbooksDir: string;

  // Cell execution
  executeCellPromise: (options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    entry: string;
    command: string;
  }) => Promise<{ stdout: string; stderr: string; exitCode: number }>;

  // Secrets
  getSecretsAssociatedWithSession: (sessionId: string) => Promise<Record<string, string>>;

  // Apps
  loadApps: (sort: 'asc' | 'desc') => Promise<any[]>;
  loadApp: (id: string) => Promise<any>;
  createApp: (data: { name: string }) => Promise<any>;
  createAppWithAi: (data: { name: string; prompt: string }) => Promise<any>;
  serializeApp: (app: any) => any;
  deleteApp: (id: string) => Promise<void>;
  updateApp: (id: string, attrs: { name: string }) => Promise<any>;
  getFlatFilesForApp: (appId: string) => Promise<any[]>;
  loadFile: (appId: string, path: string) => Promise<{ content: string }>;
  createFile: (appId: string, path: string, content: string) => Promise<void>;

  // Config
  getConfig: () => Promise<any>;
  updateConfig: (attrs: any) => Promise<any>;
};

export function createSrcbookMcpServer(deps: SrcbookDeps): McpServer {
  const server = new McpServer({
    name: 'srcbook',
    version: '0.0.1',
  });

  registerNotebookTools(server, deps);
  registerAppTools(server, deps);
  registerConfigTools(server, deps);
  registerResources(server, deps);
  registerPrompts(server, deps);

  return server;
}
