-- MCP Server Configuration (for client mode - connecting to external servers)
CREATE TABLE `mcp_servers` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `transport` text NOT NULL CHECK (transport IN ('stdio', 'http')),
  `config` text NOT NULL DEFAULT '{}',
  `enabled` integer DEFAULT true NOT NULL,
  `auto_connect` integer DEFAULT false NOT NULL,
  `timeout` integer DEFAULT 30000 NOT NULL,
  `last_connected_at` integer,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- MCP Token table (for server mode - authenticating incoming clients)
CREATE TABLE `mcp_tokens` (
  `id` text PRIMARY KEY NOT NULL,
  `token_hash` text NOT NULL UNIQUE,
  `client_name` text NOT NULL,
  `permissions` text NOT NULL DEFAULT '[]',
  `created_at` integer DEFAULT (unixepoch()) NOT NULL,
  `expires_at` integer NOT NULL,
  `last_used_at` integer,
  `revoked_at` integer
);

-- MCP Tool Invocations (for auditing)
CREATE TABLE `mcp_tool_invocations` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `session_id` text,
  `server_id` text,
  `client_id` text,
  `tool_name` text NOT NULL,
  `input` text NOT NULL DEFAULT '{}',
  `output` text,
  `error` text,
  `duration_ms` integer,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- MCP Resource Subscriptions
CREATE TABLE `mcp_resource_subscriptions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `subscription_id` text NOT NULL UNIQUE,
  `session_id` text NOT NULL,
  `server_id` text NOT NULL,
  `resource_uri` text NOT NULL,
  `active` integer DEFAULT true NOT NULL,
  `created_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- Indexes
CREATE INDEX `idx_mcp_servers_enabled` ON `mcp_servers` (`enabled`);
CREATE INDEX `idx_mcp_tokens_hash` ON `mcp_tokens` (`token_hash`);
CREATE INDEX `idx_mcp_tool_invocations_session` ON `mcp_tool_invocations` (`session_id`);
CREATE INDEX `idx_mcp_tool_invocations_created` ON `mcp_tool_invocations` (`created_at`);
CREATE INDEX `idx_mcp_subscriptions_session` ON `mcp_resource_subscriptions` (`session_id`);
CREATE INDEX `idx_mcp_subscriptions_active` ON `mcp_resource_subscriptions` (`session_id`, `active`);
