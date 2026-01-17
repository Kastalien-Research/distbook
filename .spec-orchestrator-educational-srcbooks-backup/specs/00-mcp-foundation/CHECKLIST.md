# 00-mcp-foundation Verification Checklist

**Spec:** MCP Foundation
**Confidence Threshold:** 90%

---

## Compilation & Build

- [ ] `pnpm install` completes without errors
- [ ] `pnpm build` completes for all packages
- [ ] No TypeScript errors in new files
- [ ] No TypeScript errors in modified files

## Dependencies

- [ ] `@modelcontextprotocol/sdk` installed in packages/api
- [ ] SDK version is pinned (not ^)
- [ ] No peer dependency warnings

## Type Definitions

- [ ] `MCPServerConfig` type defined and exported
- [ ] `MCPToolInvokePayload` schema defined
- [ ] `MCPResourceReadPayload` schema defined
- [ ] `MCPToolResultPayload` schema defined
- [ ] `MCPApprovalRequestPayload` schema defined
- [ ] All schemas use Zod for validation
- [ ] Types exported from packages/shared index

## Database

- [ ] Migration file `0017_add_mcp_tables.sql` exists
- [ ] `mcp_servers` table defined in schema
- [ ] `mcp_tokens` table defined in schema
- [ ] `mcp_tool_invocations` table defined in schema
- [ ] `mcp_resource_subscriptions` table defined in schema
- [ ] Migration runs without errors
- [ ] Database indexes created

## WebSocket Integration

- [ ] MCP channel created in `channels/mcp.mts`
- [ ] Topic pattern `mcp:*` registered
- [ ] Event handlers skeleton for server events
- [ ] Event handlers skeleton for client events
- [ ] Event handlers skeleton for registry events
- [ ] Channel registered in WebSocket server

## HTTP Endpoints

- [ ] Routes file created at `routes/mcp.mts`
- [ ] `/mcp` POST endpoint stub exists
- [ ] `/mcp` GET endpoint stub exists
- [ ] `/api/mcp/servers` CRUD stubs exist
- [ ] `/api/mcp/tokens` CRUD stubs exist
- [ ] `/api/mcp/tools` endpoints stub exists
- [ ] `/api/mcp/resources` endpoints stub exists
- [ ] Routes registered in http.mts

## Package Structure

- [ ] `packages/api/mcp/` directory created
- [ ] `packages/api/mcp/bridge.mts` exists
- [ ] `packages/api/mcp/server.mts` exists
- [ ] `packages/api/mcp/client.mts` exists
- [ ] `packages/api/mcp/config.mts` exists

## Existing Code Compatibility

- [ ] Existing tests still pass
- [ ] No regressions in WebSocket functionality
- [ ] No regressions in HTTP API
- [ ] Application still starts correctly

---

## Acceptance Criteria Status

| ID | Requirement | Status |
|----|-------------|--------|
| FR-001 | MCP server starts with Srcbook | Pending (stub only) |
| FR-002 | MCP client can connect to external servers | Pending (stub only) |
| FR-003 | Capability registry updates on connection | Pending (stub only) |
| FR-004 | Package structure follows spec | To verify |
| FR-005 | Database migrations apply cleanly | To verify |
| NFR-001 | Startup overhead <500ms | To verify |
| NFR-002 | No breaking changes to existing API | To verify |
| NFR-003 | TypeScript strict mode compliance | To verify |
| NFR-004 | SDK version pinned | To verify |

---

## Completion Score

**Completed:** 0 / 35 items
**Percentage:** 0%
**Threshold:** 90% (32 items)
