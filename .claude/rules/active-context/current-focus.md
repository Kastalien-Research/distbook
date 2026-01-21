# Current Focus

> **Last Updated**: 2026-01-14
> **Status**: Package Upgrades In Progress

## What We're Working On Now

### Primary Focus: Package Upgrades

**Goal**: Complete package upgrade specs (SPEC-001 through SPEC-005)

**Status**:
- [x] **SPEC-001**: Foundation & Build System ✅
  - TypeScript 5.6.2 → 5.9.3
  - Turbo 2.1.1 → 2.7.4
  - Vite 5.4.4 → 7.3.1
  - Vitest 2.0.5 → 4.x
  - @types/node 20.14.2 → 20.19.29
- [ ] **SPEC-003**: Core Dependencies (Zod v4) - NEXT (fixes 121 MCP TS errors)
- [ ] **SPEC-002**: ESLint Flat Config Migration
- [ ] **SPEC-004**: AI SDK Migration
- [ ] **SPEC-005**: Frontend Stack Upgrade

**Blockers Fixed**:
- [x] Orchestrator session overwriting bug
- [x] Memory hooks not wired up
- [x] LangSmith tracing hook not registered

**Files Modified This Session**:
- `package.json` - TypeScript, Turbo versions
- `packages/web/package.json` - Vite, plugin-react-swc versions
- `packages/api/package.json` - Vite, vitest, vite-node versions
- `packages/api/vitest.config.mts` - Fixed poolOptions for vitest 4.x
- `.claude/commands/workflows/spec-orchestrator.md` - Session management
- `.claude/settings.local.json` - Memory hooks + Stop hook

### Background Context

Was attempting to run `/spec-orchestrator` for package upgrades (SPEC-001 through SPEC-005) when discovered:

1. **Session Overwriting**: Each orchestrator run destroys previous session state
2. **Missing Tracing**: No Langsmith traces for orchestrator runs
3. **MCP Implementation Broken**: 121 TypeScript errors in code that was supposedly "completed"

## Active Questions / Challenges

1. **Why no Langsmith traces?**
   - Current: No traces visible
   - Exploring: Configuration issue? Integration not set up?
   - Challenge: Can't audit what happened in previous orchestrations

2. **What state is MCP implementation actually in?**
   - Orchestrator reported "complete"
   - Reality: 63 errors in production code, 58 in tests
   - Challenge: State was overwritten, can't verify what was checked

## Recent Decisions

### 2026-01-14: Pause Package Upgrades
**Decision**: Fix tooling infrastructure before proceeding
**Rationale**:
- Can't trust orchestrator results without proper session management
- Need observability into what orchestrator is doing
- MCP errors need resolution regardless

## What NOT to Focus On Right Now

- [ ] Package upgrades - blocked until tooling fixed
- [ ] Educational srcbooks - already complete (verified)

## Next Steps

1. [ ] Fix orchestrator session management
2. [ ] Debug Langsmith tracing
3. [ ] Assess MCP implementation state
4. [ ] Create recovery plan for MCP
5. [ ] Resume package upgrades with fixed tooling

---

**Created**: 2026-01-14
**Context**: Discovered during package upgrade orchestration attempt
