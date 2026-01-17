# 00-mcp-foundation Implementation TODOs

**Spec:** MCP Foundation
**Status:** In Progress
**Budget:** 15 units
**Iteration:** 1

---

## Tasks

### 1. Install MCP SDK Dependencies
- [ ] Add `@modelcontextprotocol/sdk` to `packages/api/package.json`
- [ ] Verify SDK version supports protocol 2025-11-25
- [ ] Run `pnpm install` to install dependencies

### 2. Create Shared MCP Types
- [ ] Create `packages/shared/src/types/mcp.mts` with core types
- [ ] Export MCP types from `packages/shared/src/types/index.mts`
- [ ] Create `packages/shared/src/types/mcp-websockets.mts` with WebSocket schemas
- [ ] Add Zod schemas for all MCP payloads

### 3. Database Schema - MCP Tables
- [ ] Create migration `0017_add_mcp_tables.sql` in `packages/api/drizzle/`
- [ ] Add `mcp_servers` table to schema.mts
- [ ] Add `mcp_tokens` table to schema.mts (for auth - GAP-001)
- [ ] Add `mcp_tool_invocations` table for auditing
- [ ] Add `mcp_resource_subscriptions` table
- [ ] Run migration and verify tables created

### 4. WebSocket Message Handlers Structure
- [ ] Create `packages/api/server/channels/mcp.mts` with MCP channel definition
- [ ] Define MCP topic patterns (`mcp:server`, `mcp:client:*`, etc.)
- [ ] Register MCP channel in WebSocket server
- [ ] Add placeholder event handlers for all MCP events

### 5. HTTP API Stubs
- [ ] Create `packages/api/server/routes/mcp.mts` for MCP endpoints
- [ ] Add stubs for `/mcp` (Streamable HTTP transport)
- [ ] Add stubs for `/api/mcp/servers` CRUD
- [ ] Add stubs for `/api/mcp/tools` and `/api/mcp/resources`
- [ ] Add stubs for `/api/mcp/tokens` (GAP-001)
- [ ] Register routes in `http.mts`

### 6. Package Structure Foundation
- [ ] Create `packages/api/mcp/` directory
- [ ] Create `packages/api/mcp/bridge.mts` (empty scaffold)
- [ ] Create `packages/api/mcp/server.mts` (empty scaffold)
- [ ] Create `packages/api/mcp/client.mts` (empty scaffold)
- [ ] Create `packages/api/mcp/config.mts` with configuration defaults

---

## Notes

- Keep changes minimal - this is foundation only
- Do not implement full tool handlers (that's spec 01)
- Do not implement full client logic (that's spec 02)
- Focus on infrastructure and interfaces
