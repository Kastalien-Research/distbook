/**
 * MCP Sampling Integration
 *
 * Provides MCP sampling capabilities for AI operations:
 * - Detect sampling capability from connected servers
 * - Request LLM completions through MCP
 * - Fall back to direct API when unavailable
 *
 * @see 02-mcp-client.md section 4.4 for requirements
 */

import { getActiveConnections } from './index.mjs';
import type { MCPSamplingRequest, MCPSamplingResponse } from '@srcbook/shared';

// =============================================================================
// Types
// =============================================================================

export interface SamplingServer {
  serverId: string;
  serverName: string;
  samplingCapabilities: object;
}

// =============================================================================
// Sampling Detection
// =============================================================================

/**
 * Check if any connected server provides sampling capability
 */
export function isSamplingAvailable(): boolean {
  const connections = getActiveConnections();
  return connections.some((conn) => conn.capabilities?.sampling);
}

/**
 * Get all servers that provide sampling capability
 */
export function getSamplingServers(): SamplingServer[] {
  const connections = getActiveConnections();
  return connections
    .filter((conn) => conn.capabilities?.sampling)
    .map((conn) => ({
      serverId: conn.config.id,
      serverName: conn.config.name,
      samplingCapabilities: conn.capabilities!.sampling!,
    }));
}

/**
 * Get the preferred sampling server (first available)
 */
export function getPreferredSamplingServer(): SamplingServer | null {
  const servers = getSamplingServers();
  return servers.length > 0 ? servers[0] : null;
}

// =============================================================================
// Sampling Operations
// =============================================================================

/**
 * Create a sampling message (LLM completion) via MCP
 */
export async function createSamplingMessage(
  request: MCPSamplingRequest,
  serverId?: string,
): Promise<MCPSamplingResponse> {
  // Find a sampling server
  let targetServerId = serverId;

  if (!targetServerId) {
    const preferredServer = getPreferredSamplingServer();
    if (!preferredServer) {
      throw new Error('No sampling server available');
    }
    targetServerId = preferredServer.serverId;
  }

  const connection = getActiveConnections().find((c) => c.config.id === targetServerId);

  if (!connection) {
    throw new Error(`Server ${targetServerId} not connected`);
  }

  if (!connection.capabilities?.sampling) {
    throw new Error(`Server ${connection.config.name} does not support sampling`);
  }

  console.log('[MCP Sampling] Creating message via:', connection.config.name);

  // TODO: Implement actual sampling request
  // const result = await connection.client.createMessage({
  //   messages: request.messages,
  //   modelPreferences: request.modelPreferences,
  //   systemPrompt: request.systemPrompt,
  //   includeContext: request.includeContext,
  //   temperature: request.temperature,
  //   maxTokens: request.maxTokens,
  //   stopSequences: request.stopSequences,
  // });

  return {
    role: 'assistant',
    content: {
      type: 'text',
      text: 'Sampling not yet implemented',
    },
    model: 'unknown',
    stopReason: 'error',
  };
}

/**
 * Create a sampling message with fallback to direct API
 */
export async function createSamplingMessageWithFallback(
  request: MCPSamplingRequest,
  fallback: () => Promise<MCPSamplingResponse>,
): Promise<MCPSamplingResponse> {
  if (isSamplingAvailable()) {
    try {
      return await createSamplingMessage(request);
    } catch (error) {
      console.warn('[MCP Sampling] Failed, falling back to direct API:', error);
    }
  }

  // Use fallback (e.g., direct OpenAI/Anthropic API)
  return fallback();
}

// =============================================================================
// Sampling for AI Features
// =============================================================================

/**
 * Use MCP sampling for cell generation if available
 *
 * This function can be integrated with Srcbook's generateCells function
 * to use MCP sampling when a server provides it.
 */
export async function samplingForGeneration(
  prompt: string,
  context?: string,
): Promise<string | null> {
  if (!isSamplingAvailable()) {
    console.log('[MCP Sampling] No sampling server available, using direct API');
    return null;
  }

  try {
    const request: MCPSamplingRequest = {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
      includeContext: context ? 'thisServer' : undefined,
    };

    const response = await createSamplingMessage(request);

    if (response.content.type === 'text') {
      return response.content.text;
    }

    return null;
  } catch (error) {
    console.error('[MCP Sampling] Generation failed:', error);
    return null;
  }
}

// =============================================================================
// Sampling Request Builder
// =============================================================================

/**
 * Build a sampling request with common defaults
 */
export function buildSamplingRequest(
  messages: MCPSamplingRequest['messages'],
  options: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    modelPreferences?: MCPSamplingRequest['modelPreferences'];
  } = {},
): MCPSamplingRequest {
  return {
    messages,
    systemPrompt: options.systemPrompt,
    temperature: options.temperature,
    maxTokens: options.maxTokens || 4096,
    modelPreferences: options.modelPreferences,
    includeContext: 'thisServer',
  };
}
