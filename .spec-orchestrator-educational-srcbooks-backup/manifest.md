# Educational Srcbooks - Implementation Manifest

**Session ID:** educational-srcbooks-2026-01-14
**Target:** `.specs/educational-srcbooks/`
**Output:** `packages/api/srcbook/examples/internals/`
**Budget:** 100 units
**Validation Report:** `.spec-validator/educational-srcbooks-report.md`

---

## Dependency Graph

```
                    Foundation (existing)
                    ├── srcmd-format.src.md [DONE]
                    ├── cell-types.src.md [DONE]
                    └── session-management.src.md [DONE]
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 01-cell-exec    │  │ 03-websocket    │  │ 11-app-builder  │
│ [P0] READY      │  │ [P1] READY      │  │ [P2] READY      │
│ Budget: 8       │  │ Budget: 8       │  │ Budget: 9       │
└────────┬────────┘  └────────┬────────┘  └─────────────────┘
         │                    │
    ┌────┼────────┐      ┌────┴────┐
    │    │        │      │         │
    ▼    ▼        ▼      ▼         ▼
┌──────┐┌──────┐┌──────┐┌──────┐┌──────┐
│02-pro││05-ts ││08-ai ││04-ch ││13-mcp│
│[P0]  ││[P1]  ││[P1]  ││[P1]  ││[P2]  │
│Bgt:8 ││Bgt:10││Bgt:8 ││Bgt:6 ││Bgt:8 │
└──┬───┘└──┬───┘└──┬───┘└──────┘└──────┘
   │       │       │
   │       ▼       ▼
   │    ┌──────┐┌──────┐
   │    │06-dia││09-gen│
   │    │[P1]  ││[P1]  │
   │    │Bgt:7 ││Bgt:8 │
   │    └──┬───┘└──┬───┘
   │       │       │
   │       ▼       │
   │    ┌──────┐   │
   │    │07-ac │◄──┘
   │    │[P2]  │
   │    │Bgt:7 │
   │    └──┬───┘
   │       │
   │       ▼
   │    ┌──────┐
   └───►│10-fix│
        │[P2]  │
        │Bgt:7 │
        └──────┘

┌─────────────────┐
│ 12-database     │
│ [P2] READY      │
│ Budget: 6       │
└─────────────────┘
```

---

## Implementation Queue

| # | Spec | Status | Priority | Budget | Dependencies | Output File |
|---|------|--------|----------|--------|--------------|-------------|
| 1 | 01-cell-execution | READY | P0 | 8 | - | cell-execution.src.md |
| 2 | 03-websocket-protocol | READY | P1 | 8 | - | websocket-protocol.src.md |
| 3 | 11-app-builder | READY | P2 | 9 | - | app-builder.src.md |
| 4 | 12-database-layer | READY | P2 | 6 | - | database-layer.src.md |
| 5 | 02-process-management | BLOCKED | P0 | 8 | 01 | process-management.src.md |
| 6 | 05-typescript-server | BLOCKED | P1 | 10 | 01 | typescript-server.src.md |
| 7 | 08-ai-integration | BLOCKED | P1 | 8 | 01 | ai-integration.src.md |
| 8 | 04-channels-topics | BLOCKED | P1 | 6 | 03 | channels-topics.src.md |
| 9 | 13-mcp-integration | BLOCKED | P2 | 8 | 03 | mcp-integration.src.md |
| 10 | 06-typescript-diagnostics | BLOCKED | P1 | 7 | 05 | typescript-diagnostics.src.md |
| 11 | 09-code-generation | BLOCKED | P1 | 8 | 08 | code-generation.src.md |
| 12 | 07-typescript-autocomplete | BLOCKED | P2 | 7 | 06 | typescript-autocomplete.src.md |
| 13 | 10-ai-diagnostics-fixing | BLOCKED | P2 | 7 | 06, 09 | ai-diagnostics-fixing.src.md |

**Total Budget:** 100 units | **READY:** 4 | **BLOCKED:** 9

---

## Optimal Implementation Order (Topological)

**Wave 1 (Parallel - No Dependencies):**
1. 01-cell-execution (P0)
2. 03-websocket-protocol (P1)
3. 11-app-builder (P2)
4. 12-database-layer (P2)

**Wave 2 (Depends on Wave 1):**
5. 02-process-management (depends: 01)
6. 05-typescript-server (depends: 01)
7. 08-ai-integration (depends: 01)
8. 04-channels-topics (depends: 03)
9. 13-mcp-integration (depends: 03)

**Wave 3 (Depends on Wave 2):**
10. 06-typescript-diagnostics (depends: 05)
11. 09-code-generation (depends: 08)

**Wave 4 (Depends on Wave 3):**
12. 07-typescript-autocomplete (depends: 06)

**Wave 5 (Depends on Multiple Wave 3 Items):**
13. 10-ai-diagnostics-fixing (depends: 06, 09)

---

## Pre-Implementation Fixes (Per Validation Report)

### High Priority (Done before Wave 1)
- [ ] Add security notes to 01-cell-execution spec
- [ ] Update 08-ai-integration spec with all 6 providers

### Medium Priority (Done during implementation)
- [ ] Add git integration to 11-app-builder
- [ ] Expand MCP security section in 13-mcp-integration

---

## Progress Tracking

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Discovery | COMPLETE | 13 specs inventoried |
| Phase 2: Dependencies | COMPLETE | Graph validated, no cycles |
| Phase 3: Planning | COMPLETE | Budget allocated |
| Phase 4: Implementation | PENDING | 4 READY specs |
| Phase 5: Integration | PENDING | - |
| Phase 6: Completion | PENDING | - |

---

## Acceptance Criteria (Per Srcbook)

Each generated srcbook must:
- [ ] All code cells execute successfully (mock data OK)
- [ ] Source references are accurate and linked
- [ ] Cross-references to related Srcbooks work
- [ ] Learning objectives are addressed
- [ ] Interactive exercises are achievable
- [ ] ASCII diagrams render correctly
- [ ] Follow srcbook format conventions

---

*Manifest generated by spec-orchestrator workflow*
