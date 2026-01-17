# Srcbook Package Upgrade Strategy

> **Generated**: 2026-01-14
> **Project**: srcbook-monorepo
> **Scope**: Update all packages to latest versions (~1 year of updates)

## Executive Summary

This project requires updating 12+ packages with **major version jumps**, including critical changes to the AI SDK, React, Tailwind CSS, Vite, and ESLint. The recommended approach is a **phased upgrade** over 9 phases, with validation checkpoints after each phase.

**Estimated total effort**: 26-50 hours
**Risk level**: Medium-High (due to AI SDK and potential React 19 compatibility)

---

## Current vs Target Versions

| Package | Current | Target | Jump Type | Risk |
|---------|---------|--------|-----------|------|
| ai | ^3.4.33 | 6.0.33 | MAJOR | HIGH |
| @ai-sdk/anthropic | ^0.0.49 | 3.0.12 | MAJOR | HIGH |
| @ai-sdk/openai | ^0.0.58 | 3.0.9 | MAJOR | HIGH |
| @ai-sdk/google | ^1.0.3 | 3.0.7 | MAJOR | HIGH |
| vite | ^5.4.4 | 7.3.1 | MAJOR | MEDIUM |
| react | ^18.3.1 | 19.2.3 | MAJOR | HIGH |
| tailwindcss | ^3.4.11 | 4.1.18 | MAJOR | HIGH |
| zod | ^3.23.8 | 4.3.5 | MAJOR | MEDIUM |
| eslint | ^8.57.0 | 9.39.2 | MAJOR | MEDIUM |
| react-router-dom | ^6.26.2 | 7.12.0 | MAJOR | MEDIUM |
| express | ^4.20.0 | 5.2.1 | MAJOR | MEDIUM |
| vitest | ^2.0.5 | 4.0.17 | MAJOR | LOW |
| drizzle-orm | ^0.33.0 | 0.45.1 | MINOR | LOW |
| drizzle-kit | ^0.24.2 | 0.31.8 | MINOR | LOW |
| typescript | 5.6.2 | 5.9.3 | MINOR | LOW |
| turbo | ^2.1.1 | 2.7.4 | MINOR | LOW |

---

## Phased Upgrade Plan

### PHASE 1: Foundation Layer (Low Risk)
**Goal**: Update tooling that doesn't affect runtime behavior
**Estimated effort**: 1 hour

1. TypeScript 5.6.2 → 5.9.3
2. Turbo 2.1.1 → 2.7.4
3. Prettier → latest 3.x

**Validation**: `pnpm build && pnpm lint`

---

### PHASE 2: Build System (Medium Risk)
**Goal**: Update build and dev tooling
**Estimated effort**: 2-4 hours

1. Vite 5.4.4 → 6.x → 7.x (incremental)
2. Vitest 2.0.5 → 4.0.17
3. vite-node → latest
4. @vitejs/plugin-react-swc → latest

**Breaking Changes**:
- `this.environment` in Vite plugin hooks
- `transformWithEsbuild` deprecated → use `transformWithOxc`

**Validation**: `pnpm build && pnpm test && pnpm dev`

---

### PHASE 3: ESLint Migration (Medium Risk)
**Goal**: Migrate to ESLint 9 flat config
**Estimated effort**: 2-4 hours

1. ESLint 8.57.0 → 9.x
2. Create `eslint.config.js` (flat config)
3. Update all ESLint plugins
4. Update @srcbook/configs package

**Breaking Changes**:
- `.eslintrc` format no longer supported
- Use `@eslint/js` for recommended configs
- Use `FlatCompat` for legacy plugin support

```javascript
// New eslint.config.js format
import js from "@eslint/js";
export default [js.configs.recommended, /* ... */];
```

**Validation**: `pnpm lint`

---

### PHASE 4: Core Dependencies (Medium Risk)
**Goal**: Update foundational libraries
**Estimated effort**: 2-3 hours

1. **Zod** 3.23.8 → 4.3.5
   - Update pnpm-workspace.yaml catalog
   - Run codemod: `npx zod-v3-to-v4` (community tool)
2. **Marked** 14.1.2 → 17.0.1
3. **ws** 8.17.0 → 8.19.0

**Validation**: Type check, unit tests

---

### PHASE 5: Database Layer (Medium Risk)
**Goal**: Update Drizzle ORM stack
**Estimated effort**: 1-2 hours

1. drizzle-orm 0.33.0 → 0.45.1
2. drizzle-kit 0.24.2 → 0.31.8
3. better-sqlite3 11.3.0 → 12.6.0
4. Run `pnpm drizzle-kit up --dialect=sqlite`

**Breaking Changes**:
- Migration folder structure update
- Relations API import path change (if using v2 relations)

**Validation**: Database operations, run migrations

---

### PHASE 6: AI SDK (HIGH RISK - CRITICAL)
**Goal**: Update entire AI SDK stack
**Estimated effort**: 8-16 hours

#### Step 1: Update pnpm-workspace.yaml catalog
```yaml
catalog:
  '@ai-sdk/anthropic': '^3.0.12'
  '@ai-sdk/openai': '^3.0.9'
```

#### Step 2: Update packages/api/package.json
```json
{
  "ai": "^6.0.33",
  "@ai-sdk/google": "^3.0.7",
  "@ai-sdk/provider": "^1.0.1"
}
```

#### Step 3: Run codemod
```bash
npx @ai-sdk/codemod upgrade v6
```

#### Step 4: Manual review
- Check all `generateText`, `streamText` calls
- Verify tool calling interfaces
- Test streaming responses
- Review provider initialization

**Breaking Changes**:
- Complete API restructuring across v3→v4→v5→v6
- New streaming APIs
- Changed tool calling interface
- Provider configuration changes

**Validation**: All AI features work end-to-end

---

### PHASE 7: React Ecosystem (HIGH RISK)
**Goal**: Update React and related packages
**Estimated effort**: 4-8 hours

#### Pre-flight Check
Verify React 19 compatibility for ALL dependencies:
- [ ] @radix-ui/* packages
- [ ] @uiw/react-codemirror
- [ ] marked-react
- [ ] mermaid
- [ ] sonner
- [ ] react-dropzone
- [ ] react-hotkeys-hook
- [ ] react-textarea-autosize
- [ ] cmdk
- [ ] react-resizable-panels

#### If ALL compatible:
1. React 18.3.1 → 19.2.3
2. React-DOM 18.3.1 → 19.2.3
3. Run codemod: `npx codemod@latest react/19/migration-recipe`
4. react-router-dom 6.26.2 → 7.12.0

**Breaking Changes (React 19)**:
- String refs removed (use ref callbacks)
- ReactDOM.render removed (use createRoot)
- forwardRef no longer needed (ref is a prop)

**Breaking Changes (React Router 7)**:
- Import from `react-router` instead of `react-router-dom`
- Enable future flags incrementally

**Alternative**: If dependencies don't support React 19, stay on React 18.3.x

**Validation**: Full UI testing, all components render

---

### PHASE 8: Tailwind CSS (HIGH RISK)
**Goal**: Migrate to Tailwind v4
**Estimated effort**: 4-8 hours

#### Prerequisites
- Node.js 20+ required

#### Step 1: Run upgrade tool
```bash
npx @tailwindcss/upgrade
```

#### Step 2: Update PostCSS config
```javascript
// postcss.config.js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
    // Remove postcss-import and autoprefixer
  },
};
```

#### Step 3: Review changes
- Config migrated from JS to CSS
- `outline-none` → `outline-hidden`
- Check all plugin compatibility

**Alternative**: Stay on Tailwind 3.x if migration is too disruptive

**Validation**: Visual inspection of all pages

---

### PHASE 9: Remaining Updates (Low Risk)
**Goal**: Update remaining minor packages
**Estimated effort**: 2-4 hours

1. @codemirror/* → latest 6.x versions
2. @uiw/react-codemirror → 4.25.4
3. @radix-ui/* → latest versions
4. posthog-js/posthog-node → latest
5. Express 4.20.0 → 5.2.1
6. @modelcontextprotocol/sdk 1.24.0 → 1.25.2
7. All remaining minor updates

**Validation**: Full regression test

---

## Decision Points

### Decision 1: React 18 vs React 19
| Option | Pros | Cons |
|--------|------|------|
| **React 19** | Latest features, improved performance | Dependency compatibility risk |
| **React 18.3.x** | Safe, stable | Missing new features |

**Recommendation**: Check dependency compatibility first, then decide.

### Decision 2: Tailwind 3 vs Tailwind 4
| Option | Pros | Cons |
|--------|------|------|
| **Tailwind 4** | New features, better DX | Complete rewrite, plugin compatibility |
| **Tailwind 3.x** | Stable, all plugins work | Missing v4 features |

**Recommendation**: Consider staying on v3 for now, upgrade in 3-6 months.

### Decision 3: Upgrade AI SDK
**Recommendation**: **Mandatory** - The AI SDK has evolved significantly and staying on v3.x means missing critical improvements and potentially security updates.

---

## Commands Reference

```bash
# Phase 1: Foundation
pnpm update typescript turbo prettier

# Phase 2: Build System
pnpm update vite vitest vite-node @vitejs/plugin-react-swc

# Phase 3: ESLint
pnpm update eslint
# Then manually create eslint.config.js

# Phase 4: Core Dependencies
# Update pnpm-workspace.yaml catalog, then:
pnpm install

# Phase 5: Database
pnpm update drizzle-orm drizzle-kit better-sqlite3
pnpm drizzle-kit up --dialect=sqlite

# Phase 6: AI SDK
npx @ai-sdk/codemod upgrade v6
pnpm install

# Phase 7: React
npx codemod@latest react/19/migration-recipe
pnpm update react react-dom react-router-dom

# Phase 8: Tailwind
npx @tailwindcss/upgrade

# After each phase
pnpm build && pnpm test && pnpm lint
```

---

## Risk Mitigation

1. **Create a dedicated branch** for upgrade work
2. **Commit after each phase** passes validation
3. **Have rollback plan** ready (git reset)
4. **Test thoroughly** - especially AI features and UI
5. **Keep old versions documented** in case of emergency rollback

---

## Files to Update

### Root
- `package.json` - devDependencies
- `pnpm-workspace.yaml` - catalog versions
- `eslint.config.js` - create new (Phase 3)
- Remove `.eslintrc*` files after Phase 3

### packages/api
- `package.json` - all AI SDK packages, drizzle, vite
- AI-related source files (after codemod)

### packages/web
- `package.json` - react, vite, tailwind, router
- `postcss.config.js` - for Tailwind 4
- `tailwind.config.js` → CSS (Tailwind 4)

### packages/shared
- `package.json` - @ai-sdk/google, zod

### packages/components
- `package.json` - radix-ui, codemirror packages

### packages/configs
- ESLint config updates

---

## Next Steps

1. Review this plan and decide on React 19 / Tailwind 4 paths
2. Create upgrade branch: `git checkout -b upgrade/2026-01-packages`
3. Start with Phase 1 (lowest risk)
4. Proceed through phases, validating after each
5. Full QA before merging to main
