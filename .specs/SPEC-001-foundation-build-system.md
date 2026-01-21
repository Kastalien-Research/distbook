# SPEC-001: Foundation & Build System Upgrade

> **Status**: Ready for Implementation
> **Priority**: P0 (Critical Path)
> **Estimated Effort**: 2-4 hours
> **Risk Level**: Low-Medium
> **Dependencies**: None

## Overview

Upgrade the foundational tooling (TypeScript, Turbo) and build system (Vite, Vitest) to their latest versions. This spec must be completed first as all other specs depend on a working build system.

## Objectives

1. Update TypeScript from 5.6.2 to 5.9.x
2. Update Turbo from 2.1.1 to 2.7.x
3. Update Vite from 5.4.4 to 7.x (via 6.x)
4. Update Vitest from 2.0.5 to 4.x
5. Update related build tooling (vite-node, @vitejs/plugin-react-swc)

## Requirements

### REQ-001: TypeScript Upgrade
- **Description**: Update TypeScript to latest 5.9.x version
- **Acceptance Criteria**:
  - [ ] `typescript` version in root package.json is `^5.9.0` or higher
  - [ ] `pnpm build` completes without TypeScript errors
  - [ ] `pnpm check-types` passes in all packages
- **Priority**: Must
- **Verification**: `tsc --version && pnpm build`

### REQ-002: Turbo Upgrade
- **Description**: Update Turborepo to latest 2.7.x version
- **Acceptance Criteria**:
  - [ ] `turbo` version in root package.json is `^2.7.0` or higher
  - [ ] All turbo commands work: `turbo dev`, `turbo build`, `turbo test`
  - [ ] Build caching still functions correctly
- **Priority**: Must
- **Verification**: `turbo --version && pnpm build`

### REQ-003: Vite Upgrade (Incremental)
- **Description**: Upgrade Vite through major versions: 5.4 → 6.x → 7.x
- **Acceptance Criteria**:
  - [ ] Vite version is `^7.0.0` or higher in packages/api and packages/web
  - [ ] Development server starts without errors
  - [ ] Hot Module Replacement (HMR) functions correctly
  - [ ] Production build completes successfully
- **Priority**: Must
- **Verification**: `pnpm dev` (both api and web), `pnpm build`
- **Notes**:
  - If Vite 7 causes issues, fallback to stable 6.x is acceptable
  - Check vite.config.ts for deprecated options

### REQ-004: Vitest Upgrade
- **Description**: Update Vitest to version 4.x (aligned with Vite)
- **Acceptance Criteria**:
  - [ ] `vitest` version is `^4.0.0` or higher
  - [ ] `pnpm test` passes all existing tests
  - [ ] Test coverage reporting still works
- **Priority**: Must
- **Verification**: `pnpm test`

### REQ-005: vite-node Upgrade
- **Description**: Update vite-node for API development server
- **Acceptance Criteria**:
  - [ ] vite-node version matches Vitest major version
  - [ ] `pnpm --filter api dev` starts without errors
- **Priority**: Must
- **Verification**: `pnpm --filter api dev`

### REQ-006: React SWC Plugin Upgrade
- **Description**: Update @vitejs/plugin-react-swc to latest compatible version
- **Acceptance Criteria**:
  - [ ] Plugin version compatible with Vite 7
  - [ ] React Fast Refresh works in development
- **Priority**: Must
- **Verification**: Modify a React component and verify HMR

## Implementation Steps

### Step 1: Create Upgrade Branch
```bash
git checkout -b upgrade/foundation-build-system
```

### Step 2: Update TypeScript and Turbo
```bash
# Update root package.json
pnpm update typescript@^5.9.0 turbo@^2.7.0

# Verify
pnpm build
```

### Step 3: Update Vite Ecosystem (Incremental)
```bash
# First to Vite 6 (safer intermediate step)
pnpm update vite@^6.0.0 vitest@^3.0.0 vite-node@^3.0.0 --filter api --filter web

# Test everything works
pnpm build && pnpm test && pnpm dev

# If stable, proceed to Vite 7
pnpm update vite@^7.0.0 vitest@^4.0.0 vite-node@^4.0.0 --filter api --filter web
pnpm update @vitejs/plugin-react-swc@latest --filter web
```

### Step 4: Check for Deprecated APIs
Review and update if needed:
- `packages/api/vite.config.ts`
- `packages/web/vite.config.ts`

Common changes:
- `server.middlewareMode: 'ssr'` → `server.middlewareMode: true`
- Check `build.rollupOptions` for deprecated options

### Step 5: Validate
```bash
pnpm build
pnpm test
pnpm dev  # Test both api and web
```

### Step 6: Commit
```bash
git add -A
git commit -m "chore: upgrade foundation build system

- TypeScript 5.6.2 → 5.9.x
- Turbo 2.1.1 → 2.7.x
- Vite 5.4.4 → 7.x
- Vitest 2.0.5 → 4.x
- vite-node → 4.x
- @vitejs/plugin-react-swc → latest

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

## Files to Modify

| File | Changes |
|------|---------|
| `package.json` | Update typescript, turbo versions |
| `packages/api/package.json` | Update vite, vitest, vite-node |
| `packages/web/package.json` | Update vite, @vitejs/plugin-react-swc |
| `packages/api/vite.config.ts` | Fix any deprecated options |
| `packages/web/vite.config.ts` | Fix any deprecated options |

## Rollback Plan

If upgrade fails:
```bash
git checkout main -- package.json packages/*/package.json
pnpm install
```

## Success Criteria

- [ ] All packages build without errors
- [ ] All tests pass
- [ ] Development servers start correctly
- [ ] HMR works in web package
- [ ] No TypeScript errors in any package

## Known Issues & Workarounds

### Issue: Vite 7 Environment API Changes
**Symptom**: Plugin errors about `this.environment`
**Workaround**: Check if plugins need updates or use `ssr` option fallback

### Issue: Vitest Config Changes
**Symptom**: Test configuration errors
**Workaround**: Review vitest.config.ts for deprecated options

## Post-Implementation

After this spec is complete:
- SPEC-002 (ESLint), SPEC-003 (Core Deps), and SPEC-004 (AI SDK) can proceed in parallel
- Update `.spec-designer/state.json` to mark SPEC-001 as complete
