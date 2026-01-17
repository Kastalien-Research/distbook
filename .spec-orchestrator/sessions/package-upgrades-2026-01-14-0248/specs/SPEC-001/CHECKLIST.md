# SPEC-001: Foundation & Build System - Checklist

## Requirements Verification

### REQ-001: TypeScript Upgrade
- [ ] `typescript` version in root package.json is `^5.9.0` or higher
- [ ] `pnpm build` completes without TypeScript errors
- [ ] `pnpm check-types` passes in all packages

### REQ-002: Turbo Upgrade
- [ ] `turbo` version in root package.json is `^2.7.0` or higher
- [ ] All turbo commands work: `turbo dev`, `turbo build`, `turbo test`
- [ ] Build caching still functions correctly

### REQ-003: Vite Upgrade
- [ ] Vite version is `^7.0.0` or higher in packages/api and packages/web
- [ ] Development server starts without errors
- [ ] Hot Module Replacement (HMR) functions correctly
- [ ] Production build completes successfully

### REQ-004: Vitest Upgrade
- [ ] `vitest` version is `^4.0.0` or higher
- [ ] `pnpm test` passes all existing tests
- [ ] Test coverage reporting still works

### REQ-005: vite-node Upgrade
- [ ] vite-node version matches Vitest major version
- [ ] `pnpm --filter api dev` starts without errors

### REQ-006: React SWC Plugin Upgrade
- [ ] Plugin version compatible with Vite 7
- [ ] React Fast Refresh works in development

## Success Criteria
- [ ] All packages build without errors
- [ ] All tests pass
- [ ] Development servers start correctly
- [ ] HMR works in web package
- [ ] No TypeScript errors in any package
