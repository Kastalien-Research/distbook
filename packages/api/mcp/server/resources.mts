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

import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { paginator, logger } from '../utilities/index.mjs';

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
  const annotations = { audience: ['assistant', 'user'] as const, priority: 0.6 };

  // =========================================================================
  // Static Resource: List all notebooks
  // =========================================================================

  server.registerResource(
    'notebooks',
    'srcbook://notebooks',
    {
      description: 'List of all notebooks',
      mimeType: 'application/json',
      annotations,
    },
    async () => {
      logger.info({ message: 'Reading srcbook://notebooks' });
      const content: NotebookListContent = {
        notebooks: [],
        total: 0,
      };
      const paged = paginator.paginate(content.notebooks);

      return {
        contents: [
          {
            uri: 'srcbook://notebooks',
            mimeType: 'application/json',
            text: JSON.stringify({
              ...content,
              nextCursor: paged.nextCursor,
            }),
          },
        ],
      };
    },
  );

  // =========================================================================
  // Template Resource: Session state
  // =========================================================================

  const sessionTemplate = new ResourceTemplate('srcbook://session/{sessionId}', {
    list: async (extra) => {
      const cursor = (extra as Record<string, unknown> | undefined)?.['cursor'] as string | undefined;
      const paged = paginator.paginate<{ uri: string }>([], cursor);
      return { resources: paged.items, nextCursor: paged.nextCursor };
    },
  });

  server.registerResource(
    'session',
    sessionTemplate,
    {
      description: 'Complete notebook state',
      mimeType: 'application/json',
      annotations: { audience: ['assistant'], priority: 0.7 },
    },
    async (uri, params) => {
      const sessionId = params.sessionId as string;
      logger.debug({ message: 'Reading session', sessionId });

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

  const cellTemplate = new ResourceTemplate('srcbook://session/{sessionId}/cell/{cellId}', {
    list: async (extra) => {
      const cursor = (extra as Record<string, unknown> | undefined)?.['cursor'] as string | undefined;
      const paged = paginator.paginate<{ uri: string }>([], cursor);
      return { resources: paged.items, nextCursor: paged.nextCursor };
    },
  });

  server.registerResource(
    'cell',
    cellTemplate,
    {
      description: 'Individual cell content',
      mimeType: 'application/json',
      annotations: { audience: ['assistant'], priority: 0.6 },
    },
    async (uri, params) => {
      const sessionId = params.sessionId as string;
      const cellId = params.cellId as string;
      logger.info('[MCP Resource] Reading cell', { sessionId, cellId });

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

  const cellOutputTemplate = new ResourceTemplate('srcbook://session/{sessionId}/cell/{cellId}/output', {
    list: async (extra) => {
      const cursor = (extra as Record<string, unknown> | undefined)?.['cursor'] as string | undefined;
      const paged = paginator.paginate<{ uri: string }>([], cursor);
      return { resources: paged.items, nextCursor: paged.nextCursor };
    },
  });

  server.registerResource(
    'cell_output',
    cellOutputTemplate,
    {
      description: 'Cell execution output (supports binary payloads)',
      mimeType: 'application/json',
      annotations: { audience: ['assistant'], priority: 0.6 },
    },
    async (uri, params) => {
      const sessionId = params.sessionId as string;
      const cellId = params.cellId as string;
      logger.info('[MCP Resource] Reading cell output', { sessionId, cellId });

      const content: CellOutputContent = {
        stdout: '',
        stderr: '',
        exitCode: 0,
        executionTime: 0,
        executedAt: new Date().toISOString(),
      };

      const payload = JSON.stringify(content);

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: payload,
            base64: Buffer.from(payload).toString('base64'),
            description: 'Execution result for the last run of this cell',
          },
        ],
      };
    },
  );

  // =========================================================================
  // Template Resource: Package.json
  // =========================================================================

  const packageTemplate = new ResourceTemplate('srcbook://session/{sessionId}/package.json', {
    list: async (extra) => {
      const cursor = (extra as Record<string, unknown> | undefined)?.['cursor'] as string | undefined;
      const paged = paginator.paginate<{ uri: string }>([], cursor);
      return { resources: paged.items, nextCursor: paged.nextCursor };
    },
  });

  server.registerResource(
    'package_json',
    packageTemplate,
    {
      description: 'npm dependencies for a notebook session',
      mimeType: 'application/json',
      annotations,
    },
    async (uri, params) => {
      const sessionId = params.sessionId as string;
      logger.info('[MCP Resource] Reading package.json', { sessionId });

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

  logger.info({ message: 'Registered 5 notebook resource templates with annotations' });
  if (typeof server.sendResourceListChanged === 'function') {
    server.sendResourceListChanged();
  }
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
const MIN_NOTIFY_INTERVAL_MS = 100;

/**
 * Subscribe to resource updates
 */
export function subscribeToResource(
  clientId: string,
  uri: string,
): ResourceSubscription {
  const subscription: ResourceSubscription = {
    id: randomUUID(),
    clientId,
    uri,
    active: true,
    lastNotified: new Date(),
  };

  subscriptions.set(subscription.id, subscription);
  logger.info('[MCP Resource] Client subscribed', { clientId, uri });

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
  logger.info('[MCP Resource] Unsubscribed', { subscriptionId });

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
    const now = Date.now();
    if (now - sub.lastNotified.getTime() < MIN_NOTIFY_INTERVAL_MS) {
      continue;
    }
    sub.lastNotified = new Date();
    // TODO: Send notification via WebSocket
    logger.debug({ message: 'Notifying subscriber', clientId: sub.clientId, uri });
  }
}
