# Orchestrator Session Overwrite Bug

> **Purpose**: Critical bug discovered - spec-orchestrator overwrites previous sessions

## 2026-01-14: Session State Lost Due to Overwriting 🔥

- **Issue**: The `/spec-orchestrator` workflow uses a single `.spec-orchestrator/` directory. Each new orchestration session overwrites the previous one, destroying state and making it impossible to:
  - Resume previous sessions
  - Audit what happened in past orchestrations
  - Track multiple parallel orchestrations
  - Verify that previous sessions actually completed successfully

- **Discovery Context**:
  - MCP implementation was orchestrated → appeared to complete successfully
  - Educational srcbooks session ran → overwrote `.spec-orchestrator/` directory
  - Package upgrades session started → discovered MCP code has 121 TypeScript errors
  - No way to verify what the MCP orchestrator actually did because state was destroyed

- **Root Cause**:
  - `.spec-orchestrator/` is a fixed directory path
  - No session-specific subdirectories
  - No archiving of completed sessions

- **Solution Required**:
  ```
  Before (broken):
  .spec-orchestrator/
  └── state.json  ← Overwritten each session

  After (fixed):
  .spec-orchestrator/
  ├── sessions/
  │   ├── mcp-implementation-2026-01-13/
  │   │   └── state.json
  │   ├── educational-srcbooks-2026-01-14/
  │   │   └── state.json
  │   └── package-upgrades-2026-01-14/
  │       └── state.json
  └── active-session.json  ← Points to current
  ```

- **Files to Fix**:
  - `.claude/skills/workflows/spec-orchestrator.md` - Update to use session-specific directories

- **Pattern**: Stateful workflows MUST use session-specific storage to prevent data loss

- **Impact**: HIGH - Lost ability to verify MCP implementation, audit trail destroyed

- **Related Issues**:
  - No Langsmith tracing observed - cannot audit what orchestrator did
  - Verification gates may not be running properly

---

**Created**: 2026-01-14
**Status**: ✅ Fixed - session-specific directories implemented
**Fixed**: 2026-01-14 - Updated `.claude/commands/workflows/spec-orchestrator.md`
**Applicability**: All spec-orchestrator usage
