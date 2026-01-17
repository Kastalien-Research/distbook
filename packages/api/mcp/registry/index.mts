/**
 * MCP Capability Registry
 *
 * Maintains a unified view of all available MCP capabilities:
 * - Tools from both Srcbook (server mode) and external servers (client mode)
 * - Resources available for reading/subscription
 * - Prompts for AI interactions
 *
 * Provides aggregation and filtering for the UI.
 */

import type {
  MCPCapabilityRegistry,
  MCPToolDefinition,
  MCPResourceDefinition,
  MCPPromptDefinition,
  MCPServerConfig,
} from '@srcbook/shared';

// =============================================================================
// Registry State
// =============================================================================

interface RegistryState {
  tools: Map<string, MCPToolDefinition[]>; // serverId -> tools
  resources: Map<string, MCPResourceDefinition[]>; // serverId -> resources
  prompts: Map<string, MCPPromptDefinition[]>; // serverId -> prompts
  servers: Map<string, MCPServerConfig>; // serverId -> config
  lastUpdated: Date;
}

const registry: RegistryState = {
  tools: new Map(),
  resources: new Map(),
  prompts: new Map(),
  servers: new Map(),
  lastUpdated: new Date(),
};

// =============================================================================
// Registry Operations
// =============================================================================

/**
 * Get the complete capability registry
 */
export function getCapabilityRegistry(): MCPCapabilityRegistry {
  return {
    tools: getAllTools(),
    resources: getAllResources(),
    prompts: getAllPrompts(),
    lastUpdated: registry.lastUpdated,
  };
}

/**
 * Get all tools from all sources
 */
export function getAllTools(): MCPToolDefinition[] {
  const allTools: MCPToolDefinition[] = [];
  for (const tools of registry.tools.values()) {
    allTools.push(...tools);
  }
  return allTools;
}

/**
 * Get tools from a specific server
 */
export function getToolsForServer(serverId: string): MCPToolDefinition[] {
  return registry.tools.get(serverId) || [];
}

/**
 * Get all resources from all sources
 */
export function getAllResources(): MCPResourceDefinition[] {
  const allResources: MCPResourceDefinition[] = [];
  for (const resources of registry.resources.values()) {
    allResources.push(...resources);
  }
  return allResources;
}

/**
 * Get resources from a specific server
 */
export function getResourcesForServer(serverId: string): MCPResourceDefinition[] {
  return registry.resources.get(serverId) || [];
}

/**
 * Get all prompts from all sources
 */
export function getAllPrompts(): MCPPromptDefinition[] {
  const allPrompts: MCPPromptDefinition[] = [];
  for (const prompts of registry.prompts.values()) {
    allPrompts.push(...prompts);
  }
  return allPrompts;
}

/**
 * Get prompts from a specific server
 */
export function getPromptsForServer(serverId: string): MCPPromptDefinition[] {
  return registry.prompts.get(serverId) || [];
}

// =============================================================================
// Registry Updates
// =============================================================================

/**
 * Register tools from a server
 */
export function registerTools(serverId: string, tools: MCPToolDefinition[]): void {
  registry.tools.set(serverId, tools);
  registry.lastUpdated = new Date();

  console.log('[MCP Registry] Registered', tools.length, 'tools from', serverId);
}

/**
 * Register resources from a server
 */
export function registerResources(serverId: string, resources: MCPResourceDefinition[]): void {
  registry.resources.set(serverId, resources);
  registry.lastUpdated = new Date();

  console.log('[MCP Registry] Registered', resources.length, 'resources from', serverId);
}

/**
 * Register prompts from a server
 */
export function registerPrompts(serverId: string, prompts: MCPPromptDefinition[]): void {
  registry.prompts.set(serverId, prompts);
  registry.lastUpdated = new Date();

  console.log('[MCP Registry] Registered', prompts.length, 'prompts from', serverId);
}

/**
 * Register a server configuration
 */
export function registerServer(config: MCPServerConfig): void {
  registry.servers.set(config.id, config);
  registry.lastUpdated = new Date();

  console.log('[MCP Registry] Registered server:', config.name);
}

/**
 * Unregister all capabilities from a server
 */
export function unregisterServer(serverId: string): void {
  registry.tools.delete(serverId);
  registry.resources.delete(serverId);
  registry.prompts.delete(serverId);
  registry.servers.delete(serverId);
  registry.lastUpdated = new Date();

  console.log('[MCP Registry] Unregistered server:', serverId);
}

// =============================================================================
// Registry Queries
// =============================================================================

/**
 * Find a tool by name (searches all servers)
 */
export function findTool(name: string): MCPToolDefinition | undefined {
  for (const tools of registry.tools.values()) {
    const tool = tools.find((t) => t.name === name);
    if (tool) return tool;
  }
  return undefined;
}

/**
 * Find a resource by URI pattern (searches all servers)
 */
export function findResource(uri: string): MCPResourceDefinition | undefined {
  for (const resources of registry.resources.values()) {
    // Simple prefix matching - could be enhanced for templates
    const resource = resources.find((r) => uri.startsWith(r.uri.split('{')[0]));
    if (resource) return resource;
  }
  return undefined;
}

/**
 * Get all registered servers
 */
export function getRegisteredServers(): MCPServerConfig[] {
  return Array.from(registry.servers.values());
}

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize registry with Srcbook's built-in tools
 */
export function initializeRegistry(): void {
  const SRCBOOK_SERVER_ID = 'srcbook-internal';

  // Register Srcbook's built-in tools
  registerTools(SRCBOOK_SERVER_ID, [
    {
      name: 'srcbook_execute_cell',
      description: 'Execute a code cell in a Srcbook notebook',
      serverId: SRCBOOK_SERVER_ID,
      inputSchema: {},
    },
    {
      name: 'srcbook_create_cell',
      description: 'Create a new cell in a Srcbook notebook',
      serverId: SRCBOOK_SERVER_ID,
      inputSchema: {},
    },
    {
      name: 'srcbook_update_cell',
      description: 'Update an existing cell in a Srcbook notebook',
      serverId: SRCBOOK_SERVER_ID,
      inputSchema: {},
    },
    {
      name: 'srcbook_delete_cell',
      description: 'Delete a cell from a Srcbook notebook',
      serverId: SRCBOOK_SERVER_ID,
      inputSchema: {},
    },
    {
      name: 'srcbook_generate_cell',
      description: 'AI-generate a new cell based on a prompt',
      serverId: SRCBOOK_SERVER_ID,
      inputSchema: {},
    },
  ]);

  // Register Srcbook's built-in resources
  registerResources(SRCBOOK_SERVER_ID, [
    {
      name: 'Sessions',
      uri: 'srcbook://sessions',
      description: 'List of active notebook sessions',
      serverId: SRCBOOK_SERVER_ID,
      mimeType: 'application/json',
    },
  ]);

  // Register Srcbook's built-in prompts
  registerPrompts(SRCBOOK_SERVER_ID, [
    {
      name: 'srcbook_new_notebook',
      description: 'Create a new notebook from a description',
      serverId: SRCBOOK_SERVER_ID,
    },
    {
      name: 'srcbook_analyze_data',
      description: 'Create a data analysis notebook',
      serverId: SRCBOOK_SERVER_ID,
    },
    {
      name: 'srcbook_api_client',
      description: 'Create an API integration notebook',
      serverId: SRCBOOK_SERVER_ID,
    },
  ]);

  console.log('[MCP Registry] Initialized with Srcbook built-in capabilities');
}
