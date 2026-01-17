/**
 * MCP Integration Module
 *
 * Provides Model Context Protocol integration for Srcbook:
 * - Server Mode: Srcbook acts as an MCP provider, exposing notebook tools to external clients
 * - Client Mode: Srcbook consumes external MCP servers, making their tools available in notebooks
 *
 * @see https://modelcontextprotocol.io/
 */

// Server mode exports
export * from './server/index.mjs';

// Client mode exports
export * from './client/index.mjs';

// Registry exports
export * from './registry/index.mjs';

// Security exports
export * from './security/index.mjs';
