/**
 * MCP Client Tool Invocation
 *
 * Handles invoking tools on external MCP servers with:
 * - Request/response handling
 * - Approval workflow for sensitive tools
 * - Timeout management
 * - Audit logging
 */

import { getConnection } from './index.mjs';
// Note: MCPToolInvocation type available from @srcbook/shared for audit logging (TODO)

// =============================================================================
// Types
// =============================================================================

export interface ToolInvocationRequest {
  serverId: string;
  toolName: string;
  input: Record<string, unknown>;
  sessionId?: string;
  timeout?: number;
}

export interface ToolInvocationResult {
  success: boolean;
  output?: unknown;
  error?: string;
  durationMs: number;
}

// =============================================================================
// Pending Approvals
// =============================================================================

interface PendingApproval {
  id: string;
  request: ToolInvocationRequest;
  resolve: (approved: boolean) => void;
  createdAt: Date;
  expiresAt: Date;
}

const pendingApprovals = new Map<string, PendingApproval>();

/**
 * Get pending approval by ID
 */
export function getPendingApproval(id: string): PendingApproval | undefined {
  return pendingApprovals.get(id);
}

/**
 * Resolve a pending approval
 */
export function resolveApproval(id: string, approved: boolean): boolean {
  const pending = pendingApprovals.get(id);
  if (!pending) {
    return false;
  }

  pending.resolve(approved);
  pendingApprovals.delete(id);
  return true;
}

// =============================================================================
// Tool Invocation
// =============================================================================

/**
 * Invoke a tool on an external MCP server (no approval required)
 */
export async function invokeTool(request: ToolInvocationRequest): Promise<ToolInvocationResult> {
  const startTime = Date.now();
  const connection = getConnection(request.serverId);

  if (!connection) {
    return {
      success: false,
      error: `No connection found for server: ${request.serverId}`,
      durationMs: Date.now() - startTime,
    };
  }

  if (connection.status !== 'connected') {
    return {
      success: false,
      error: `Server not connected: ${connection.status}`,
      durationMs: Date.now() - startTime,
    };
  }

  try {
    // TODO: Implement actual tool invocation
    // 1. Call connection.client.callTool(...)
    // 2. Handle timeout
    // 3. Parse response
    // 4. Log to audit table

    console.log('[MCP Client] Invoking tool:', request.toolName, 'on', request.serverId);

    return {
      success: false,
      error: 'Tool invocation not yet implemented',
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Invoke a tool with approval workflow
 *
 * For sensitive tools, this sends an approval request to the UI
 * and waits for user confirmation before executing.
 */
export async function invokeToolWithApproval(
  request: ToolInvocationRequest,
  approvalTimeoutMs: number = 60000,
): Promise<ToolInvocationResult> {
  const startTime = Date.now();

  // Create approval request
  const approvalId = crypto.randomUUID();

  console.log('[MCP Client] Requesting approval for tool:', request.toolName);

  // Create promise that resolves when user approves/denies
  const approvalPromise = new Promise<boolean>((resolve) => {
    const pending: PendingApproval = {
      id: approvalId,
      request,
      resolve,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + approvalTimeoutMs),
    };
    pendingApprovals.set(approvalId, pending);

    // Auto-deny after timeout
    setTimeout(() => {
      if (pendingApprovals.has(approvalId)) {
        resolve(false);
        pendingApprovals.delete(approvalId);
      }
    }, approvalTimeoutMs);
  });

  // TODO: Emit WebSocket event for UI to show approval dialog
  // wss.broadcast(MCP_TOPICS.SERVER, MCP_EVENTS.SERVER.APPROVAL_REQUEST, {
  //   id: approvalId,
  //   serverId: request.serverId,
  //   toolName: request.toolName,
  //   input: request.input,
  // });

  const approved = await approvalPromise;

  if (!approved) {
    return {
      success: false,
      error: 'Tool invocation denied by user',
      durationMs: Date.now() - startTime,
    };
  }

  // Execute the tool after approval
  return invokeTool(request);
}

/**
 * Check if a tool requires approval based on configuration
 */
export function requiresApproval(_serverId: string, _toolName: string): boolean {
  // TODO: Check against allowlist/blocklist configuration
  // For now, return true for all tools (require approval)
  return true;
}
