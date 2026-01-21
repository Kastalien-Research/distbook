import { z } from 'zod';
import {
  MCPServerConfigSchema,
  MCPConnectionStatusSchema,
  MCPApprovalResponseSchema,
  MCPRegisteredToolSchema,
  MCPRegisteredResourceSchema,
  MCPRegisteredPromptSchema,
} from '../types/mcp.mjs';

/**
 * MCP WebSocket Message Schemas
 *
 * These define the payloads for WebSocket messages between:
 * - Browser (React app) ↔ Srcbook Server
 *
 * Messages use the existing [topic, event, payload] format with "mcp:" prefixed topics.
 *
 * Topics:
 * - mcp:server     - Srcbook as MCP provider events
 * - mcp:client     - Srcbook consuming external MCP servers
 * - mcp:registry   - Capability registry updates
 */

// =============================================================================
// Server Mode: Client → Server (Browser → Srcbook Backend)
// =============================================================================

/** Request approval for a pending MCP operation */
export const MCPApprovalRespondPayloadSchema = MCPApprovalResponseSchema;
export type MCPApprovalRespondPayload = z.infer<typeof MCPApprovalRespondPayloadSchema>;

// =============================================================================
// Server Mode: Server → Client (Srcbook Backend → Browser)
// =============================================================================

/** External MCP client connected to Srcbook */
export const MCPServerClientConnectedPayloadSchema = z.object({
  clientId: z.string(),
  clientName: z.string(),
  connectedAt: z.string().datetime(),
});
export type MCPServerClientConnectedPayload = z.infer<typeof MCPServerClientConnectedPayloadSchema>;

/** External MCP client disconnected from Srcbook */
export const MCPServerClientDisconnectedPayloadSchema = z.object({
  clientId: z.string(),
  reason: z.string().optional(),
});
export type MCPServerClientDisconnectedPayload = z.infer<typeof MCPServerClientDisconnectedPayloadSchema>;

/** Tool invocation started (for UI feedback) */
export const MCPServerToolInvokedPayloadSchema = z.object({
  clientId: z.string(),
  clientName: z.string(),
  tool: z.string(),
  input: z.unknown(),
  requestId: z.string(),
});
export type MCPServerToolInvokedPayload = z.infer<typeof MCPServerToolInvokedPayloadSchema>;

/** Tool invocation completed */
export const MCPServerToolCompletedPayloadSchema = z.object({
  clientId: z.string(),
  tool: z.string(),
  requestId: z.string(),
  result: z.unknown().optional(),
  error: z.string().optional(),
  durationMs: z.number(),
});
export type MCPServerToolCompletedPayload = z.infer<typeof MCPServerToolCompletedPayloadSchema>;

/** Human approval required for an operation */
export const MCPApprovalRequestPayloadSchema = z.object({
  id: z.string().uuid(),
  operation: z.string(),
  toolName: z.string().optional(),
  resourceUri: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  details: z.record(z.string(), z.unknown()),
  timeout: z.number(),
});
export type MCPApprovalRequestPayload = z.infer<typeof MCPApprovalRequestPayloadSchema>;

// =============================================================================
// Client Mode: Client → Server (Browser → Srcbook Backend)
// =============================================================================

/** Request to connect to an external MCP server */
export const MCPClientConnectPayloadSchema = z.object({
  serverId: z.string().uuid(),
});
export type MCPClientConnectPayload = z.infer<typeof MCPClientConnectPayloadSchema>;

/** Request to disconnect from an external MCP server */
export const MCPClientDisconnectPayloadSchema = z.object({
  serverId: z.string().uuid(),
});
export type MCPClientDisconnectPayload = z.infer<typeof MCPClientDisconnectPayloadSchema>;

/** Invoke a tool on an external MCP server */
export const MCPToolInvokePayloadSchema = z.object({
  requestId: z.string().uuid(),
  serverId: z.string().uuid(),
  tool: z.string(),
  arguments: z.unknown(),
});
export type MCPToolInvokePayload = z.infer<typeof MCPToolInvokePayloadSchema>;

/** Read a resource from an external MCP server */
export const MCPResourceReadPayloadSchema = z.object({
  requestId: z.string().uuid(),
  serverId: z.string().uuid(),
  uri: z.string(),
});
export type MCPResourceReadPayload = z.infer<typeof MCPResourceReadPayloadSchema>;

/** Subscribe to resource updates */
export const MCPResourceSubscribePayloadSchema = z.object({
  serverId: z.string().uuid(),
  uri: z.string(),
});
export type MCPResourceSubscribePayload = z.infer<typeof MCPResourceSubscribePayloadSchema>;

/** Unsubscribe from resource updates */
export const MCPResourceUnsubscribePayloadSchema = z.object({
  subscriptionId: z.string().uuid(),
});
export type MCPResourceUnsubscribePayload = z.infer<typeof MCPResourceUnsubscribePayloadSchema>;

// =============================================================================
// Client Mode: Server → Client (Srcbook Backend → Browser)
// =============================================================================

/** Connection status update for an external MCP server */
export const MCPClientStatusPayloadSchema = z.object({
  serverId: z.string().uuid(),
  serverName: z.string(),
  status: MCPConnectionStatusSchema,
  error: z.string().optional(),
  capabilities: z.object({
    tools: z.boolean(),
    resources: z.boolean(),
    prompts: z.boolean(),
    sampling: z.boolean(),
  }).optional(),
});
export type MCPClientStatusPayload = z.infer<typeof MCPClientStatusPayloadSchema>;

/** Tool invocation result */
export const MCPToolResultPayloadSchema = z.object({
  requestId: z.string().uuid(),
  result: z.unknown(),
  structuredContent: z.unknown().optional(),
});
export type MCPToolResultPayload = z.infer<typeof MCPToolResultPayloadSchema>;

/** Tool invocation error */
export const MCPToolErrorPayloadSchema = z.object({
  requestId: z.string().uuid(),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
  }),
});
export type MCPToolErrorPayload = z.infer<typeof MCPToolErrorPayloadSchema>;

/** Resource content response */
export const MCPResourceContentPayloadSchema = z.object({
  requestId: z.string().uuid(),
  uri: z.string(),
  content: z.unknown(),
  mimeType: z.string().optional(),
});
export type MCPResourceContentPayload = z.infer<typeof MCPResourceContentPayloadSchema>;

/** Resource subscription confirmed */
export const MCPResourceSubscribedPayloadSchema = z.object({
  serverId: z.string().uuid(),
  uri: z.string(),
  subscriptionId: z.string().uuid(),
});
export type MCPResourceSubscribedPayload = z.infer<typeof MCPResourceSubscribedPayloadSchema>;

/** Resource update notification */
export const MCPResourceUpdatedPayloadSchema = z.object({
  subscriptionId: z.string().uuid(),
  uri: z.string(),
  content: z.unknown(),
  mimeType: z.string().optional(),
});
export type MCPResourceUpdatedPayload = z.infer<typeof MCPResourceUpdatedPayloadSchema>;

// =============================================================================
// Registry Events
// =============================================================================

/** Server list request */
export const MCPServersListPayloadSchema = z.object({});
export type MCPServersListPayload = z.infer<typeof MCPServersListPayloadSchema>;

/** Server list response / update */
export const MCPServersChangedPayloadSchema = z.object({
  servers: z.array(MCPServerConfigSchema.extend({
    status: MCPConnectionStatusSchema,
  })),
});
export type MCPServersChangedPayload = z.infer<typeof MCPServersChangedPayloadSchema>;

/** Tools list request */
export const MCPToolsListPayloadSchema = z.object({});
export type MCPToolsListPayload = z.infer<typeof MCPToolsListPayloadSchema>;

/** Tools registry update */
export const MCPToolsChangedPayloadSchema = z.object({
  tools: z.array(MCPRegisteredToolSchema),
});
export type MCPToolsChangedPayload = z.infer<typeof MCPToolsChangedPayloadSchema>;

/** Resources list request */
export const MCPResourcesListPayloadSchema = z.object({});
export type MCPResourcesListPayload = z.infer<typeof MCPResourcesListPayloadSchema>;

/** Resources registry update */
export const MCPResourcesChangedPayloadSchema = z.object({
  resources: z.array(MCPRegisteredResourceSchema),
});
export type MCPResourcesChangedPayload = z.infer<typeof MCPResourcesChangedPayloadSchema>;

/** Prompts list request */
export const MCPPromptsListPayloadSchema = z.object({});
export type MCPPromptsListPayload = z.infer<typeof MCPPromptsListPayloadSchema>;

/** Prompts registry update */
export const MCPPromptsChangedPayloadSchema = z.object({
  prompts: z.array(MCPRegisteredPromptSchema),
});
export type MCPPromptsChangedPayload = z.infer<typeof MCPPromptsChangedPayloadSchema>;

// =============================================================================
// Event Name Constants
// =============================================================================

export const MCP_EVENTS = {
  // Server mode (Srcbook as provider)
  SERVER: {
    CLIENT_CONNECTED: 'client:connected',
    CLIENT_DISCONNECTED: 'client:disconnected',
    TOOL_INVOKED: 'tool:invoked',
    TOOL_COMPLETED: 'tool:completed',
    APPROVAL_REQUEST: 'approval:request',
    APPROVAL_RESPOND: 'approval:respond',
  },

  // Client mode (Srcbook consuming external)
  CLIENT: {
    CONNECT: 'server:connect',
    DISCONNECT: 'server:disconnect',
    STATUS: 'server:status',
    TOOL_INVOKE: 'tool:invoke',
    TOOL_RESULT: 'tool:result',
    TOOL_ERROR: 'tool:error',
    RESOURCE_READ: 'resource:read',
    RESOURCE_CONTENT: 'resource:content',
    RESOURCE_SUBSCRIBE: 'resource:subscribe',
    RESOURCE_SUBSCRIBED: 'resource:subscribed',
    RESOURCE_UNSUBSCRIBE: 'resource:unsubscribe',
    RESOURCE_UPDATED: 'resource:updated',
  },

  // Registry events
  REGISTRY: {
    SERVERS_LIST: 'servers:list',
    SERVERS_CHANGED: 'servers:changed',
    TOOLS_LIST: 'tools:list',
    TOOLS_CHANGED: 'tools:changed',
    RESOURCES_LIST: 'resources:list',
    RESOURCES_CHANGED: 'resources:changed',
    PROMPTS_LIST: 'prompts:list',
    PROMPTS_CHANGED: 'prompts:changed',
  },
} as const;

export const MCP_TOPICS = {
  SERVER: 'mcp:server',
  CLIENT: 'mcp:client',
  REGISTRY: 'mcp:registry',
} as const;
