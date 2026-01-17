# Package Upgrade Specifications - Implementation Manifest

**Session ID:** package-upgrades-2026-01-14
**Target:** `.specs/SPEC-001` through `SPEC-005`
**Validation Report:** `.spec-validator/validation-report.md`
**Budget:** 100 units
**Status:** Phase 3 - Implementation Planning

---

## Executive Summary

Orchestrated upgrade of the srcbook codebase from current package versions to latest:
- **TypeScript**: 5.6.2 → 5.9.x
- **Vite**: 5.4.4 → 7.x
- **ESLint**: 8.57.0 → 9.x (flat config)
- **AI SDK**: 3.4.33 → 6.x
- **React Router**: 6.26.2 → 7.x
- **Zod**: 3.23.8 → 4.x
- Plus 15+ additional dependencies

---

## Dependency Graph

```
                    ┌───────────────────────────────────────┐
                    │         SPEC-001: Foundation          │
                    │    TypeScript, Turbo, Vite, Vitest    │
                    │         [P0] CRITICAL PATH            │
                    │           Budget: 15                  │
                    │           Status: READY               │
                    └─────────────┬─────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   SPEC-002      │   │   SPEC-003      │   │   SPEC-004      │
│   ESLint 9      │   │  Core Deps      │   │   AI SDK v6     │
│   Flat Config   │   │  Zod, Drizzle   │   │   Streaming     │
│   [P1] BLOCKED  │   │  [P1] BLOCKED   │   │   [P0] BLOCKED  │
│   Budget: 15    │   │   Budget: 20    │   │   Budget: 25    │
└─────────────────┘   └────────┬────────┘   └────────┬────────┘
                               │                     │
                               └──────────┬──────────┘
                                          │
                                          ▼
                            ┌─────────────────────────┐
                            │       SPEC-005          │
                            │   Frontend Stack        │
                            │ React, Router, Tailwind │
                            │     [P2] BLOCKED        │
                            │      Budget: 25         │
                            └─────────────────────────┘
```

---

## Implementation Queue

| # | Spec ID | Name | Status | Priority | Budget | Dependencies | Requirements |
|---|---------|------|--------|----------|--------|--------------|--------------|
| 1 | SPEC-001 | Foundation & Build System | READY | P0 | 15 | - | 6 |
| 2 | SPEC-002 | ESLint Flat Config | BLOCKED | P1 | 15 | SPEC-001 | 5 |
| 3 | SPEC-003 | Core Dependencies | BLOCKED | P1 | 20 | SPEC-001 | 7 |
| 4 | SPEC-004 | AI SDK Migration | BLOCKED | P0 | 25 | SPEC-001 | 7 |
| 5 | SPEC-005 | Frontend Stack | BLOCKED | P2 | 25 | SPEC-003, SPEC-004 | 9 |

**Total Budget:** 100 units | **READY:** 1 | **BLOCKED:** 4

---

## Optimal Implementation Order (Topological)

### Wave 1: Foundation (No Dependencies)
```
SPEC-001: Foundation & Build System
├── TypeScript 5.6.2 → 5.9.x
├── Turbo 2.1.1 → 2.7.x
├── Vite 5.4.4 → 7.x (via 6.x)
├── Vitest 2.0.5 → 4.x
├── vite-node upgrade
└── @vitejs/plugin-react-swc upgrade
```

### Wave 2: Parallel After Foundation
Can run in parallel after SPEC-001 completes:

```
SPEC-002: ESLint Flat Config
├── ESLint 8.57.0 → 9.x
├── .eslintrc → eslint.config.js
├── @typescript-eslint → v8
└── Package-level configs

SPEC-003: Core Dependencies
├── Zod 3.23.8 → 4.x
├── drizzle-orm 0.33.0 → 0.45.x
├── drizzle-kit 0.24.2 → 0.31.x
├── better-sqlite3 11.3.0 → 12.x
├── marked 14.1.2 → 17.x
└── ws 8.17.0 → 8.19.x

SPEC-004: AI SDK Migration [HIGH RISK]
├── ai 3.4.33 → 6.x
├── @ai-sdk/anthropic 0.0.49 → 3.x
├── @ai-sdk/openai 0.0.58 → 3.x
├── @ai-sdk/google → 3.x
├── streamText API migration
├── Tool calling migration
└── Provider configuration updates
```

### Wave 3: Frontend (Depends on Wave 2)
```
SPEC-005: Frontend Stack [HIGH RISK]
├── React 19 compatibility check (decision point)
├── React Router 6.26.2 → 7.x
├── Tailwind CSS evaluation (decision point)
├── Radix UI upgrades
├── CodeMirror upgrades
└── Remaining UI dependencies
```

---

## Validation Report Summary

From `.spec-validator/validation-report.md`:

| Spec | Requirements | Validated | Gaps | Status |
|------|-------------|-----------|------|--------|
| SPEC-001 | 6 | 6 | 0 | ✅ PASS |
| SPEC-002 | 5 | 5 | 1 minor | ✅ PASS |
| SPEC-003 | 7 | 7 | 1 minor | ✅ PASS |
| SPEC-004 | 7 | 7 | 0 | ✅ PASS |
| SPEC-005 | 9 | 9 | 2 | ✅ PASS with notes |

### Key Gaps to Address

1. **SPEC-002**: ESLint config location - verify before starting
2. **SPEC-005**: Tailwind v4 scope - explicitly defer to separate PR

---

## Risk Assessment

| Spec | Risk | Mitigation |
|------|------|------------|
| SPEC-001 | Low-Medium | Incremental Vite upgrade (5→6→7) |
| SPEC-002 | Medium | Use FlatCompat for legacy plugins |
| SPEC-003 | Medium | Codemod for Zod, drizzle-kit up for migrations |
| SPEC-004 | **HIGH** | Create backups, run codemods, extensive testing |
| SPEC-005 | **HIGH** | React 19 decision point, defer Tailwind v4 |

---

## Pre-Implementation Checklist

### Before Starting SPEC-001
- [ ] Baseline tests: `pnpm test && pnpm build`
- [ ] Create upgrade branch: `git checkout -b upgrade/package-upgrades`
- [ ] Document current versions for rollback

### Before Starting SPEC-002
- [ ] Locate actual ESLint config: `find . -name ".eslintrc*" -o -name "eslint.config.*"`
- [ ] Verify ESLint plugins compatibility with v9

### Before Starting SPEC-003
- [ ] Verify Node.js version (Tailwind v4 requires Node 20+)
- [ ] Check for Zod patterns needing migration

### Before Starting SPEC-004
- [ ] Create backup: `.backup/ai-sdk/`
- [ ] Map all AI SDK usage in codebase
- [ ] Create test cases for streaming

### Before Starting SPEC-005
- [ ] Run React 19 compatibility audit
- [ ] Enable React Router future flags first
- [ ] Document Tailwind v4 decision

---

## Acceptance Criteria Per Spec

### SPEC-001: Foundation
- [ ] All packages build without errors
- [ ] All tests pass
- [ ] Development servers start correctly
- [ ] HMR works in web package

### SPEC-002: ESLint
- [ ] `pnpm lint` passes on all packages
- [ ] No `.eslintrc.*` files remain
- [ ] `eslint.config.js` at root
- [ ] VS Code integration works

### SPEC-003: Core Deps
- [ ] Database operations work
- [ ] Zod schemas validate correctly
- [ ] Markdown rendering works
- [ ] WebSocket connections function

### SPEC-004: AI SDK
- [ ] Text generation works (all providers)
- [ ] Text streaming works (all providers)
- [ ] Tool calling works
- [ ] No runtime errors in AI features

### SPEC-005: Frontend
- [ ] Application builds without errors
- [ ] All pages render correctly
- [ ] Navigation works
- [ ] All UI components function

---

## Progress Tracking

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0: Session Detection | ✅ COMPLETE | Fresh session for package upgrades |
| Phase 1: Discovery | ✅ COMPLETE | 5 specs inventoried |
| Phase 2: Dependencies | ✅ COMPLETE | Graph validated, no cycles |
| Phase 3: Planning | ✅ COMPLETE | Budget allocated |
| Phase 4: Implementation | ⏳ PENDING | Ready to begin |
| Phase 5: Integration | ⏳ PENDING | - |
| Phase 6: Completion | ⏳ PENDING | - |

---

*Manifest generated by /spec-orchestrator*
*Session: package-upgrades-2026-01-14*
