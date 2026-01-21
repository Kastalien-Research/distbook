import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
import { randomid } from '@srcbook/shared';

export const configs = sqliteTable('config', {
  // Directory where .src.md files will be stored and searched by default.
  baseDir: text('base_dir').notNull(),
  defaultLanguage: text('default_language').notNull().default('typescript'),
  openaiKey: text('openai_api_key'),
  anthropicKey: text('anthropic_api_key'),
  xaiKey: text('xai_api_key'),
  geminiKey: text('gemini_api_key'),
  openrouterKey: text('openrouter_api_key'),
  customApiKey: text('custom_api_key'),
  // TODO: This is deprecated in favor of SRCBOOK_DISABLE_ANALYTICS env variable. Remove this.
  enabledAnalytics: integer('enabled_analytics', { mode: 'boolean' }).notNull().default(true),
  // Stable ID for posthog
  installId: text('srcbook_installation_id').notNull().default(randomid()),
  aiProvider: text('ai_provider').notNull().default('openai'),
  aiModel: text('ai_model').default('gpt-4o'),
  aiBaseUrl: text('ai_base_url'),
  // Null: unset. Email: subscribed. "dismissed": dismissed the dialog.
  subscriptionEmail: text('subscription_email'),
});

export type Config = typeof configs.$inferSelect;

export const secrets = sqliteTable('secrets', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
  value: text('value').notNull(),
});

export type Secret = typeof secrets.$inferSelect;

export const secretsToSession = sqliteTable(
  'secrets_to_sessions',
  {
    id: integer('id').primaryKey(),
    session_id: text('session_id').notNull(),
    secret_id: integer('secret_id')
      .notNull()
      .references(() => secrets.id),
  },
  (t) => ({
    unique_session_secret: unique().on(t.session_id, t.secret_id),
  }),
);

export type SecretsToSession = typeof secretsToSession.$inferSelect;

export const apps = sqliteTable('apps', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  externalId: text('external_id').notNull().unique(),
  history: text('history').notNull().default('[]'), // JSON encoded value of the history
  historyVersion: integer('history_version').notNull().default(1), // internal versioning of history type for migrations
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type App = typeof apps.$inferSelect;

// =============================================================================
// MCP Tables
// =============================================================================

/**
 * MCP Server Configuration (for client mode - connecting to external servers)
 */
export const mcpServers = sqliteTable('mcp_servers', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  transport: text('transport').notNull(), // 'stdio' | 'http'
  config: text('config').notNull().default('{}'), // JSON: command, args, env, url, headers
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  autoConnect: integer('auto_connect', { mode: 'boolean' }).notNull().default(false),
  timeout: integer('timeout').notNull().default(30000),
  lastConnectedAt: integer('last_connected_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type MCPServer = typeof mcpServers.$inferSelect;
export type MCPServerInsert = typeof mcpServers.$inferInsert;

/**
 * MCP Token table (for server mode - authenticating incoming clients)
 */
export const mcpTokens = sqliteTable('mcp_tokens', {
  id: text('id').primaryKey().notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  clientName: text('client_name').notNull(),
  permissions: text('permissions').notNull().default('[]'), // JSON array of permissions
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
});

export type MCPToken = typeof mcpTokens.$inferSelect;
export type MCPTokenInsert = typeof mcpTokens.$inferInsert;

/**
 * MCP Tool Invocations (for auditing)
 */
export const mcpToolInvocations = sqliteTable('mcp_tool_invocations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id'), // Srcbook session if applicable
  serverId: text('server_id'),   // null for Srcbook's own tools
  clientId: text('client_id'),   // For server mode: which client invoked
  toolName: text('tool_name').notNull(),
  input: text('input').notNull().default('{}'), // JSON
  output: text('output'), // JSON
  error: text('error'),
  durationMs: integer('duration_ms'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type MCPToolInvocation = typeof mcpToolInvocations.$inferSelect;
export type MCPToolInvocationInsert = typeof mcpToolInvocations.$inferInsert;

/**
 * MCP Resource Subscriptions
 */
export const mcpResourceSubscriptions = sqliteTable('mcp_resource_subscriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  subscriptionId: text('subscription_id').notNull().unique(),
  sessionId: text('session_id').notNull(),
  serverId: text('server_id').notNull(),
  resourceUri: text('resource_uri').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type MCPResourceSubscription = typeof mcpResourceSubscriptions.$inferSelect;
export type MCPResourceSubscriptionInsert = typeof mcpResourceSubscriptions.$inferInsert;
