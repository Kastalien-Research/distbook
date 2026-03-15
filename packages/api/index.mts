import app from './server/http.mjs';
import wss from './server/ws.mjs';
import { SRCBOOKS_DIR } from './constants.mjs';
import { posthog } from './posthog-client.mjs';

export { app, wss, SRCBOOKS_DIR, posthog };

// Re-export MCP dependencies for the stdio CLI
export { createSrcbookMcpServer } from '@srcbook/mcp';
export type { SrcbookDeps } from '@srcbook/mcp';
export { executeCellPromise } from './exec.mjs';
export {
  listSessions,
  createSession,
  findSession,
  getOrCreateSession,
  addCell,
  updateCell,
  findCell,
  removeCell,
  updateSession,
  exportSrcmdText,
} from './session.mjs';
export { createSrcbook, removeSrcbook } from './srcbook/index.mjs';
export {
  getConfig,
  updateConfig,
  getSecretsAssociatedWithSession,
  getMcpServers,
} from './config.mjs';
export {
  loadApps,
  loadApp,
  createApp,
  createAppWithAi,
  serializeApp,
  deleteApp,
  updateApp,
} from './apps/app.mjs';
export { getFlatFilesForApp, loadFile, createFile } from './apps/disk.mjs';
