import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SrcbookDeps } from './index.mjs';

export function registerResources(server: McpServer, deps: SrcbookDeps) {
  // List all notebooks
  server.resource('notebooks', 'srcbook://notebooks', async () => {
    const sessions = await deps.listSessions();
    const list = Object.values(sessions).map((s: any) => ({
      id: s.id,
      language: s.language,
      title: s.cells?.find((c: any) => c.type === 'title')?.text || 'Untitled',
    }));
    return {
      contents: [
        {
          uri: 'srcbook://notebooks',
          mimeType: 'application/json',
          text: JSON.stringify(list, null, 2),
        },
      ],
    };
  });

  // Individual notebook content
  server.resource(
    'notebook',
    new ResourceTemplate('srcbook://notebook/{sessionId}', { list: undefined }),
    async (uri, { sessionId }) => {
      const session = await deps.findSession(sessionId as string);
      const text = deps.exportSrcmdText(session);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text,
          },
        ],
      };
    },
  );

  // Individual cell content
  server.resource(
    'cell',
    new ResourceTemplate('srcbook://notebook/{sessionId}/cell/{cellId}', { list: undefined }),
    async (uri, { sessionId, cellId }) => {
      const session = await deps.findSession(sessionId as string);
      const cell = deps.findCell(session, cellId as string);
      if (!cell) {
        throw new Error(`Cell ${cellId} not found in session ${sessionId}`);
      }
      const content =
        cell.type === 'code'
          ? cell.source
          : cell.type === 'markdown'
            ? cell.text
            : cell.type === 'title'
              ? cell.text
              : JSON.stringify(cell);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: cell.type === 'code' ? 'text/plain' : 'text/markdown',
            text: content,
          },
        ],
      };
    },
  );

  // App metadata
  server.resource(
    'app',
    new ResourceTemplate('srcbook://app/{appId}', { list: undefined }),
    async (uri, { appId }) => {
      const app = await deps.loadApp(appId as string);
      if (!app) {
        throw new Error(`App ${appId} not found`);
      }
      const files = await deps.getFlatFilesForApp(appId as string);
      const result = {
        ...deps.serializeApp(app),
        files: files.map((f: any) => ({ path: f.path || f.filename, language: f.language })),
      };
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );

  // App file content
  server.resource(
    'app-file',
    new ResourceTemplate('srcbook://app/{appId}/file/{+path}', { list: undefined }),
    async (uri, { appId, path }) => {
      const file = await deps.loadFile(appId as string, path as string);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/plain',
            text: file.content,
          },
        ],
      };
    },
  );

  // Configuration
  server.resource('config', 'srcbook://config', async () => {
    const config = await deps.getConfig();
    const safeConfig = {
      baseDir: config.baseDir,
      defaultLanguage: config.defaultLanguage,
      aiProvider: config.aiProvider,
      aiModel: config.aiModel,
      aiBaseUrl: config.aiBaseUrl,
    };
    return {
      contents: [
        {
          uri: 'srcbook://config',
          mimeType: 'application/json',
          text: JSON.stringify(safeConfig, null, 2),
        },
      ],
    };
  });
}
