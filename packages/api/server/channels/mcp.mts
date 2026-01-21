/**
 * MCP WebSocket Channel
 *
 * Handles MCP-related WebSocket events for:
 * - Server mode: Srcbook as MCP provider (notifications to UI about external clients)
 * - Client mode: Srcbook consuming external MCP servers (tool invocation, resources)
 * - Registry: Capability discovery and updates
 */

import {
  // Server mode
  MCPApprovalRespondPayloadSchema,
  type MCPApprovalRespondPayload,

  // Client mode
  MCPClientConnectPayloadSchema,
  MCPClientDisconnectPayloadSchema,
  MCPToolInvokePayloadSchema,
  MCPResourceReadPayloadSchema,
  MCPResourceSubscribePayloadSchema,
  MCPResourceUnsubscribePayloadSchema,
  type MCPClientConnectPayload,
  type MCPClientDisconnectPayload,
  type MCPToolInvokePayload,
  type MCPResourceReadPayload,
  type MCPResourceSubscribePayload,
  type MCPResourceUnsubscribePayload,

  // Registry
  MCPServersListPayloadSchema,
  MCPToolsListPayloadSchema,
  MCPResourcesListPayloadSchema,
  MCPPromptsListPayloadSchema,
  type MCPServersListPayload,
  type MCPToolsListPayload,
  type MCPResourcesListPayload,
  type MCPPromptsListPayload,

  // Constants
  MCP_EVENTS,
  MCP_TOPICS,
} from '@srcbook/shared';

import WebSocketServer, {
  type MessageContextType,
  type ConnectionContextType,
} from '../ws-client.mjs';

// =============================================================================
// Server Mode Handlers (Srcbook as MCP Provider)
// =============================================================================

/**
 * Handle user response to an approval request
 */
async function handleApprovalRespond(
  payload: MCPApprovalRespondPayload,
  _context: MessageContextType,
  conn: ConnectionContextType,
) {
  // TODO: Implement approval handling
  // 1. Find pending approval request by ID
  // 2. Resolve/reject the pending operation
  // 3. If remember='always', store in allowlist
  console.log('[MCP] Approval response:', payload);

  conn.reply(MCP_TOPICS.SERVER, 'approval:acknowledged', {
    id: payload.id,
    approved: payload.approved,
  });
}

// =============================================================================
// Client Mode Handlers (Srcbook consuming external MCP servers)
// =============================================================================

/**
 * Connect to an external MCP server
 */
async function handleClientConnect(
  payload: MCPClientConnectPayload,
  _context: MessageContextType,
  _conn: ConnectionContextType,
  wss: WebSocketServer,
) {
  // TODO: Implement connection to external MCP server
  // 1. Load server config from database
  // 2. Create MCP Client with appropriate transport
  // 3. Connect and register capabilities
  // 4. Broadcast status update
  console.log('[MCP] Connect to server:', payload.serverId);

  // Stub: Send connecting status
  wss.broadcast(MCP_TOPICS.CLIENT, MCP_EVENTS.CLIENT.STATUS, {
    serverId: payload.serverId,
    serverName: 'Unknown', // Will be loaded from DB
    status: 'connecting',
  });
}

/**
 * Disconnect from an external MCP server
 */
async function handleClientDisconnect(
  payload: MCPClientDisconnectPayload,
  _context: MessageContextType,
  _conn: ConnectionContextType,
  wss: WebSocketServer,
) {
  // TODO: Implement disconnection
  // 1. Find active connection
  // 2. Close gracefully
  // 3. Update registry
  // 4. Broadcast status
  console.log('[MCP] Disconnect from server:', payload.serverId);

  wss.broadcast(MCP_TOPICS.CLIENT, MCP_EVENTS.CLIENT.STATUS, {
    serverId: payload.serverId,
    serverName: 'Unknown',
    status: 'disconnected',
  });
}

/**
 * Invoke a tool on an external MCP server
 */
async function handleToolInvoke(
  payload: MCPToolInvokePayload,
  _context: MessageContextType,
  conn: ConnectionContextType,
) {
  // TODO: Implement tool invocation
  // 1. Find connection for serverId
  // 2. Call tool via MCP Client
  // 3. Return result or error
  console.log('[MCP] Tool invoke:', payload.tool, 'on', payload.serverId);

  // Stub: Return error for now
  conn.reply(MCP_TOPICS.CLIENT, MCP_EVENTS.CLIENT.TOOL_ERROR, {
    requestId: payload.requestId,
    error: {
      message: 'MCP client not yet implemented',
      code: 'NOT_IMPLEMENTED',
    },
  });
}

/**
 * Read a resource from an external MCP server
 */
async function handleResourceRead(
  payload: MCPResourceReadPayload,
  _context: MessageContextType,
  conn: ConnectionContextType,
) {
  // TODO: Implement resource read
  // 1. Find connection for serverId
  // 2. Read resource via MCP Client
  // 3. Return content
  console.log('[MCP] Resource read:', payload.uri, 'from', payload.serverId);

  conn.reply(MCP_TOPICS.CLIENT, MCP_EVENTS.CLIENT.RESOURCE_CONTENT, {
    requestId: payload.requestId,
    uri: payload.uri,
    content: null,
    mimeType: 'application/json',
  });
}

/**
 * Subscribe to resource updates
 */
async function handleResourceSubscribe(
  payload: MCPResourceSubscribePayload,
  _context: MessageContextType,
  conn: ConnectionContextType,
) {
  // TODO: Implement resource subscription
  // 1. Find connection for serverId
  // 2. Subscribe via MCP Client
  // 3. Store subscription in database
  // 4. Return subscription ID
  console.log('[MCP] Resource subscribe:', payload.uri, 'on', payload.serverId);

  const subscriptionId = crypto.randomUUID();

  conn.reply(MCP_TOPICS.CLIENT, 'resource:subscribed', {
    serverId: payload.serverId,
    uri: payload.uri,
    subscriptionId,
  });
}

/**
 * Unsubscribe from resource updates
 */
async function handleResourceUnsubscribe(
  payload: MCPResourceUnsubscribePayload,
  _context: MessageContextType,
  _conn: ConnectionContextType,
) {
  // TODO: Implement resource unsubscription
  // 1. Find subscription by ID
  // 2. Unsubscribe via MCP Client
  // 3. Remove from database
  console.log('[MCP] Resource unsubscribe:', payload.subscriptionId);
}

// =============================================================================
// Registry Handlers
// =============================================================================

/**
 * List configured MCP servers
 */
async function handleServersList(
  _payload: MCPServersListPayload,
  _context: MessageContextType,
  conn: ConnectionContextType,
) {
  // TODO: Load servers from database with status
  console.log('[MCP] Servers list requested');

  conn.reply(MCP_TOPICS.REGISTRY, MCP_EVENTS.REGISTRY.SERVERS_CHANGED, {
    servers: [],
  });
}

/**
 * List available tools from connected servers
 */
async function handleToolsList(
  _payload: MCPToolsListPayload,
  _context: MessageContextType,
  conn: ConnectionContextType,
) {
  // TODO: Return aggregated tools from capability registry
  console.log('[MCP] Tools list requested');

  conn.reply(MCP_TOPICS.REGISTRY, MCP_EVENTS.REGISTRY.TOOLS_CHANGED, {
    tools: [],
  });
}

/**
 * List available resources from connected servers
 */
async function handleResourcesList(
  _payload: MCPResourcesListPayload,
  _context: MessageContextType,
  conn: ConnectionContextType,
) {
  // TODO: Return aggregated resources from capability registry
  console.log('[MCP] Resources list requested');

  conn.reply(MCP_TOPICS.REGISTRY, MCP_EVENTS.REGISTRY.RESOURCES_CHANGED, {
    resources: [],
  });
}

/**
 * List available prompts from connected servers
 */
async function handlePromptsList(
  _payload: MCPPromptsListPayload,
  _context: MessageContextType,
  conn: ConnectionContextType,
) {
  // TODO: Return aggregated prompts from capability registry
  console.log('[MCP] Prompts list requested');

  conn.reply(MCP_TOPICS.REGISTRY, MCP_EVENTS.REGISTRY.PROMPTS_CHANGED, {
    prompts: [],
  });
}

// =============================================================================
// Channel Registration
// =============================================================================

export function register(wss: WebSocketServer) {
  // Server mode channel: notifications about external MCP clients
  wss
    .channel(MCP_TOPICS.SERVER)
    .on(MCP_EVENTS.SERVER.APPROVAL_RESPOND, MCPApprovalRespondPayloadSchema, handleApprovalRespond);

  // Client mode channel: controlling external MCP servers
  wss
    .channel(MCP_TOPICS.CLIENT)
    .on(MCP_EVENTS.CLIENT.CONNECT, MCPClientConnectPayloadSchema, (payload, context, conn) =>
      handleClientConnect(payload, context, conn, wss),
    )
    .on(MCP_EVENTS.CLIENT.DISCONNECT, MCPClientDisconnectPayloadSchema, (payload, context, conn) =>
      handleClientDisconnect(payload, context, conn, wss),
    )
    .on(MCP_EVENTS.CLIENT.TOOL_INVOKE, MCPToolInvokePayloadSchema, handleToolInvoke)
    .on(MCP_EVENTS.CLIENT.RESOURCE_READ, MCPResourceReadPayloadSchema, handleResourceRead)
    .on(MCP_EVENTS.CLIENT.RESOURCE_SUBSCRIBE, MCPResourceSubscribePayloadSchema, handleResourceSubscribe)
    .on(MCP_EVENTS.CLIENT.RESOURCE_UNSUBSCRIBE, MCPResourceUnsubscribePayloadSchema, handleResourceUnsubscribe);

  // Registry channel: capability discovery
  wss
    .channel(MCP_TOPICS.REGISTRY)
    .on(MCP_EVENTS.REGISTRY.SERVERS_LIST, MCPServersListPayloadSchema, handleServersList)
    .on(MCP_EVENTS.REGISTRY.TOOLS_LIST, MCPToolsListPayloadSchema, handleToolsList)
    .on(MCP_EVENTS.REGISTRY.RESOURCES_LIST, MCPResourcesListPayloadSchema, handleResourcesList)
    .on(MCP_EVENTS.REGISTRY.PROMPTS_LIST, MCPPromptsListPayloadSchema, handlePromptsList);

  console.log('[MCP] WebSocket channels registered');
}
