/**
 * MCP Integration Module
 *
 * Provides Model Context Protocol integration for Srcbook:
 * - Server Mode: Srcbook acts as an MCP provider, exposing notebook tools to external clients
 * - Client Mode: Srcbook consumes external MCP servers, making their tools available in notebooks
 *
 * @see https://modelcontextprotocol.io/
 */

// Server mode exports (namespaced to avoid conflicts with client)
export * as MCPServer from './server/index.mjs';

// Client mode exports (namespaced to avoid conflicts with server)
export * as MCPClient from './client/index.mjs';

// Registry exports (unified view of both client and server capabilities)
export * from './registry/index.mjs';

// Security exports
export * from './security/index.mjs';
