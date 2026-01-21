/**
 * MCP Configuration Loader
 *
 * Loads MCP server configurations from .mcp.json files.
 * Follows the Claude Desktop / VS Code configuration format.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { MCPServerConfig } from '@srcbook/shared';

// =============================================================================
// Configuration Schema
// =============================================================================

/**
 * Schema for stdio server configuration in .mcp.json
 */
const StdioServerSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
});

/**
 * Schema for HTTP server configuration in .mcp.json
 */
const HttpServerSchema = z.object({
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
});

/**
 * Schema for server entry in .mcp.json
 * Can be either stdio or http based on presence of 'command' vs 'url'
 */
const ServerEntrySchema = z.union([
  StdioServerSchema,
  HttpServerSchema,
]);

/**
 * Schema for the entire .mcp.json file
 */
const MCPConfigFileSchema = z.object({
  mcpServers: z.record(z.string(), ServerEntrySchema).optional(),
});

export type MCPConfigFile = z.infer<typeof MCPConfigFileSchema>;

// =============================================================================
// Configuration Loading
// =============================================================================

/**
 * Load MCP configuration from a directory's .mcp.json file
 * Returns empty array if file doesn't exist or is invalid
 */
export async function loadMCPConfig(dir: string): Promise<MCPServerConfig[]> {
  const configPath = join(dir, '.mcp.json');

  if (!existsSync(configPath)) {
    console.log('[MCP Config] No .mcp.json found at:', configPath);
    return [];
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    const json = JSON.parse(content);
    const config = MCPConfigFileSchema.parse(json);

    if (!config.mcpServers) {
      console.log('[MCP Config] No mcpServers defined in:', configPath);
      return [];
    }

    const servers: MCPServerConfig[] = [];

    for (const [name, entry] of Object.entries(config.mcpServers)) {
      const serverConfig = parseServerEntry(name, entry);
      if (serverConfig) {
        servers.push(serverConfig);
      }
    }

    console.log('[MCP Config] Loaded', servers.length, 'servers from:', configPath);
    return servers;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('[MCP Config] Invalid JSON in:', configPath);
    } else if (error instanceof z.ZodError) {
      console.error('[MCP Config] Invalid schema in:', configPath, error.issues);
    } else {
      console.error('[MCP Config] Error loading:', configPath, error);
    }
    return [];
  }
}

/**
 * Parse a single server entry from the config
 */
function parseServerEntry(
  name: string,
  entry: z.infer<typeof ServerEntrySchema>,
): MCPServerConfig | null {
  // Determine transport type based on properties
  if ('command' in entry) {
    // Stdio transport
    return {
      id: randomUUID(),
      name,
      transport: 'stdio',
      command: entry.command,
      args: entry.args,
      env: entry.env,
      autoConnect: false,
      enabled: true,
      timeout: 30000,
    };
  } else if ('url' in entry) {
    // HTTP transport
    return {
      id: randomUUID(),
      name,
      transport: 'http',
      url: entry.url,
      headers: entry.headers,
      autoConnect: false,
      enabled: true,
      timeout: 30000,
    };
  }

  console.warn('[MCP Config] Unknown server entry format for:', name);
  return null;
}

/**
 * Load MCP configuration from multiple directories
 * Later directories take precedence (can override earlier)
 */
export async function loadMCPConfigs(dirs: string[]): Promise<MCPServerConfig[]> {
  const allConfigs: MCPServerConfig[] = [];
  const seenNames = new Set<string>();

  for (const dir of dirs) {
    const configs = await loadMCPConfig(dir);
    for (const config of configs) {
      // Later configs override earlier ones with same name
      if (seenNames.has(config.name)) {
        const existingIndex = allConfigs.findIndex((c) => c.name === config.name);
        if (existingIndex >= 0) {
          allConfigs[existingIndex] = config;
        }
      } else {
        seenNames.add(config.name);
        allConfigs.push(config);
      }
    }
  }

  return allConfigs;
}

/**
 * Find all .mcp.json files in a directory tree (non-recursive by default)
 */
export function findConfigPath(dir: string): string | null {
  const configPath = join(dir, '.mcp.json');
  return existsSync(configPath) ? configPath : null;
}
