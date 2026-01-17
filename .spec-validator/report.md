# MCP Integration Specification Validation Report

**Generated:** 2026-01-13
**Validator:** /spec-validator
**Specs Validated:** 5 files in `.specs/`
**Overall Score:** **78/100** (Good - Minor Issues)

---

## Executive Summary

The MCP Integration specifications have been validated against the Srcbook codebase. The specs are **architecturally sound** and generally **implementable**, with some gaps and clarifications needed.

### Verdict: ✅ APPROVED WITH RECOMMENDATIONS

| Category | Score | Status |
|----------|-------|--------|
| Logical Consistency | 85/100 | ✓ Good |
| Architectural Alignment | 80/100 | ✓ Good |
| Security Coverage | 75/100 | ⚠ Minor Gaps |
| Implementation Feasibility | 72/100 | ⚠ Clarifications Needed |

---

## Phase 1: Requirement Extraction Summary

### Total Requirements Extracted

| Category | Count | Priority Distribution |
|----------|-------|----------------------|
| Functional (FR) | 72 | Must: 45, Should: 20, Could: 7 |
| Non-Functional (NFR) | 23 | Must: 15, Should: 8 |
| Security (SEC) | 32 | Must: 23, Should: 9 |
| User Stories (US) | 18 | Must: 10, Should: 6, Could: 2 |
| **Total** | **145** | **Must: 93, Should: 43, Could: 9** |

---

## Phase 2: Codebase Mapping

### Implementation Baseline Analysis

| Requirement Type | EXISTING | PARTIAL | NOVEL |
|------------------|----------|---------|-------|
| Notebook Operations | - | ✓ Session/cell APIs exist | New MCP wrapper |
| WebSocket Events | - | ✓ Rich event system exists | MCP message types |
| Database Schema | - | - | 3 new tables needed |
| HTTP Endpoints | - | ✓ REST API exists | 8 new MCP endpoints |
| Security Controls | - | ✓ Basic validation | New security layer |
| UI Components | - | ✓ React/Settings exist | MCP Server mgmt page |

### Existing Code Leverage

| Spec Requirement | Existing Code | Leverage Level |
|------------------|---------------|----------------|
| `notebook_create` | `createSrcbook()` in `srcbook/index.mjs` | HIGH |
| `notebook_list` | `listSessions()` in `session.mts` | HIGH |
| `cell_create` | `addCell()` in `session.mts` | HIGH |
| `cell_execute` | WebSocket `cell:exec` handler | HIGH |
| `deps_install` | WebSocket `deps:install` handler | HIGH |
| Database migrations | Drizzle ORM pattern in `drizzle/` | HIGH |
| WebSocket protocol | `ws.mts` topic/event pattern | HIGH |

---

## Phase 3: Validation Results

### THE LOGICIAN (Consistency Check)

| Check | Status | Details |
|-------|--------|---------|
| State machine completeness | ✓ Valid | Connection states (connecting, connected, disconnected, error) defined |
| Error state coverage | ⚠ Gap | Missing: What happens if tool fails mid-execution? |
| Invariant conflicts | ✓ Valid | No contradictions between specs |
| Cross-spec consistency | ✓ Valid | All cross-references resolve |

**Findings:**

1. **✓ VALID**: Session lifecycle is complete (create → modify → execute → delete)
2. **✓ VALID**: Resource subscription model is consistent with existing WebSocket patterns
3. **⚠ GAP**: FR-EX-002 says `cell_execute` "blocks until complete" but existing implementation streams output. Clarify: does MCP block or stream?

### THE ARCHITECT (Pattern Alignment)

| Check | Status | Details |
|-------|--------|---------|
| Package structure | ✓ Aligned | `packages/mcp-server`, `packages/mcp-client` fits monorepo |
| API patterns | ✓ Aligned | New endpoints follow `/api/` convention |
| Database patterns | ✓ Aligned | New tables use Drizzle ORM + SQLite |
| WebSocket patterns | ⚠ Review | MCP adds new message format, ensure compatibility |
| Naming conventions | ✓ Aligned | Uses camelCase for methods, PascalCase for types |

**Findings:**

1. **✓ ALIGNED**: Package structure matches existing `packages/api`, `packages/web`, `packages/shared`
2. **✓ ALIGNED**: Database migrations follow `drizzle/XXXX_*.sql` pattern
3. **⚠ CONTRADICTION**: Spec proposes `srcbook://` URI scheme but existing code uses filesystem paths. Need bridge logic.
4. **⚠ REVIEW**: WebSocket message format `[topic, event, payload]` is fixed. MCP needs to work within this or add parallel channel.

### THE SECURITY GUARDIAN (Risk Check)

| Check | Status | Details |
|-------|--------|---------|
| Auth on new endpoints | ⚠ Gap | No auth mechanism defined for MCP endpoints |
| PII handling | ✓ Valid | SEC-DP-002 requires sensitive data redaction |
| Injection prevention | ✓ Valid | SEC-IV-003 requires path traversal prevention |
| Tenant isolation | N/A | Single-user deployment assumed |

**Findings:**

1. **⚠ GAP**: SEC-AA-001 says "MCP clients identified" but no concrete auth mechanism specified
2. **⚠ GAP**: Origin validation (SEC-TS-003) conflicts with stdio transport (no HTTP headers)
3. **✓ VALID**: Rate limiting defined (SEC-AA-005)
4. **✓ VALID**: Human-in-the-loop for sensitive operations (SEC-AA-003)
5. **⚠ GAP**: No mention of CORS configuration for MCP HTTP endpoints

### THE IMPLEMENTER (Feasibility Check)

| Check | Status | Details |
|-------|--------|---------|
| Atomic requirements | ⚠ Vague | Some requirements need decomposition |
| Magic detection | ⚠ Found | "Auto-connect on startup" needs specifics |
| Dependencies available | ✓ Valid | `@modelcontextprotocol/sdk` is available |
| Complexity score | 7/10 | Moderate complexity, achievable |

**Findings:**

1. **⚠ MAGIC**: FR-CM-005 "Auto-connect on startup" - How? Config file? Database flag? Startup hook?
2. **⚠ MAGIC**: FR-TI-007 "Tools available via import" - How does `@srcbook/mcp` get injected into notebook runtime?
3. **⚠ VAGUE**: NFR-PF-001 "<100ms p95 latency" - Measured where? End-to-end? Server processing only?
4. **✓ CLEAR**: Database schema extensions are fully specified with SQL
5. **✓ CLEAR**: Tool schemas have complete JSON Schema definitions

---

## Phase 4: Gap Analysis

### Critical Gaps (Blockers)

| ID | Gap | Impact | Recommendation |
|----|-----|--------|----------------|
| GAP-001 | No authentication mechanism for MCP | Security risk | Define token-based or session-based auth |
| GAP-002 | WebSocket message format incompatibility | Integration risk | Define MCP↔WebSocket bridge protocol |

### Important Gaps (Should Fix)

| ID | Gap | Impact | Recommendation |
|----|-----|--------|----------------|
| GAP-003 | `@srcbook/mcp` injection mechanism unclear | Implementation blocker | Specify esbuild plugin or runtime injection |
| GAP-004 | CORS configuration missing | Browser security | Add CORS headers spec for `/mcp` endpoints |
| GAP-005 | Streaming vs blocking execution unclear | Protocol mismatch | Clarify: MCP tool returns promise, then streams? |
| GAP-006 | stdio transport lacks origin validation | Security gap | Define process-level authentication |

### Minor Gaps (Nice to Have)

| ID | Gap | Impact | Recommendation |
|----|-----|--------|----------------|
| GAP-007 | No MCP session persistence across restarts | UX | Add session recovery mechanism |
| GAP-008 | No circuit breaker for external servers | Reliability | Add connection failure handling |
| GAP-009 | Missing metrics/telemetry for MCP ops | Observability | Define PostHog events for MCP |

---

## Traceability Matrix

### 00-mcp-foundation.md

| Requirement | Status | Baseline | Conflicts | Suggested Change |
|-------------|--------|----------|-----------|------------------|
| FR-001 Server starts | ✓ Valid | None | None | N/A |
| FR-002 Client connects | ✓ Valid | None | None | N/A |
| FR-003 Registry updates | ✓ Valid | None | None | N/A |
| FR-004 Package structure | ✓ Valid | `packages/` pattern | None | N/A |
| FR-005 DB migrations | ✓ Valid | `drizzle/` pattern | None | N/A |
| NFR-001 Startup <500ms | ⚠ Review | Need baseline | None | Add measurement method |
| NFR-002 No breaking changes | ✓ Valid | All existing APIs | None | N/A |
| NFR-003 Strict TypeScript | ✓ Valid | Project uses strict | None | N/A |
| NFR-004 SDK pinned | ✓ Valid | npm best practice | None | N/A |

### 01-mcp-server.md

| Requirement | Status | Baseline | Conflicts | Suggested Change |
|-------------|--------|----------|-----------|------------------|
| FR-SL-001 Server starts | ✓ Valid | `dev-server.mts` | None | N/A |
| FR-SL-002 HTTP transport | ✓ Valid | Express patterns | None | N/A |
| FR-NB-001 notebook_create | ✓ Valid | `createSrcbook()` | None | Wrap existing |
| FR-NB-002 notebook_list | ✓ Valid | `listSessions()` | None | Wrap existing |
| FR-CE-001 cell_create | ✓ Valid | `addCell()` | None | Wrap existing |
| FR-EX-001 cell_execute | ⚠ Review | `cell:exec` WS | Async vs sync | Clarify blocking behavior |
| FR-RS-001-006 Resources | ✓ Valid | Session data | URI scheme | Bridge `srcbook://` to paths |

### 02-mcp-client.md

| Requirement | Status | Baseline | Conflicts | Suggested Change |
|-------------|--------|----------|-----------|------------------|
| FR-CM-001 Add via UI | ✓ Valid | Settings page exists | None | Add MCP section |
| FR-TI-007 Tools via import | ⚠ Magic | None | Runtime injection | Specify injection mechanism |
| FR-SA-001-005 Sampling | ⚠ Gap | AI integration | Fallback logic | Clarify priority order |

### 03-mcp-security.md

| Requirement | Status | Baseline | Conflicts | Suggested Change |
|-------------|--------|----------|-----------|------------------|
| SEC-TS-001 TLS | ✓ Valid | None | None | N/A |
| SEC-TS-003 Origin validation | ⚠ Conflict | stdio has no origin | Transport-specific | Split by transport type |
| SEC-AA-001 Client ID | ⚠ Gap | No auth exists | None | Define auth mechanism |
| SEC-IV-001-005 Input validation | ✓ Valid | Zod schemas exist | None | Extend patterns |

---

## Recommendations

### Must Fix Before Implementation

1. **Define MCP Authentication** (GAP-001)
   ```markdown
   ## Proposed Addition to 03-mcp-security.md

   ### Authentication Mechanism

   **HTTP Transport:**
   - Bearer token in Authorization header
   - Token generated on first connection, stored in DB
   - Configurable token expiry (default: 24h)

   **stdio Transport:**
   - Process spawned by Srcbook is implicitly trusted
   - No additional auth needed for local processes
   ```

2. **Define WebSocket↔MCP Bridge** (GAP-002)
   ```markdown
   ## Proposed Addition to 00-mcp-foundation.md

   ### MCP WebSocket Integration

   MCP messages use existing WebSocket infrastructure:

   Topic: `mcp:<clientId>`
   Events:
   - `mcp:tool:invoke` → Invoke tool
   - `mcp:tool:result` → Tool result
   - `mcp:resource:read` → Read resource
   - `mcp:resource:content` → Resource content
   ```

3. **Specify Runtime Injection** (GAP-003)
   ```markdown
   ## Proposed Addition to 02-mcp-client.md

   ### `@srcbook/mcp` Module Injection

   The `@srcbook/mcp` module is injected at build time:

   1. During cell execution, esbuild adds:
      ```typescript
      import { mcpTools, mcpResources } from '@srcbook/mcp-runtime';
      ```
   2. The runtime module communicates via WebSocket to main process
   3. Main process routes to appropriate MCP client connections
   ```

### Should Fix

4. **Add CORS Configuration** (GAP-004)
   ```markdown
   Add to 01-mcp-server.md § API Design:

   ### CORS Configuration

   The `/mcp` endpoint allows:
   - Origin: Configurable allowlist (default: localhost only)
   - Methods: GET, POST, DELETE, OPTIONS
   - Headers: Authorization, Content-Type
   ```

5. **Clarify Execution Model** (GAP-005)
   ```markdown
   Clarify in 01-mcp-server.md FR-EX-001:

   `cell_execute` returns a Promise that resolves when execution completes.
   During execution, stdout/stderr are collected and returned in the final response.
   Streaming is NOT exposed via MCP tools (use resource subscriptions instead).
   ```

### Nice to Have

6. **Add Circuit Breaker Pattern** (GAP-008)
7. **Add PostHog Events for MCP** (GAP-009)
8. **Add Session Recovery** (GAP-007)

---

## Quality Gates Summary

| Phase | Gate | Status | Action Needed |
|-------|------|--------|---------------|
| 1. Extraction | All requirements identified | ✅ Pass | None |
| 2. Mapping | Abstractions identified | ✅ Pass | None |
| 3. Validation | Logic/Arch/Security check | ⚠ Partial | Fix GAP-001, GAP-002 |
| 4. Gaps | Edge cases identified | ✅ Pass | Recommendations provided |
| 5. Reporting | Report generated | ✅ Pass | This document |

---

## Appendix A: Files Analyzed

| File | Lines | Key Patterns |
|------|-------|--------------|
| `packages/api/session.mts` | 418 | Session CRUD, cell operations |
| `packages/api/server/http.mts` | 836 | REST API endpoints |
| `packages/api/server/ws.mts` | 896 | WebSocket handling |
| `packages/api/db/schema.mts` | 67 | Database schema (Drizzle) |
| `packages/shared/src/types/websockets.mts` | 116 | WebSocket types |

## Appendix B: Requirement IDs

Full list of validated requirements available in `.spec-validator/requirements.json`

---

## Conclusion

The MCP Integration specifications are **well-designed** and **architecturally aligned** with the Srcbook codebase. The main gaps are:

1. **Authentication mechanism** - Must be defined before implementation
2. **WebSocket bridge protocol** - Must be specified for integration
3. **Runtime injection** - Must be clarified for client-side functionality

With the recommended fixes, the specs will be **ready for implementation**.

**Recommendation:** Address GAP-001 and GAP-002 before starting Phase 1 implementation.

---

*Report generated by /spec-validator workflow*
