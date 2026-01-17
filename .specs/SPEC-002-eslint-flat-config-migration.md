# SPEC-002: ESLint 9 Flat Config Migration

> **Status**: Ready for Implementation
> **Priority**: P1
> **Estimated Effort**: 2-4 hours
> **Risk Level**: Medium
> **Dependencies**: SPEC-001 (Foundation & Build System)

## Overview

Migrate from ESLint 8 with `.eslintrc` configuration to ESLint 9 with flat config (`eslint.config.js`). This is a one-time migration that modernizes the linting infrastructure.

## Objectives

1. Upgrade ESLint from 8.57.0 to 9.x
2. Convert `.eslintrc.*` files to `eslint.config.js` flat config format
3. Update all ESLint plugins to ESLint 9-compatible versions
4. Update the `@srcbook/configs` package with new config exports

## Requirements

### REQ-001: ESLint 9 Installation
- **Description**: Upgrade ESLint to version 9.x
- **Acceptance Criteria**:
  - [ ] `eslint` version is `^9.0.0` or higher
  - [ ] ESLint can parse all project files
- **Priority**: Must
- **Verification**: `npx eslint --version`

### REQ-002: Flat Config Migration
- **Description**: Create `eslint.config.js` files replacing `.eslintrc.*`
- **Acceptance Criteria**:
  - [ ] Root `eslint.config.js` exists
  - [ ] All `.eslintrc.*` files removed
  - [ ] Config uses `@eslint/js` for recommended rules
- **Priority**: Must
- **Verification**: `pnpm lint` passes

### REQ-003: Plugin Compatibility
- **Description**: Update all ESLint plugins to ESLint 9-compatible versions
- **Acceptance Criteria**:
  - [ ] `@typescript-eslint/eslint-plugin` updated to v8+
  - [ ] `@typescript-eslint/parser` updated to v8+
  - [ ] `eslint-plugin-react` updated (if used)
  - [ ] `eslint-plugin-react-hooks` updated (if used)
  - [ ] No plugin compatibility warnings
- **Priority**: Must
- **Verification**: `pnpm lint` runs without plugin errors

### REQ-004: @srcbook/configs Update
- **Description**: Update shared configs package for flat config format
- **Acceptance Criteria**:
  - [ ] `packages/configs` exports flat config compatible configurations
  - [ ] Other packages can import and use these configs
- **Priority**: Must
- **Verification**: Lint passes in all packages

### REQ-005: IDE Integration
- **Description**: Ensure VS Code ESLint extension works with new config
- **Acceptance Criteria**:
  - [ ] VS Code shows lint errors inline
  - [ ] Auto-fix on save works (if configured)
- **Priority**: Should
- **Verification**: Manual VS Code testing

## Implementation Steps

### Step 1: Research Current ESLint Setup
```bash
# Find all ESLint config files
find . -name ".eslintrc*" -not -path "./node_modules/*"
find . -name "eslint.config.*" -not -path "./node_modules/*"

# Check current plugins
grep -r "eslint-plugin" package.json packages/*/package.json
```

### Step 2: Install ESLint 9 and Dependencies
```bash
# Update ESLint and core packages
pnpm update eslint@^9.0.0

# Install new required packages
pnpm add -D @eslint/js @eslint/eslintrc -w

# Update TypeScript ESLint
pnpm update @typescript-eslint/eslint-plugin@^8.0.0 @typescript-eslint/parser@^8.0.0 -w
```

### Step 3: Create Root Flat Config

Create `eslint.config.js` at project root:

```javascript
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  // Global ignores
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.turbo/**",
    ],
  },

  // Base JS config
  js.configs.recommended,

  // TypeScript config
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // React config (for web package)
  {
    files: ["packages/web/**/*.tsx", "packages/components/**/*.tsx"],
    // Add React-specific rules here
  },
];
```

### Step 4: Remove Old Config Files
```bash
# Remove old eslintrc files
rm -f .eslintrc.* .eslintrc
rm -f packages/*/.eslintrc.* packages/*/.eslintrc

# Remove eslintignore if present (use ignores in flat config)
rm -f .eslintignore
```

### Step 5: Update Package Scripts
Ensure lint scripts in `package.json` work with flat config:
```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

### Step 6: Update @srcbook/configs Package

If this package exports ESLint configs, update to flat config format:

```javascript
// packages/configs/eslint.config.js
import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";

export const baseConfig = [
  js.configs.recommended,
  // ... shared rules
];

export const typescriptConfig = [
  // TypeScript-specific config
];
```

### Step 7: Validate
```bash
pnpm lint
pnpm lint --fix  # Fix auto-fixable issues
```

### Step 8: Commit
```bash
git add -A
git commit -m "chore: migrate to ESLint 9 flat config

- ESLint 8.57.0 → 9.x
- Convert .eslintrc to eslint.config.js
- Update @typescript-eslint to v8
- Remove deprecated eslintrc files

BREAKING: ESLint config format changed

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

## Files to Modify

| File | Action |
|------|--------|
| `package.json` | Update eslint, add @eslint/js |
| `eslint.config.js` | Create (new file) |
| `.eslintrc.*` | Delete |
| `.eslintignore` | Delete (move to config) |
| `packages/configs/` | Update exports |

## Flat Config Reference

### Before (eslintrc)
```json
{
  "extends": ["eslint:recommended"],
  "parserOptions": {
    "ecmaVersion": 2022
  },
  "rules": {
    "no-unused-vars": "error"
  }
}
```

### After (flat config)
```javascript
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
    },
    rules: {
      "no-unused-vars": "error",
    },
  },
];
```

## Rollback Plan

If migration fails:
```bash
git checkout main -- .eslintrc* package.json
pnpm install
```

## Success Criteria

- [ ] `pnpm lint` passes on all packages
- [ ] No `.eslintrc.*` files remain
- [ ] `eslint.config.js` at root
- [ ] VS Code integration works
- [ ] All TypeScript/React plugins functional

## Known Issues & Workarounds

### Issue: Plugin Not Compatible with Flat Config
**Symptom**: `TypeError: ... is not a function`
**Workaround**: Use `FlatCompat` to wrap legacy plugins:
```javascript
const compat = new FlatCompat({ baseDirectory: __dirname });
export default [
  ...compat.extends("plugin:some-legacy-plugin/recommended"),
];
```

### Issue: Different Config Per Package
**Symptom**: Need different rules for api vs web
**Solution**: Use `files` globs to target specific packages:
```javascript
{
  files: ["packages/api/**/*.ts"],
  rules: { /* api-specific rules */ }
}
```

## Post-Implementation

After this spec is complete:
- All linting uses modern flat config
- Future ESLint upgrades will be simpler
- Mark SPEC-002 as complete in state.json
