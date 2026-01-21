/**
 * MCP Client Resource Management
 *
 * Handles reading and subscribing to resources from external MCP servers:
 * - One-time resource reads
 * - Persistent subscriptions with change notifications
 * - Resource caching (optional)
 */

import { getConnection } from './index.mjs';

// =============================================================================
// Types
// =============================================================================

export interface ResourceReadRequest {
  serverId: string;
  uri: string;
  sessionId?: string;
}

export interface ResourceReadResult {
  success: boolean;
  content?: unknown;
  mimeType?: string;
  error?: string;
}

export interface ResourceSubscription {
  id: string;
  serverId: string;
  uri: string;
  sessionId: string;
  active: boolean;
  createdAt: Date;
}

// =============================================================================
// Active Subscriptions
// =============================================================================

const activeSubscriptions = new Map<string, ResourceSubscription>();

/**
 * Get all active subscriptions for a session
 */
export function getSubscriptionsForSession(sessionId: string): ResourceSubscription[] {
  return Array.from(activeSubscriptions.values()).filter(
    (sub) => sub.sessionId === sessionId && sub.active,
  );
}

// =============================================================================
// Resource Operations
// =============================================================================

/**
 * Read a resource from an external MCP server
 */
export async function readResource(request: ResourceReadRequest): Promise<ResourceReadResult> {
  const connection = getConnection(request.serverId);

  if (!connection) {
    return {
      success: false,
      error: `No connection found for server: ${request.serverId}`,
    };
  }

  if (connection.status !== 'connected') {
    return {
      success: false,
      error: `Server not connected: ${connection.status}`,
    };
  }

  try {
    // TODO: Implement actual resource read
    // 1. Call connection.client.readResource(...)
    // 2. Parse response
    // 3. Return content

    console.log('[MCP Client] Reading resource:', request.uri, 'from', request.serverId);

    return {
      success: false,
      error: 'Resource read not yet implemented',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Subscribe to resource updates from an external MCP server
 */
export async function subscribeToResource(
  serverId: string,
  uri: string,
  sessionId: string,
): Promise<ResourceSubscription | null> {
  const connection = getConnection(serverId);

  if (!connection) {
    console.log('[MCP Client] No connection for subscription:', serverId);
    return null;
  }

  if (connection.status !== 'connected') {
    console.log('[MCP Client] Server not connected for subscription:', connection.status);
    return null;
  }

  // Create subscription record
  const subscription: ResourceSubscription = {
    id: crypto.randomUUID(),
    serverId,
    uri,
    sessionId,
    active: true,
    createdAt: new Date(),
  };

  // TODO: Implement actual subscription
  // 1. Call connection.client.subscribeResource(...)
  // 2. Set up notification handler
  // 3. Store subscription in database

  console.log('[MCP Client] Subscribing to resource:', uri, 'from', serverId);
  activeSubscriptions.set(subscription.id, subscription);

  return subscription;
}

/**
 * Unsubscribe from resource updates
 */
export async function unsubscribeFromResource(subscriptionId: string): Promise<boolean> {
  const subscription = activeSubscriptions.get(subscriptionId);

  if (!subscription) {
    return false;
  }

  // TODO: Implement actual unsubscription
  // 1. Find connection
  // 2. Call connection.client.unsubscribeResource(...)
  // 3. Update database

  console.log('[MCP Client] Unsubscribing from resource:', subscription.uri);
  subscription.active = false;
  activeSubscriptions.delete(subscriptionId);

  return true;
}

/**
 * Handle resource change notification from an external server
 */
export function handleResourceChange(serverId: string, uri: string, _content: unknown): void {
  // Find subscriptions for this resource
  const subscriptions = Array.from(activeSubscriptions.values()).filter(
    (sub) => sub.serverId === serverId && sub.uri === uri && sub.active,
  );

  if (subscriptions.length === 0) {
    console.log('[MCP Client] Received change for unsubscribed resource:', uri);
    return;
  }

  // TODO: Broadcast to WebSocket clients
  // For each subscription, notify the associated session
  for (const sub of subscriptions) {
    console.log('[MCP Client] Resource changed:', uri, 'for session:', sub.sessionId);
    // wss.broadcast(MCP_TOPICS.CLIENT, MCP_EVENTS.CLIENT.RESOURCE_UPDATED, { ... });
  }
}
