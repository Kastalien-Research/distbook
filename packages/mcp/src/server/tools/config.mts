import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SrcbookDeps } from '../index.mjs';

// Settings tools are already registered in apps.mts (get_settings, update_settings).
// This file is a placeholder for any additional config-specific tools that may be added.
export function registerConfigTools(_server: McpServer, _deps: SrcbookDeps) {
  // Config tools (get_settings, update_settings) are registered in apps.mts
  // for cohesion with the rest of the management tools.
}
