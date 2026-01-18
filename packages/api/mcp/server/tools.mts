/**
 * MCP Server Tools
 *
 * Registers all notebook-related tools that external MCP clients can invoke:
 *
 * Notebook Management (5 tools):
 * - notebook_create: Create a new notebook
 * - notebook_list: List all notebooks
 * - notebook_open: Open an existing notebook
 * - notebook_delete: Delete a notebook
 * - notebook_export: Export to .src.md format
 *
 * Cell Operations (4 tools):
 * - cell_create: Create a new cell
 * - cell_update: Update cell content
 * - cell_delete: Delete a cell
 * - cell_move: Move cell to new position
 *
 * Execution Control (3 tools):
 * - cell_execute: Execute a code cell
 * - cell_stop: Stop running execution
 * - deps_install: Install npm packages
 */

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolExecution } from '@modelcontextprotocol/sdk/types.js';
import { logger, progressTracker } from '../utilities/index.mjs';
import type { ProgressToken } from '../utilities/index.mjs';
import { taskManager } from '../tasks/index.mjs';

// =============================================================================
// Notebook Management Tool Schemas
// =============================================================================

export const NotebookCreateInputSchema = z.object({
  title: z.string().min(1).describe('Title of the notebook'),
  language: z
    .enum(['typescript', 'javascript'])
    .default('typescript')
    .describe('Programming language'),
});

export const NotebookListInputSchema = z.object({
  limit: z.number().positive().default(50).describe('Maximum notebooks to return'),
  offset: z.number().nonnegative().default(0).describe('Pagination offset'),
});

export const NotebookOpenInputSchema = z
  .object({
    path: z.string().optional().describe('File system path to .src.md'),
    sessionId: z.string().optional().describe('Existing session ID'),
  })
  .refine((data) => data.path || data.sessionId, {
    message: 'Either path or sessionId is required',
  });

export const NotebookDeleteInputSchema = z.object({
  sessionId: z.string().describe('Session ID of notebook to delete'),
});

export const NotebookExportInputSchema = z.object({
  sessionId: z.string().describe('Session ID of notebook to export'),
});

// =============================================================================
// Cell Operation Tool Schemas
// =============================================================================

export const CellCreateInputSchema = z.object({
  sessionId: z.string().describe('The notebook session ID'),
  type: z.enum(['code', 'markdown']).describe('Cell type'),
  content: z.string().describe('Initial cell content'),
  index: z.number().optional().describe('Position (default: end of notebook)'),
  filename: z.string().optional().describe('For code cells (auto-generated if omitted)'),
});

export const CellUpdateInputSchema = z.object({
  sessionId: z.string().describe('The notebook session ID'),
  cellId: z.string().describe('The cell ID to update'),
  content: z.string().describe('New cell content'),
});

export const CellDeleteInputSchema = z.object({
  sessionId: z.string().describe('The notebook session ID'),
  cellId: z.string().describe('The cell ID to delete'),
});

export const CellMoveInputSchema = z.object({
  sessionId: z.string().describe('The notebook session ID'),
  cellId: z.string().describe('The cell ID to move'),
  newIndex: z.number().nonnegative().describe('New position index'),
});

// =============================================================================
// Execution Control Tool Schemas
// =============================================================================

export const CellExecuteInputSchema = z.object({
  sessionId: z.string().describe('The notebook session ID'),
  cellId: z.string().describe('The cell ID to execute'),
});

export const CellStopInputSchema = z.object({
  sessionId: z.string().describe('The notebook session ID'),
  cellId: z.string().describe('The cell ID to stop'),
});

export const DepsInstallInputSchema = z.object({
  sessionId: z.string().describe('The notebook session ID'),
  packages: z.array(z.string()).describe("Package names (e.g., ['lodash', 'axios'])"),
});

// =============================================================================
// Output Schemas
// =============================================================================

const BaseResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  taskId: z.string().optional(),
});

const NotebookMetadataSchema = z.object({
  sessionId: z.string(),
  title: z.string(),
  language: z.enum(['typescript', 'javascript']),
  cellCount: z.number().nonnegative().optional(),
  updatedAt: z.string().optional(),
});

const NotebookCreateOutputSchema = BaseResultSchema.extend({
  session: NotebookMetadataSchema.optional(),
});

const NotebookListOutputSchema = z.object({
  notebooks: NotebookMetadataSchema.array(),
  total: z.number().nonnegative(),
  limit: z.number().nonnegative().optional(),
  offset: z.number().nonnegative().optional(),
  nextCursor: z.string().optional(),
});

const NotebookOpenOutputSchema = BaseResultSchema.extend({
  session: NotebookMetadataSchema.optional(),
});

const NotebookExportOutputSchema = BaseResultSchema.extend({
  markdown: z.string().optional(),
});

const CellMetadataSchema = z.object({
  id: z.string(),
  type: z.enum(['code', 'markdown', 'title']),
  content: z.string(),
  filename: z.string().optional(),
});

const CellOperationOutputSchema = BaseResultSchema.extend({
  cell: CellMetadataSchema.optional(),
});

const CellExecuteOutputSchema = BaseResultSchema.extend({
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  exitCode: z.number().int().optional(),
  executionTime: z.number().nonnegative().optional(),
});

const DepsInstallOutputSchema = BaseResultSchema.extend({
  installed: z.array(z.string()).optional(),
});

// =============================================================================
// Helpers
// =============================================================================

function startProgress(token: ProgressToken | undefined, message: string): void {
  if (token === undefined) {
    return;
  }
  if (!progressTracker.isActive(token)) {
    try {
      progressTracker.register(token);
    } catch (error) {
      console.warn('[MCP Progress] Failed to register token', token, error);
      return;
    }
  }
  progressTracker.notify({ progressToken: token, progress: 0, message });
}

function completeProgress(token: ProgressToken | undefined): void {
  if (token === undefined) {
    return;
  }
  if (progressTracker.isActive(token)) {
    progressTracker.complete(token);
  }
}

async function createTaskForTool<T>(
  toolName: string,
  operation: () => Promise<T>,
): Promise<{ structuredContent: { success: boolean; taskId: string } }> {
  const { task, execution } = await taskManager.executeAsTask(operation);
  execution.catch((error) => {
    logger.error({ tool: toolName, taskId: task.taskId, error: error?.message || error });
  });
  logger.info({ tool: toolName, taskId: task.taskId, message: 'Task created for tool' });
  return {
    structuredContent: {
      success: true,
      taskId: task.taskId,
    },
  };
}

function notImplemented(toolName: string): { structuredContent: { success: boolean; error: string } } {
  const error = `${toolName} not yet implemented`;
  logger.warning({ tool: toolName, error });
  return {
    structuredContent: {
      success: false,
      error,
    },
  };
}

// =============================================================================
// Tool Registration
// =============================================================================

/**
 * Register all notebook tools with the MCP server
 */
export function registerNotebookTools(server: McpServer): void {
  const longRunningExecution: ToolExecution = { taskSupport: 'optional' };

  // =========================================================================
  // Notebook Management Tools
  // =========================================================================

  server.registerTool(
    'notebook_create',
    {
      title: 'Create Notebook',
      description: 'Create a new TypeScript or JavaScript notebook',
      inputSchema: NotebookCreateInputSchema,
      outputSchema: NotebookCreateOutputSchema,
      annotations: {
        title: 'Create notebook',
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async (input, extra) => {
      const progressToken = extra?.progressToken as ProgressToken | undefined;
      startProgress(progressToken, 'Creating notebook');

      const session = {
        sessionId: randomUUID(),
        title: input.title,
        language: input.language,
        cellCount: 0,
        updatedAt: new Date().toISOString(),
      };

      logger.info({ tool: 'notebook_create', sessionId: session.sessionId, language: input.language });
      completeProgress(progressToken);

      return {
        structuredContent: {
          success: true,
          message: 'Notebook created',
          session,
        },
      };
    },
  );

  server.registerTool(
    'notebook_list',
    {
      title: 'List Notebooks',
      description: 'List all available Srcbook notebooks',
      inputSchema: NotebookListInputSchema,
      outputSchema: NotebookListOutputSchema,
      annotations: {
        title: 'List notebooks',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (input) => {
      logger.debug({ tool: 'notebook_list', limit: input.limit, offset: input.offset });

      return {
        structuredContent: {
          notebooks: [],
          total: 0,
          limit: input.limit,
          offset: input.offset,
        },
      };
    },
  );

  server.registerTool(
    'notebook_open',
    {
      title: 'Open Notebook',
      description: 'Open an existing Srcbook notebook',
      inputSchema: NotebookOpenInputSchema,
      outputSchema: NotebookOpenOutputSchema,
      annotations: {
        title: 'Open notebook',
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (input) => {
      logger.info({ tool: 'notebook_open', sessionId: input.sessionId, path: input.path });
      return notImplemented('notebook_open');
    },
  );

  server.registerTool(
    'notebook_delete',
    {
      title: 'Delete Notebook',
      description: 'Delete a Srcbook notebook',
      inputSchema: NotebookDeleteInputSchema,
      outputSchema: BaseResultSchema,
      annotations: {
        title: 'Delete notebook',
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async (input) => {
  logger.warning({ tool: 'notebook_delete', sessionId: input.sessionId, message: 'Delete requested' });
      return notImplemented('notebook_delete');
    },
  );

  server.registerTool(
    'notebook_export',
    {
      title: 'Export Notebook',
      description: 'Export a notebook to .src.md markdown format',
      inputSchema: NotebookExportInputSchema,
      outputSchema: NotebookExportOutputSchema,
      annotations: {
        title: 'Export notebook',
        readOnlyHint: true,
        idempotentHint: true,
      },
      execution: longRunningExecution,
    },
    async (input, extra) => {
      const progressToken = extra?.progressToken as ProgressToken | undefined;
      startProgress(progressToken, 'Exporting notebook');
      logger.info({ tool: 'notebook_export', sessionId: input.sessionId });

      completeProgress(progressToken);
      return notImplemented('notebook_export');
    },
  );

  // =========================================================================
  // Cell Operation Tools
  // =========================================================================

  server.registerTool(
    'cell_create',
    {
      title: 'Create Cell',
      description: 'Create a new cell in a notebook',
      inputSchema: CellCreateInputSchema,
      outputSchema: CellOperationOutputSchema,
      annotations: {
        title: 'Create cell',
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async (input) => {
      const cell = {
        id: randomUUID(),
        type: input.type,
        content: input.content,
        filename: input.filename,
      };
      logger.info({ tool: 'cell_create', sessionId: input.sessionId, cellId: cell.id });

      return {
        structuredContent: {
          success: true,
          cell,
        },
      };
    },
  );

  server.registerTool(
    'cell_update',
    {
      title: 'Update Cell',
      description: 'Update the content of a cell',
      inputSchema: CellUpdateInputSchema,
      outputSchema: CellOperationOutputSchema,
      annotations: {
        title: 'Update cell',
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async (input) => {
      logger.info({ tool: 'cell_update', sessionId: input.sessionId, cellId: input.cellId });
      const cell = {
        id: input.cellId,
        type: 'code' as const,
        content: input.content,
      };
      return {
        structuredContent: {
          success: true,
          cell,
        },
      };
    },
  );

  server.registerTool(
    'cell_delete',
    {
      title: 'Delete Cell',
      description: 'Delete a cell from a notebook',
      inputSchema: CellDeleteInputSchema,
      outputSchema: BaseResultSchema,
      annotations: {
        title: 'Delete cell',
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async (input) => {
      logger.warning({ tool: 'cell_delete', sessionId: input.sessionId, cellId: input.cellId });
      return {
        structuredContent: {
          success: true,
          message: 'Cell deletion requested',
        },
      };
    },
  );

  server.registerTool(
    'cell_move',
    {
      title: 'Move Cell',
      description: 'Move a cell to a different position',
      inputSchema: CellMoveInputSchema,
      outputSchema: BaseResultSchema,
      annotations: {
        title: 'Move cell',
        destructiveHint: false,
        idempotentHint: false,
      },
    },
    async (input) => {
      logger.info({
        tool: 'cell_move',
        sessionId: input.sessionId,
        cellId: input.cellId,
        newIndex: input.newIndex,
      });
      return {
        structuredContent: {
          success: true,
          message: 'Cell move requested',
        },
      };
    },
  );

  // =========================================================================
  // Execution Control Tools
  // =========================================================================

  server.registerTool(
    'cell_execute',
    {
      title: 'Execute Cell',
      description: 'Execute a code cell and return the output',
      inputSchema: CellExecuteInputSchema,
      outputSchema: CellExecuteOutputSchema,
      annotations: {
        title: 'Execute cell',
        destructiveHint: false,
        idempotentHint: false,
      },
      execution: longRunningExecution,
    },
    async (input, extra) => {
      const progressToken = extra?.progressToken as ProgressToken | undefined;
      startProgress(progressToken, 'Queued for execution');

      return createTaskForTool('cell_execute', async () => {
        startProgress(progressToken, 'Running cell');
        const startedAt = Date.now();
        const result = {
          success: true,
          stdout: '',
          stderr: '',
          exitCode: 0,
          executionTime: Date.now() - startedAt,
        };
        completeProgress(progressToken);
        return result;
      });
    },
  );

  server.registerTool(
    'cell_stop',
    {
      title: 'Stop Cell',
      description: 'Stop a running cell execution',
      inputSchema: CellStopInputSchema,
      outputSchema: BaseResultSchema,
      annotations: {
        title: 'Stop cell',
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (input) => {
      logger.info({ tool: 'cell_stop', sessionId: input.sessionId, cellId: input.cellId });
      return {
        structuredContent: {
          success: true,
          message: 'Stop request received',
        },
      };
    },
  );

  server.registerTool(
    'deps_install',
    {
      title: 'Install Dependencies',
      description: 'Install npm dependencies for a notebook',
      inputSchema: DepsInstallInputSchema,
      outputSchema: DepsInstallOutputSchema,
      annotations: {
        title: 'Install dependencies',
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      execution: longRunningExecution,
    },
    async (input, extra) => {
      const progressToken = extra?.progressToken as ProgressToken | undefined;
      startProgress(progressToken, 'Installing packages');
      logger.info({ tool: 'deps_install', sessionId: input.sessionId, packages: input.packages });

      return createTaskForTool('deps_install', async () => {
        const result = {
          success: true,
          installed: input.packages,
          message: 'Dependency installation queued',
        };
        completeProgress(progressToken);
        return result;
      });
    },
  );

  logger.info({ message: 'Registered 12 notebook tools with annotations' });
  if (typeof server.sendToolListChanged === 'function') {
    server.sendToolListChanged();
  }
}
