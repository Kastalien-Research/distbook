# SPEC-001: Foundation & Build System - Implementation TODOs

## Pre-Implementation
- [ ] Run baseline: `pnpm build && pnpm test`
- [ ] Document current versions

## Implementation Steps

### Step 1: Update TypeScript and Turbo
- [ ] Update root package.json: typescript to ^5.9.0
- [ ] Update root package.json: turbo to ^2.7.0
- [ ] Run `pnpm install`
- [ ] Verify: `pnpm build`

### Step 2: Update Vite Ecosystem (Incremental)
- [ ] Update to Vite 6.x first (safer intermediate step)
- [ ] Update vitest to ^3.0.0
- [ ] Update vite-node to ^3.0.0
- [ ] Test: `pnpm build && pnpm test && pnpm dev`
- [ ] If stable, proceed to Vite 7.x
- [ ] Update vite to ^7.0.0
- [ ] Update vitest to ^4.0.0
- [ ] Update vite-node to ^4.0.0
- [ ] Update @vitejs/plugin-react-swc to latest

### Step 3: Check for Deprecated APIs
- [ ] Review packages/api/vite.config.ts
- [ ] Review packages/web/vite.config.ts
- [ ] Fix any deprecated options

### Step 4: Validate
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes
- [ ] `pnpm dev` works (both api and web)
- [ ] HMR works in web package
