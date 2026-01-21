import { z } from 'zod';
import type {
  Tool,
  Resource,
  Prompt,
  PromptMessage,
  CallToolResult,
  ResourceContents,
  GetPromptResult,
  SamplingMessage,
  CreateMessageRequest,
  CreateMessageResult,
  Root,
  LoggingLevel,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * MCP Types for Srcbook Integration
 *
 * These types support both:
 * - Server mode: Srcbook as MCP provider (exposing notebook operations)
 * - Client mode: Srcbook consuming external MCP servers
 *
 * Based on @modelcontextprotocol/sdk 1.25.2 (MCP Specification 2025-11-25)
 * 
 * Architecture: Srcbook as "MCP Peer"
 * - Implements full MCP Server specification
 * - Implements full MCP Client specification
 * - Extends SDK types for registry/tracking purposes
 */

// =============================================================================
// MCP Server Configuration (for client mode - connecting to external servers)
// =============================================================================

export const MCPTransportSchema = z.enum(['stdio', 'http']);
export type MCPTransport = z.infer<typeof MCPTransportSchema>;

export const MCPServerConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  transport: MCPTransportSchema,

  // stdio transport options
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),

  // http transport options
  url: z.string().url().optional(),
  headers: z.record(z.string(), z.string()).optional(),

  // Settings
  autoConnect: z.boolean().default(false),
  enabled: z.boolean().default(true),
  timeout: z.number().positive().default(30000),

  // Metadata
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  lastConnectedAt: z.string().datetime().optional(),
});

export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;

// =============================================================================
// MCP Token Configuration (for server mode - authenticating incoming clients)
// =============================================================================

export const MCPTokenPermissionSchema = z.enum([
  'notebooks:read',
  'notebooks:write',
  'notebooks:execute',
  'notebooks:delete',
  'resources:read',
  'resources:subscribe',
  'prompts:read',
  'admin',
]);

export type MCPTokenPermission = z.infer<typeof MCPTokenPermissionSchema>;

export const MCPTokenSchema = z.object({
  id: z.string().uuid(),
  tokenHash: z.string(), // SHA-256 hash, never store raw token
  clientName: z.string().min(1),
  permissions: z.array(MCPTokenPermissionSchema).default([]),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().optional(),
  revokedAt: z.string().datetime().optional(),
});

export type MCPToken = z.infer<typeof MCPTokenSchema>;

// =============================================================================
// Connection Status
// =============================================================================

export const MCPConnectionStatusSchema = z.enum([
  'disconnected',
  'connecting',
  'connected',
  'error',
]);

export type MCPConnectionStatus = z.infer<typeof MCPConnectionStatusSchema>;

export const MCPConnectionInfoSchema = z.object({
  serverId: z.string(),
  serverName: z.string(),
  status: MCPConnectionStatusSchema,
  error: z.string().optional(),
  capabilities: z.object({
    tools: z.boolean().default(false),
    resources: z.boolean().default(false),
    prompts: z.boolean().default(false),
    sampling: z.boolean().default(false),
  }).optional(),
  connectedAt: z.string().datetime().optional(),
});

export type MCPConnectionInfo = z.infer<typeof MCPConnectionInfoSchema>;

// =============================================================================
// Tool Invocation Audit
// =============================================================================

export const MCPToolInvocationSchema = z.object({
  id: z.number().optional(),
  sessionId: z.string().optional(), // Srcbook session if applicable
  serverId: z.string().optional(),  // null for Srcbook's own tools
  clientId: z.string().optional(),  // For server mode: which client invoked
  toolName: z.string(),
  input: z.unknown(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  durationMs: z.number().optional(),
  createdAt: z.string().datetime(),
});

export type MCPToolInvocation = z.infer<typeof MCPToolInvocationSchema>;

// =============================================================================
// Resource Subscription
// =============================================================================

export const MCPResourceSubscriptionSchema = z.object({
  id: z.number().optional(),
  subscriptionId: z.string().uuid(),
  sessionId: z.string(),
  serverId: z.string(),
  resourceUri: z.string(),
  active: z.boolean().default(true),
  createdAt: z.string().datetime(),
});

export type MCPResourceSubscription = z.infer<typeof MCPResourceSubscriptionSchema>;

// =============================================================================
// Registry Types - Extend SDK types with tracking metadata
// =============================================================================

/**
 * Registered Tool - SDK Tool type extended with server tracking
 * Used in client mode to track which server provides each tool
 */
export type MCPRegisteredTool = Tool & {
  serverId: string;
  serverName: string;
};

/**
 * Registered Resource - SDK Resource type extended with server tracking
 * Used in client mode to track which server provides each resource
 */
export type MCPRegisteredResource = Resource & {
  serverId: string;
  serverName: string;
};

/**
 * Registered Prompt - SDK Prompt type extended with server tracking
 * Used in client mode to track which server provides each prompt
 */
export type MCPRegisteredPrompt = Prompt & {
  serverId: string;
  serverName: string;
};

// Zod schemas for validation (extend SDK types)
export const MCPRegisteredToolSchema = z.object({
  // SDK Tool fields
  name: z.string(),
  description: z.string().optional(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.string(), z.unknown()).optional(),
    required: z.array(z.string()).optional(),
  }).passthrough(),
  outputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.string(), z.unknown()).optional(),
    required: z.array(z.string()).optional(),
  }).passthrough().optional(),
  annotations: z.object({
    title: z.string().optional(),
    readOnlyHint: z.boolean().optional(),
    destructiveHint: z.boolean().optional(),
    idempotentHint: z.boolean().optional(),
    openWorldHint: z.boolean().optional(),
  }).optional(),
  // Registry metadata
  serverId: z.string(),
  serverName: z.string(),
});

export const MCPRegisteredResourceSchema = z.object({
  // SDK Resource fields
  uri: z.string(),
  name: z.string(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  // Registry metadata
  serverId: z.string(),
  serverName: z.string(),
});

export const MCPRegisteredPromptSchema = z.object({
  // SDK Prompt fields
  name: z.string(),
  description: z.string().optional(),
  arguments: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    required: z.boolean().optional(),
  })).optional(),
  // Registry metadata
  serverId: z.string(),
  serverName: z.string(),
});

// Re-export SDK types for convenience
export type {
  Tool,
  Resource,
  Prompt,
  PromptMessage,
  CallToolResult,
  ResourceContents,
  GetPromptResult,
  SamplingMessage,
  CreateMessageRequest,
  CreateMessageResult,
  Root,
  LoggingLevel,
};

// Server provider mode (for server mode status)
export interface MCPServerProviderMode {
  status: 'stopped' | 'starting' | 'running' | 'error';
  error?: string;
}

export const MCPCapabilityRegistrySchema = z.object({
  tools: z.array(MCPRegisteredToolSchema),
  resources: z.array(MCPRegisteredResourceSchema),
  prompts: z.array(MCPRegisteredPromptSchema),
  lastUpdated: z.string().datetime(),
});

export type MCPCapabilityRegistry = z.infer<typeof MCPCapabilityRegistrySchema>;

// =============================================================================
// Sampling Types (for AI completion requests through MCP)
// =============================================================================

export const MCPSamplingMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.union([
    z.object({ type: z.literal('text'), text: z.string() }),
    z.object({ type: z.literal('image'), data: z.string(), mimeType: z.string() }),
  ]),
});

export type MCPSamplingMessage = z.infer<typeof MCPSamplingMessageSchema>;

export const MCPSamplingRequestSchema = z.object({
  messages: z.array(MCPSamplingMessageSchema),
  modelPreferences: z.object({
    intelligencePriority: z.number().min(0).max(1).optional(),
    speedPriority: z.number().min(0).max(1).optional(),
    costPriority: z.number().min(0).max(1).optional(),
  }).optional(),
  systemPrompt: z.string().optional(),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  stopSequences: z.array(z.string()).optional(),
  includeContext: z.enum(['none', 'thisServer', 'allServers']).optional(),
});

export type MCPSamplingRequest = z.infer<typeof MCPSamplingRequestSchema>;

export const MCPSamplingResponseSchema = z.object({
  role: z.literal('assistant'),
  content: z.object({ type: z.literal('text'), text: z.string() }),
  model: z.string(),
  stopReason: z.enum(['endTurn', 'maxTokens', 'stopSequence']),
});

export type MCPSamplingResponse = z.infer<typeof MCPSamplingResponseSchema>;

// =============================================================================
// Human-in-the-Loop Approval
// =============================================================================

export const MCPApprovalRequestSchema = z.object({
  id: z.string().uuid(),
  operation: z.string(),
  toolName: z.string().optional(),
  resourceUri: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  details: z.record(z.string(), z.unknown()),
  timeout: z.number().positive().default(30000),
  createdAt: z.string().datetime(),
});

export type MCPApprovalRequest = z.infer<typeof MCPApprovalRequestSchema>;

export const MCPApprovalResponseSchema = z.object({
  id: z.string().uuid(),
  approved: z.boolean(),
  remember: z.enum(['session', 'always', 'never']).optional(),
  respondedAt: z.string().datetime(),
});

export type MCPApprovalResponse = z.infer<typeof MCPApprovalResponseSchema>;

// =============================================================================
// Notebook MCP Context (exposed to notebook code cells)
// =============================================================================

export interface NotebookMCPContext {
  /**
   * Available tools from connected MCP servers, namespaced by server
   * Usage: mcpTools.serverName.toolName(args)
   */
  tools: {
    [serverName: string]: {
      [toolName: string]: (args: unknown) => Promise<unknown>;
    };
  };

  /**
   * Resource access from connected MCP servers
   */
  resources: {
    read: (uri: string) => Promise<unknown>;
    subscribe: (uri: string, callback: (data: unknown) => void) => () => void;
    list: () => Promise<MCPRegisteredResource[]>;
  };

  /**
   * Sampling capability (when available from a connected server)
   */
  sampling?: {
    available: () => boolean;
    createMessage: (request: MCPSamplingRequest) => Promise<MCPSamplingResponse>;
  };

  /**
   * List available servers and their status
   */
  servers: {
    list: () => Promise<MCPConnectionInfo[]>;
  };
}
