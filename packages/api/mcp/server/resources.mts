/**
 * MCP Server Resources
 *
 * Registers all notebook-related resources that external MCP clients can read:
 *
 * 5 Resource Types:
 * - srcbook://notebooks - List of all notebooks
 * - srcbook://session/{sessionId} - Complete notebook state
 * - srcbook://session/{sessionId}/cell/{cellId} - Individual cell content
 * - srcbook://session/{sessionId}/cell/{cellId}/output - Cell execution output
 * - srcbook://session/{sessionId}/package.json - npm dependencies
 *
 * All session-specific resources support subscriptions for real-time updates.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

// =============================================================================
// Resource Content Types (from spec section 6.4)
// =============================================================================

export interface NotebookListContent {
  notebooks: Array<{
    sessionId: string;
    title: string;
    language: 'typescript' | 'javascript';
    cellCount: number;
    updatedAt: string;
  }>;
  total: number;
}

export interface SessionStateContent {
  sessionId: string;
  title: string;
  language: 'typescript' | 'javascript';
  cells: Array<{
    id: string;
    type: 'code' | 'markdown' | 'title';
    content: string;
    filename?: string;
    output?: string;
  }>;
  dependencies: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CellContent {
  id: string;
  type: 'code' | 'markdown' | 'title';
  content: string;
  filename?: string;
}

export interface CellOutputContent {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  executedAt: string;
}

export interface PackageJsonContent {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

// =============================================================================
// Resource Registration
// =============================================================================

/**
 * Register all notebook resources with the MCP server
 */
export function registerNotebookResources(server: McpServer): void {
  // =========================================================================
  // Static Resource: List all notebooks
  // =========================================================================

  server.resource(
    'srcbook://notebooks',
    'srcbook://notebooks',
    async () => {
      // TODO: Implement notebook listing
      // 1. List all sessions from memory
      // 2. Parse srcbook directory for additional notebooks
      // 3. Return list with metadata

      console.log('[MCP Resource] Reading srcbook://notebooks');

      const content: NotebookListContent = {
        notebooks: [],
        total: 0,
      };

      return {
        contents: [
          {
            uri: 'srcbook://notebooks',
            mimeType: 'application/json',
            text: JSON.stringify(content),
          },
        ],
      };
    },
  );

  // =========================================================================
  // Template Resource: Session state
  // =========================================================================

  server.resource(
    'srcbook://session/{sessionId}',
    new ResourceTemplate('srcbook://session/{sessionId}', {
      list: async () => {
        // TODO: Return list of all active sessions
        return { resources: [] };
      },
    }),
    async (uri, params) => {
      // TODO: Implement session state retrieval
      // 1. Parse sessionId from params
      // 2. Find session in memory
      // 3. Return full state including cells

      const sessionId = params?.sessionId as string;
      console.log('[MCP Resource] Reading session:', sessionId);

      const content: SessionStateContent = {
        sessionId,
        title: 'Unknown',
        language: 'typescript',
        cells: [],
        dependencies: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(content),
          },
        ],
      };
    },
  );

  // =========================================================================
  // Template Resource: Individual cell
  // =========================================================================

  server.resource(
    'srcbook://session/{sessionId}/cell/{cellId}',
    new ResourceTemplate('srcbook://session/{sessionId}/cell/{cellId}', {
      list: async () => {
        // TODO: Return list of all cells (would need session context)
        return { resources: [] };
      },
    }),
    async (uri, params) => {
      // TODO: Implement cell retrieval
      // 1. Parse sessionId and cellId from params
      // 2. Find session and cell
      // 3. Return cell content

      const sessionId = params?.sessionId as string;
      const cellId = params?.cellId as string;
      console.log('[MCP Resource] Reading cell:', cellId, 'in session:', sessionId);

      const content: CellContent = {
        id: cellId,
        type: 'code',
        content: '',
      };

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(content),
          },
        ],
      };
    },
  );

  // =========================================================================
  // Template Resource: Cell output
  // =========================================================================

  server.resource(
    'srcbook://session/{sessionId}/cell/{cellId}/output',
    new ResourceTemplate('srcbook://session/{sessionId}/cell/{cellId}/output', {
      list: async () => {
        return { resources: [] };
      },
    }),
    async (uri, params) => {
      // TODO: Implement cell output retrieval
      // 1. Parse sessionId and cellId from params
      // 2. Find session and cell
      // 3. Return last execution output

      const sessionId = params?.sessionId as string;
      const cellId = params?.cellId as string;
      console.log('[MCP Resource] Reading output for cell:', cellId, 'in session:', sessionId);

      const content: CellOutputContent = {
        stdout: '',
        stderr: '',
        exitCode: 0,
        executionTime: 0,
        executedAt: new Date().toISOString(),
      };

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/plain',
            text: JSON.stringify(content),
          },
        ],
      };
    },
  );

  // =========================================================================
  // Template Resource: Package.json
  // =========================================================================

  server.resource(
    'srcbook://session/{sessionId}/package.json',
    new ResourceTemplate('srcbook://session/{sessionId}/package.json', {
      list: async () => {
        return { resources: [] };
      },
    }),
    async (uri, params) => {
      // TODO: Implement package.json retrieval
      // 1. Parse sessionId from params
      // 2. Find session directory
      // 3. Read and return package.json contents

      const sessionId = params?.sessionId as string;
      console.log('[MCP Resource] Reading package.json for session:', sessionId);

      const content: PackageJsonContent = {
        dependencies: {},
        devDependencies: {},
      };

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(content),
          },
        ],
      };
    },
  );

  console.log('[MCP Server] Registered 5 notebook resource templates');
}

// =============================================================================
// Subscription Management
// =============================================================================

interface ResourceSubscription {
  id: string;
  clientId: string;
  uri: string;
  active: boolean;
  lastNotified: Date;
}

const subscriptions = new Map<string, ResourceSubscription>();

/**
 * Subscribe to resource updates
 */
export function subscribeToResource(
  clientId: string,
  uri: string,
): ResourceSubscription {
  const subscription: ResourceSubscription = {
    id: crypto.randomUUID(),
    clientId,
    uri,
    active: true,
    lastNotified: new Date(),
  };

  subscriptions.set(subscription.id, subscription);
  console.log('[MCP Resource] Client', clientId, 'subscribed to', uri);

  return subscription;
}

/**
 * Unsubscribe from resource updates
 */
export function unsubscribeFromResource(subscriptionId: string): boolean {
  const subscription = subscriptions.get(subscriptionId);
  if (!subscription) {
    return false;
  }

  subscription.active = false;
  subscriptions.delete(subscriptionId);
  console.log('[MCP Resource] Unsubscribed:', subscriptionId);

  return true;
}

/**
 * Get all active subscriptions for a URI pattern
 */
export function getSubscriptionsForUri(uriPattern: string): ResourceSubscription[] {
  return Array.from(subscriptions.values()).filter(
    (sub) => sub.active && sub.uri.startsWith(uriPattern.split('{')[0] || ''),
  );
}

/**
 * Notify subscribers of a resource change
 */
export function notifySubscribers(uri: string, _content: unknown): void {
  const matchingSubscriptions = getSubscriptionsForUri(uri);

  for (const sub of matchingSubscriptions) {
    sub.lastNotified = new Date();
    // TODO: Send notification via WebSocket
    console.log('[MCP Resource] Notifying', sub.clientId, 'of change to', uri);
  }
}
