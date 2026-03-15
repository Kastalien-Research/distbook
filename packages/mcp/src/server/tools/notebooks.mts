import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { randomid } from '@srcbook/shared';
import type { SrcbookDeps } from '../index.mjs';

export function registerNotebookTools(server: McpServer, deps: SrcbookDeps) {
  server.tool(
    'list_srcbooks',
    'List all available srcbook notebooks with their names, paths, and languages',
    {},
    async () => {
      const sessions = await deps.listSessions();
      const list = Object.values(sessions).map((s: any) => ({
        id: s.id,
        language: s.language,
        openedAt: s.openedAt,
        title: s.cells?.find((c: any) => c.type === 'title')?.text || 'Untitled',
      }));
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(list, null, 2) }],
      };
    },
  );

  server.tool(
    'create_srcbook',
    'Create a new srcbook notebook',
    {
      name: z.string().describe('Name/title for the notebook'),
      language: z
        .enum(['typescript', 'javascript'])
        .describe('Programming language for the notebook'),
    },
    async ({ name, language }) => {
      const dir = await deps.createSrcbook(name, language);
      const session = await deps.createSession(dir);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              { sessionId: session.id, language: session.language, name },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    'read_srcbook',
    'Read all cells from a srcbook notebook',
    {
      sessionId: z.string().describe('The session ID of the notebook'),
    },
    async ({ sessionId }) => {
      const session = await deps.findSession(sessionId);
      const cells = session.cells.map((c: any) => ({
        id: c.id,
        type: c.type,
        ...(c.type === 'title' ? { text: c.text } : {}),
        ...(c.type === 'markdown' ? { text: c.text } : {}),
        ...(c.type === 'code' ? { filename: c.filename, source: c.source, status: c.status } : {}),
        ...(c.type === 'package.json' ? { source: c.source } : {}),
      }));
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              { sessionId: session.id, language: session.language, cells },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    'create_cell',
    'Add a new code or markdown cell to a srcbook notebook',
    {
      sessionId: z.string().describe('The session ID of the notebook'),
      cellType: z.enum(['code', 'markdown']).describe('Type of cell to create'),
      index: z.number().describe('Position index to insert the cell at'),
      source: z.string().describe('The cell content/source code'),
      filename: z
        .string()
        .optional()
        .describe('Filename for code cells (e.g., "example.ts")'),
    },
    async ({ sessionId, cellType, index, source, filename }) => {
      const session = await deps.findSession(sessionId);
      const cell: any = {
        id: randomid(),
        type: cellType,
      };

      if (cellType === 'code') {
        cell.filename = filename || `cell_${randomid()}.${session.language === 'typescript' ? 'ts' : 'js'}`;
        cell.source = source;
        cell.status = 'idle';
      } else {
        cell.text = source;
      }

      await deps.addCell(session, cell, index);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ cellId: cell.id, type: cell.type }, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    'update_cell',
    "Update an existing cell's content",
    {
      sessionId: z.string().describe('The session ID of the notebook'),
      cellId: z.string().describe('The ID of the cell to update'),
      source: z.string().describe('The new content for the cell'),
    },
    async ({ sessionId, cellId, source }) => {
      const session = await deps.findSession(sessionId);
      const cell = deps.findCell(session, cellId);
      if (!cell) {
        return {
          content: [{ type: 'text' as const, text: `Cell ${cellId} not found` }],
          isError: true,
        };
      }

      const updates = cell.type === 'code' ? { source } : { text: source };
      const result = await deps.updateCell(session, cell, updates);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: result.success, cellId }, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    'delete_cell',
    'Remove a cell from a srcbook notebook',
    {
      sessionId: z.string().describe('The session ID of the notebook'),
      cellId: z.string().describe('The ID of the cell to delete'),
    },
    async ({ sessionId, cellId }) => {
      const session = await deps.findSession(sessionId);
      const cell = deps.findCell(session, cellId);
      if (!cell) {
        return {
          content: [{ type: 'text' as const, text: `Cell ${cellId} not found` }],
          isError: true,
        };
      }

      const cells = deps.removeCell(session, cellId);
      await deps.updateSession(session, { cells });
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ success: true, cellId }, null, 2),
          },
        ],
      };
    },
  );

  server.tool(
    'execute_cell',
    'Execute a code cell and return stdout, stderr, and exit code',
    {
      sessionId: z.string().describe('The session ID of the notebook'),
      cellId: z.string().describe('The ID of the code cell to execute'),
    },
    async ({ sessionId, cellId }) => {
      const session = await deps.findSession(sessionId);
      const cell = deps.findCell(session, cellId);
      if (!cell || cell.type !== 'code') {
        return {
          content: [{ type: 'text' as const, text: `Code cell ${cellId} not found` }],
          isError: true,
        };
      }

      const secrets = await deps.getSecretsAssociatedWithSession(sessionId);
      const ext = session.language === 'typescript' ? 'tsx' : 'node';
      const entry = `${session.dir}/src/${cell.filename}`;

      const result = await deps.executeCellPromise({
        cwd: session.dir,
        env: { ...process.env, ...secrets },
        entry,
        command: ext,
      });

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.tool(
    'export_srcbook',
    'Export a srcbook notebook as .src.md markdown text',
    {
      sessionId: z.string().describe('The session ID of the notebook'),
    },
    async ({ sessionId }) => {
      const session = await deps.findSession(sessionId);
      const text = deps.exportSrcmdText(session);
      return {
        content: [{ type: 'text' as const, text }],
      };
    },
  );
}
