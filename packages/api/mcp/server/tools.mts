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

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

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
// Tool Registration
// =============================================================================

/**
 * Register all notebook tools with the MCP server
 */
export function registerNotebookTools(server: McpServer): void {
  // =========================================================================
  // Notebook Management Tools
  // =========================================================================

  // notebook_create
  server.tool(
    'notebook_create',
    'Create a new TypeScript or JavaScript notebook',
    NotebookCreateInputSchema.shape,
    async (input) => {
      // TODO: Implement notebook creation
      // 1. Call createSrcbook(input.title, input.language)
      // 2. Create session for the new notebook
      // 3. Return sessionId and metadata

      console.log('[MCP Tool] notebook_create:', input);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: 'Notebook creation not yet implemented',
            }),
          },
        ],
      };
    },
  );

  // notebook_list
  server.tool(
    'notebook_list',
    'List all available Srcbook notebooks',
    NotebookListInputSchema.shape,
    async (input) => {
      // TODO: Implement notebook listing
      // 1. Read SRCBOOKS_DIR
      // 2. Parse each .src.md file for metadata
      // 3. Apply pagination
      // 4. Return array of notebooks

      console.log('[MCP Tool] notebook_list:', input);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              notebooks: [],
              total: 0,
              limit: input.limit,
              offset: input.offset,
            }),
          },
        ],
      };
    },
  );

  // notebook_open
  server.tool(
    'notebook_open',
    'Open an existing Srcbook notebook',
    NotebookOpenInputSchema.shape,
    async (input: any) => {
      // TODO: Implement notebook opening
      // 1. If path provided, create session from path
      // 2. If sessionId provided, find existing session
      // 3. Return session details

      console.log('[MCP Tool] notebook_open:', input);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: 'Notebook open not yet implemented',
            }),
          },
        ],
      };
    },
  );

  // notebook_delete
  server.tool(
    'notebook_delete',
    'Delete a Srcbook notebook',
    NotebookDeleteInputSchema.shape,
    async (input) => {
      // TODO: Implement notebook deletion
      // 1. Find session by ID
      // 2. Delete srcbook files
      // 3. Clean up session
      // 4. Return success

      console.log('[MCP Tool] notebook_delete:', input);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: 'Notebook deletion not yet implemented',
            }),
          },
        ],
      };
    },
  );

  // notebook_export
  server.tool(
    'notebook_export',
    'Export a notebook to .src.md markdown format',
    NotebookExportInputSchema.shape,
    async (input) => {
      // TODO: Implement notebook export
      // 1. Find session by ID
      // 2. Generate .src.md content
      // 3. Return markdown text

      console.log('[MCP Tool] notebook_export:', input);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: 'Notebook export not yet implemented',
            }),
          },
        ],
      };
    },
  );

  // =========================================================================
  // Cell Operation Tools
  // =========================================================================

  // cell_create
  server.tool(
    'cell_create',
    'Create a new cell in a notebook',
    CellCreateInputSchema.shape,
    async (input) => {
      // TODO: Implement cell creation
      // 1. Find session by ID
      // 2. Generate cell ID and filename if needed
      // 3. Insert cell at specified index
      // 4. Persist changes
      // 5. Notify WebSocket clients

      console.log('[MCP Tool] cell_create:', input);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: 'Cell creation not yet implemented',
            }),
          },
        ],
      };
    },
  );

  // cell_update
  server.tool(
    'cell_update',
    'Update the content of a cell',
    CellUpdateInputSchema.shape,
    async (input) => {
      // TODO: Implement cell update
      // 1. Find session by ID
      // 2. Find cell by ID
      // 3. Update content
      // 4. Persist changes
      // 5. Notify WebSocket clients

      console.log('[MCP Tool] cell_update:', input);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: 'Cell update not yet implemented',
            }),
          },
        ],
      };
    },
  );

  // cell_delete
  server.tool(
    'cell_delete',
    'Delete a cell from a notebook',
    CellDeleteInputSchema.shape,
    async (input) => {
      // TODO: Implement cell deletion
      // 1. Find session by ID
      // 2. Find cell by ID
      // 3. Remove cell
      // 4. Persist changes
      // 5. Notify WebSocket clients

      console.log('[MCP Tool] cell_delete:', input);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: 'Cell deletion not yet implemented',
            }),
          },
        ],
      };
    },
  );

  // cell_move
  server.tool(
    'cell_move',
    'Move a cell to a different position',
    CellMoveInputSchema.shape,
    async (input) => {
      // TODO: Implement cell move
      // 1. Find session by ID
      // 2. Find cell by ID
      // 3. Remove from current position
      // 4. Insert at new index
      // 5. Persist changes
      // 6. Notify WebSocket clients

      console.log('[MCP Tool] cell_move:', input);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: 'Cell move not yet implemented',
            }),
          },
        ],
      };
    },
  );

  // =========================================================================
  // Execution Control Tools
  // =========================================================================

  // cell_execute
  server.tool(
    'cell_execute',
    'Execute a code cell and return the output',
    CellExecuteInputSchema.shape,
    async (input) => {
      // TODO: Implement cell execution
      // 1. Find session by ID
      // 2. Find cell by ID
      // 3. Validate it's a code cell
      // 4. Execute via existing run cell mechanism
      // 5. Wait for completion
      // 6. Return stdout, stderr, exitCode

      console.log('[MCP Tool] cell_execute:', input);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: 'Cell execution not yet implemented',
            }),
          },
        ],
      };
    },
  );

  // cell_stop
  server.tool(
    'cell_stop',
    'Stop a running cell execution',
    CellStopInputSchema.shape,
    async (input) => {
      // TODO: Implement cell stop
      // 1. Find session by ID
      // 2. Find cell by ID
      // 3. Check if running
      // 4. Stop execution
      // 5. Return status

      console.log('[MCP Tool] cell_stop:', input);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: 'Cell stop not yet implemented',
            }),
          },
        ],
      };
    },
  );

  // deps_install
  server.tool(
    'deps_install',
    'Install npm dependencies for a notebook',
    DepsInstallInputSchema.shape,
    async (input) => {
      // TODO: Implement dependency installation
      // 1. Find session by ID
      // 2. Add packages to package.json
      // 3. Run npm install
      // 4. Return success/failure

      console.log('[MCP Tool] deps_install:', input);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              error: 'Dependency installation not yet implemented',
            }),
          },
        ],
      };
    },
  );

  console.log('[MCP Server] Registered 12 notebook tools');
}
