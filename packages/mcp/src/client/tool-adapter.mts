import { tool } from 'ai';
import { jsonSchema } from 'ai';
import type { McpToolDefinition } from './types.mjs';
import type { McpClientManager } from './manager.mjs';

/**
 * Converts MCP tool definitions into Vercel AI SDK tool definitions
 * that can be passed to generateText/streamText.
 */
export function mcpToolsToVercelTools(
  tools: McpToolDefinition[],
  clientManager: McpClientManager,
): Record<string, ReturnType<typeof tool>> {
  const result: Record<string, ReturnType<typeof tool>> = {};

  for (const mcpTool of tools) {
    // Prefix tool name with server name to avoid collisions
    const toolKey = `mcp_${mcpTool.serverName}_${mcpTool.name}`;

    result[toolKey] = tool({
      description: `[${mcpTool.serverName}] ${mcpTool.description}`,
      parameters: jsonSchema(mcpTool.inputSchema as any),
      execute: async (args: any) => {
        const result = await clientManager.callTool(mcpTool.serverName, mcpTool.name, args);

        // Extract text content from MCP result
        if (result.content && Array.isArray(result.content)) {
          return result.content
            .map((c: any) => {
              if (c.type === 'text') return c.text;
              if (c.type === 'image') return `[Image: ${c.mimeType}]`;
              return JSON.stringify(c);
            })
            .join('\n');
        }

        return JSON.stringify(result);
      },
    });
  }

  return result;
}
