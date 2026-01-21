/**
 * MCP HTTP Routes
 *
 * Provides REST API endpoints for:
 * - Server mode: MCP protocol endpoint for external clients
 * - Client mode: Managing external MCP server configurations
 * - Security: Token management for client authentication
 */

import express, { type Router, type Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { MCPTransportSchema } from '@srcbook/shared';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { registerNotebookTools } from '../../mcp/server/tools.mjs';
import { registerNotebookResources } from '../../mcp/server/resources.mjs';
import { registerNotebookPrompts } from '../../mcp/server/prompts.mjs';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from '../../mcp/server/index.mjs';

const router: Router = express.Router();

// =============================================================================
// MCP Session Management
// =============================================================================

/**
 * Store active MCP transports by session ID
 * Each session gets its own transport and server instance
 */
const transports: Record<string, StreamableHTTPServerTransport> = {};

/**
 * Create a new MCP server instance with all capabilities registered
 */
function createMCPServer(): McpServer {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });

  registerNotebookTools(server);
  registerNotebookResources(server);
  registerNotebookPrompts(server);

  return server;
}

// =============================================================================
// Validation Schemas
// =============================================================================

const CreateMCPServerSchema = z.object({
  name: z.string().min(1, 'Server name is required'),
  transport: MCPTransportSchema,
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  url: z.string().url().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  enabled: z.boolean().optional().default(true),
  autoConnect: z.boolean().optional().default(false),
  timeout: z.number().positive().optional().default(30000),
});

const UpdateMCPServerSchema = CreateMCPServerSchema.partial();

const CreateMCPTokenSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  permissions: z.array(z.string()).optional().default([]),
  expiresInDays: z.number().positive().optional().default(30),
});

// =============================================================================
// Helper Functions
// =============================================================================

function error500(res: Response, e: Error) {
  console.error(e);
  return res.status(500).json({ error: 'An unexpected error occurred.' });
}

function error400(res: Response, message: string) {
  return res.status(400).json({ error: message });
}

function error404(res: Response, message: string = 'Not found') {
  return res.status(404).json({ error: message });
}

// =============================================================================
// MCP Protocol Endpoint (Server Mode)
// =============================================================================

/**
 * Main MCP protocol endpoint for Streamable HTTP transport
 * External MCP clients connect here when Srcbook acts as an MCP server
 */
router.options('/mcp', cors());
router.post('/mcp', cors(), async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // Reuse existing session
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New session initialization
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (id) => {
        transports[id] = transport;
        console.log('[MCP] Session initialized:', id);
      },
      onsessionclosed: (id) => {
        delete transports[id];
        console.log('[MCP] Session closed:', id);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };

    // Create server with all capabilities and connect to transport
    const server = createMCPServer();
    await server.connect(transport);
  } else {
    // Invalid request: no session ID and not an initialize request
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Invalid session' },
      id: req.body?.id || null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

/**
 * SSE endpoint for server-to-client notifications (Streamable HTTP transport)
 */
router.options('/mcp', cors());
router.get('/mcp', cors(), async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  const transport = transports[sessionId];

  if (transport) {
    await transport.handleRequest(req, res);
  } else {
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Invalid session' },
      id: null,
    });
  }
});

/**
 * Session close endpoint for MCP transport
 */
router.delete('/mcp', cors(), async (req, res) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  const transport = transports[sessionId];

  if (transport) {
    await transport.handleRequest(req, res);
  } else {
    res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Invalid session' },
      id: null,
    });
  }
});

// =============================================================================
// MCP Server Configuration (Client Mode)
// =============================================================================

/**
 * List all configured MCP servers
 */
router.options('/mcp/servers', cors());
router.get('/mcp/servers', cors(), async (_req, res) => {
  try {
    // TODO: Implement database query
    // const servers = await db.select().from(mcpServers);
    console.log('[MCP] List servers requested');

    return res.json({
      data: [],
      meta: { total: 0 },
    });
  } catch (e) {
    return error500(res, e as Error);
  }
});

/**
 * Add a new MCP server configuration
 */
router.post('/mcp/servers', cors(), async (req, res) => {
  const result = CreateMCPServerSchema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.issues.map((e) => e.message);
    return error400(res, errors.join(', '));
  }

  try {
    // TODO: Implement database insert
    // const server = await db.insert(mcpServers).values({...}).returning();
    console.log('[MCP] Create server:', result.data.name);

    const server = {
      id: crypto.randomUUID(),
      ...result.data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return res.status(201).json({ data: server });
  } catch (e) {
    return error500(res, e as Error);
  }
});

/**
 * Get a specific MCP server configuration
 */
router.options('/mcp/servers/:id', cors());
router.get('/mcp/servers/:id', cors(), async (req, res) => {
  const { id } = req.params;

  try {
    // TODO: Implement database query
    // const server = await db.select().from(mcpServers).where(eq(mcpServers.id, id)).limit(1);
    console.log('[MCP] Get server:', id);

    return error404(res, 'Server not found');
  } catch (e) {
    return error500(res, e as Error);
  }
});

/**
 * Update an MCP server configuration
 */
router.put('/mcp/servers/:id', cors(), async (req, res) => {
  const { id } = req.params;
  const result = UpdateMCPServerSchema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.issues.map((e) => e.message);
    return error400(res, errors.join(', '));
  }

  try {
    // TODO: Implement database update
    // const server = await db.update(mcpServers).set({...}).where(eq(mcpServers.id, id)).returning();
    console.log('[MCP] Update server:', id);

    return error404(res, 'Server not found');
  } catch (e) {
    return error500(res, e as Error);
  }
});

/**
 * Delete an MCP server configuration
 */
router.delete('/mcp/servers/:id', cors(), async (req, res) => {
  const { id } = req.params;

  try {
    // TODO: Implement database delete
    // await db.delete(mcpServers).where(eq(mcpServers.id, id));
    console.log('[MCP] Delete server:', id);

    return res.json({ deleted: true });
  } catch (e) {
    return error500(res, e as Error);
  }
});

// =============================================================================
// MCP Token Management (Server Mode Security)
// =============================================================================

/**
 * List all MCP tokens (excludes actual token values)
 */
router.options('/mcp/tokens', cors());
router.get('/mcp/tokens', cors(), async (_req, res) => {
  try {
    // TODO: Implement database query
    // const tokens = await db.select({...}).from(mcpTokens);
    console.log('[MCP] List tokens requested');

    return res.json({
      data: [],
      meta: { total: 0 },
    });
  } catch (e) {
    return error500(res, e as Error);
  }
});

/**
 * Create a new MCP token
 * Returns the plain token only once - must be saved by the user
 */
router.post('/mcp/tokens', cors(), async (req, res) => {
  const result = CreateMCPTokenSchema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.issues.map((e) => e.message);
    return error400(res, errors.join(', '));
  }

  try {
    // TODO: Implement token generation
    // 1. Generate secure random token
    // 2. Hash token for storage
    // 3. Store in database
    // 4. Return plain token (only time it's visible)
    console.log('[MCP] Create token for:', result.data.clientName);

    const token = {
      id: crypto.randomUUID(),
      clientName: result.data.clientName,
      permissions: result.data.permissions,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + result.data.expiresInDays * 24 * 60 * 60 * 1000),
      // This would be the actual token - only returned once
      token: 'srcbook_mcp_' + crypto.randomUUID().replace(/-/g, ''),
    };

    return res.status(201).json({
      data: token,
      warning: 'Save this token securely. It will not be shown again.',
    });
  } catch (e) {
    return error500(res, e as Error);
  }
});

/**
 * Revoke an MCP token
 */
router.options('/mcp/tokens/:id', cors());
router.delete('/mcp/tokens/:id', cors(), async (req, res) => {
  const { id } = req.params;

  try {
    // TODO: Implement token revocation
    // await db.update(mcpTokens).set({ revokedAt: new Date() }).where(eq(mcpTokens.id, id));
    console.log('[MCP] Revoke token:', id);

    return res.json({ revoked: true });
  } catch (e) {
    return error500(res, e as Error);
  }
});

// =============================================================================
// MCP Audit Log
// =============================================================================

/**
 * Get tool invocation history
 */
router.options('/mcp/invocations', cors());
router.get('/mcp/invocations', cors(), async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    // TODO: Implement database query
    // const invocations = await db.select().from(mcpToolInvocations).limit(limit).offset(offset);
    console.log('[MCP] List invocations:', { limit, offset });

    return res.json({
      data: [],
      meta: { total: 0, limit, offset },
    });
  } catch (e) {
    return error500(res, e as Error);
  }
});

export default router;
