import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SrcbookDeps } from '../index.mjs';

export function registerAppTools(server: McpServer, deps: SrcbookDeps) {
  server.tool(
    'list_apps',
    'List all AI-built web applications',
    {},
    async () => {
      const dbApps = await deps.loadApps('desc');
      const appList = dbApps.map(deps.serializeApp);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(appList, null, 2) }],
      };
    },
  );

  server.tool(
    'create_app',
    'Create a new web application with AI from a natural language prompt',
    {
      name: z.string().describe('Name for the application'),
      prompt: z.string().describe('Natural language description of the app to build'),
    },
    async ({ name, prompt }) => {
      const app = await deps.createAppWithAi({ name, prompt });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(deps.serializeApp(app), null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    'read_app_file',
    'Read a file from a web application',
    {
      appId: z.string().describe('The application ID'),
      path: z.string().describe('Relative path to the file within the app'),
    },
    async ({ appId, path }) => {
      try {
        const file = await deps.loadFile(appId, path);
        return {
          content: [{ type: 'text' as const, text: file.content }],
        };
      } catch (e) {
        return {
          content: [
            { type: 'text' as const, text: `Error reading file: ${(e as Error).message}` },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'write_app_file',
    'Create or update a file in a web application',
    {
      appId: z.string().describe('The application ID'),
      path: z.string().describe('Relative path for the file within the app'),
      content: z.string().describe('File content to write'),
    },
    async ({ appId, path, content }) => {
      try {
        await deps.createFile(appId, path, content);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, path }, null, 2),
            },
          ],
        };
      } catch (e) {
        return {
          content: [
            { type: 'text' as const, text: `Error writing file: ${(e as Error).message}` },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_settings',
    'Read the current Srcbook configuration (AI provider, model, etc.)',
    {},
    async () => {
      const config = await deps.getConfig();
      // Redact API keys for security
      const safeConfig = {
        baseDir: config.baseDir,
        defaultLanguage: config.defaultLanguage,
        aiProvider: config.aiProvider,
        aiModel: config.aiModel,
        aiBaseUrl: config.aiBaseUrl,
        hasOpenaiKey: !!config.openaiKey,
        hasAnthropicKey: !!config.anthropicKey,
        hasXaiKey: !!config.xaiKey,
        hasGeminiKey: !!config.geminiKey,
        hasOpenrouterKey: !!config.openrouterKey,
        hasCustomApiKey: !!config.customApiKey,
      };
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(safeConfig, null, 2) }],
      };
    },
  );

  server.tool(
    'update_settings',
    'Update Srcbook configuration settings',
    {
      aiProvider: z.string().optional().describe('AI provider (openai, anthropic, etc.)'),
      aiModel: z.string().optional().describe('AI model identifier'),
      defaultLanguage: z
        .enum(['typescript', 'javascript'])
        .optional()
        .describe('Default notebook language'),
    },
    async (updates) => {
      const filtered = Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined),
      );
      await deps.updateConfig(filtered);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true, updated: Object.keys(filtered) }, null, 2),
          },
        ],
      };
    },
  );
}
