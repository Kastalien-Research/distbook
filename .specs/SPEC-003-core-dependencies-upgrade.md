# SPEC-003: Core Dependencies Upgrade

> **Status**: Ready for Implementation
> **Priority**: P1
> **Estimated Effort**: 3-5 hours
> **Risk Level**: Medium
> **Dependencies**: SPEC-001 (Foundation & Build System)

## Overview

Upgrade core shared dependencies including Zod (schema validation), Drizzle ORM (database), and utility libraries. These form the foundation that other packages depend on.

## Objectives

1. Upgrade Zod from 3.23.8 to 4.x
2. Upgrade Drizzle ORM from 0.33.0 to 0.45.x
3. Upgrade drizzle-kit from 0.24.2 to 0.31.x
4. Upgrade better-sqlite3 from 11.3.0 to 12.x
5. Upgrade marked from 14.1.2 to 17.x
6. Upgrade ws from 8.17.0 to 8.19.x
7. Update pnpm-workspace.yaml catalog

## Requirements

### REQ-001: Zod 4 Upgrade
- **Description**: Upgrade Zod schema validation library to v4
- **Acceptance Criteria**:
  - [ ] pnpm-workspace.yaml catalog shows `zod: ^4.0.0`
  - [ ] All Zod schemas compile without errors
  - [ ] Runtime validation works correctly
  - [ ] No breaking changes in API contracts
- **Priority**: Must
- **Verification**: `pnpm build && pnpm test`

### REQ-002: Zod Migration Codemod
- **Description**: Apply zod-v3-to-v4 codemod if needed
- **Acceptance Criteria**:
  - [ ] Codemod run on all packages
  - [ ] Manual review of any flagged changes
  - [ ] `.transform()` and `.refine()` usage reviewed
- **Priority**: Should
- **Verification**: Search for deprecated Zod patterns

### REQ-003: Drizzle ORM Upgrade
- **Description**: Upgrade drizzle-orm to 0.45.x
- **Acceptance Criteria**:
  - [ ] drizzle-orm version is `^0.45.0`
  - [ ] All database queries work correctly
  - [ ] Migrations apply successfully
- **Priority**: Must
- **Verification**: `pnpm test` on API package

### REQ-004: Drizzle Kit Upgrade
- **Description**: Upgrade drizzle-kit and update migrations
- **Acceptance Criteria**:
  - [ ] drizzle-kit version is `^0.31.0`
  - [ ] `drizzle-kit generate` works
  - [ ] `drizzle-kit migrate` works
  - [ ] Migration folder structure updated via `drizzle-kit up`
- **Priority**: Must
- **Verification**: Generate and apply a test migration

### REQ-005: better-sqlite3 Upgrade
- **Description**: Upgrade SQLite driver to v12
- **Acceptance Criteria**:
  - [ ] better-sqlite3 version is `^12.0.0`
  - [ ] Database connections work
  - [ ] Native bindings compile correctly
- **Priority**: Must
- **Verification**: API tests pass

### REQ-006: Marked Upgrade
- **Description**: Upgrade markdown parser to v17
- **Acceptance Criteria**:
  - [ ] pnpm-workspace.yaml catalog shows `marked: ^17.0.0`
  - [ ] Markdown rendering works in UI
  - [ ] No XSS vulnerabilities introduced
- **Priority**: Must
- **Verification**: Manual markdown rendering test

### REQ-007: WebSocket Library Upgrade
- **Description**: Upgrade ws library to 8.19.x
- **Acceptance Criteria**:
  - [ ] pnpm-workspace.yaml catalog shows `ws: ^8.19.0`
  - [ ] WebSocket connections work
  - [ ] No breaking changes in ws API
- **Priority**: Must
- **Verification**: WebSocket functionality test

## Implementation Steps

### Step 1: Update pnpm-workspace.yaml Catalog

```yaml
catalog:
  zod: '^4.3.5'
  marked: '^17.0.1'
  ws: '^8.19.0'
  '@ai-sdk/anthropic': '^0.0.49'  # Keep for now, updated in SPEC-004
  '@ai-sdk/openai': '^0.0.58'     # Keep for now, updated in SPEC-004
```

### Step 2: Upgrade Zod

```bash
# The catalog update should handle this, but verify:
pnpm install

# Run community codemod (optional, may need manual review)
npx zod-v3-to-v4 ./packages
```

**Zod 4 Breaking Changes to Review:**
- `z.string().email()` error messages changed
- Some internal types renamed
- `.strip()` behavior changes

**Search for affected patterns:**
```bash
grep -r "\.strip()" packages/
grep -r "\.merge(" packages/
```

### Step 3: Upgrade Drizzle Stack

```bash
# Update Drizzle packages
pnpm update drizzle-orm@^0.45.0 drizzle-kit@^0.31.0 --filter api

# Update migration folder structure
cd packages/api
pnpm drizzle-kit up --dialect=sqlite

# Verify migrations work
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

### Step 4: Upgrade better-sqlite3

```bash
pnpm update better-sqlite3@^12.0.0 @types/better-sqlite3@latest --filter api

# Rebuild native bindings
pnpm rebuild better-sqlite3
```

### Step 5: Upgrade Marked

```bash
# Already in catalog, just verify
pnpm install

# Check for breaking changes in marked API
# v17 should be largely compatible with v14
```

### Step 6: Upgrade ws

```bash
# Already in catalog, just verify
pnpm install

# ws 8.17 → 8.19 is minor, should be safe
```

### Step 7: Type Check and Test

```bash
# Full type check
pnpm check-types

# Run all tests
pnpm test

# Test database operations specifically
pnpm --filter api test
```

### Step 8: Commit

```bash
git add -A
git commit -m "chore: upgrade core dependencies

- Zod 3.23.8 → 4.3.5
- drizzle-orm 0.33.0 → 0.45.x
- drizzle-kit 0.24.2 → 0.31.x
- better-sqlite3 11.3.0 → 12.x
- marked 14.1.2 → 17.x
- ws 8.17.0 → 8.19.x

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

## Files to Modify

| File | Changes |
|------|---------|
| `pnpm-workspace.yaml` | Update catalog versions |
| `packages/api/package.json` | Update drizzle-orm, drizzle-kit, better-sqlite3 |
| `packages/api/drizzle/` | Migration folder restructure |
| `packages/shared/package.json` | Verify zod version |
| Any files with deprecated Zod patterns | Apply codemod fixes |

## Zod 4 Migration Reference

### Common Changes

```typescript
// z.object().strict() behavior
// v3: throws on unknown keys
// v4: same, but better error messages

// z.string().email()
// v3: "Invalid email"
// v4: More descriptive error

// z.union() discriminated unions
// v4: Improved type inference
```

### Search for Potential Issues

```bash
# Find all Zod usage
grep -r "from 'zod'" packages/ --include="*.ts" --include="*.tsx"
grep -r 'from "zod"' packages/ --include="*.ts" --include="*.tsx"

# Find specific patterns that might need attention
grep -r "\.passthrough()" packages/
grep -r "\.catchall(" packages/
```

## Drizzle Migration Reference

### drizzle-kit up Changes
- `journal.json` removed
- Migrations now in individual folders
- Snapshot format updated

### Relations API (if using v2 relations)
```typescript
// v1
import { relations } from 'drizzle-orm';

// v2
import { relations } from "drizzle-orm/_relations";
```

## Rollback Plan

```bash
# Revert package changes
git checkout main -- pnpm-workspace.yaml packages/*/package.json

# Reinstall
pnpm install

# Revert migration folder changes
git checkout main -- packages/api/drizzle/
```

## Success Criteria

- [ ] All packages build without errors
- [ ] All tests pass
- [ ] Database operations work (CRUD, migrations)
- [ ] Zod schemas validate correctly
- [ ] Markdown rendering works
- [ ] WebSocket connections function

## Known Issues & Workarounds

### Issue: better-sqlite3 Native Build Fails
**Symptom**: `node-gyp` errors during install
**Workaround**:
```bash
# Ensure build tools are available
xcode-select --install  # macOS
# or
npm install -g node-gyp
pnpm rebuild better-sqlite3
```

### Issue: Drizzle Migration Conflicts
**Symptom**: Migration errors after folder restructure
**Workaround**:
```bash
# Reset migration state (development only!)
rm -rf packages/api/drizzle/meta
pnpm drizzle-kit generate
```

## Post-Implementation

After this spec is complete:
- SPEC-005 (Frontend Stack) can proceed (depends on Zod)
- Database layer is modernized
- Mark SPEC-003 as complete in state.json
