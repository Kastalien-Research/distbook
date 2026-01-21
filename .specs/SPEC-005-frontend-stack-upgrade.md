# SPEC-005: Frontend Stack Upgrade

> **Status**: Ready for Implementation
> **Priority**: P2
> **Estimated Effort**: 8-12 hours
> **Risk Level**: HIGH
> **Dependencies**: SPEC-003 (Core Dependencies), SPEC-004 (AI SDK Migration)

## Overview

Upgrade the frontend stack including React, React Router, Tailwind CSS, and UI component libraries. This spec has the highest dependency count and should be executed last.

## Objectives

1. Evaluate React 19 compatibility (decision point)
2. Upgrade React and React DOM (18.x or 19.x)
3. Upgrade React Router DOM from 6.x to 7.x
4. Evaluate and optionally upgrade Tailwind CSS to v4
5. Upgrade Radix UI components
6. Upgrade CodeMirror packages
7. Upgrade remaining UI dependencies

## Decision Points

### Decision 1: React 18 vs React 19
**Must verify compatibility before proceeding.**

### Decision 2: Tailwind 3 vs Tailwind 4
**Tailwind 4 is a complete rewrite. May defer.**

## Requirements

### REQ-001: React 19 Compatibility Check
- **Description**: Verify all dependencies support React 19
- **Acceptance Criteria**:
  - [ ] Compatibility matrix completed for all React dependencies
  - [ ] Decision made: React 18 or React 19
  - [ ] Incompatible packages identified with workarounds
- **Priority**: Must
- **Verification**: Dependency audit script

### REQ-002: React Upgrade (Conditional)
- **Description**: Upgrade React if compatibility check passes
- **Acceptance Criteria**:
  - [ ] React version at target (18.x or 19.x)
  - [ ] All components render correctly
  - [ ] No deprecation warnings in console
  - [ ] Hooks work correctly
- **Priority**: Must
- **Verification**: Full UI testing

### REQ-003: React 19 Migration (If Applicable)
- **Description**: Apply React 19 codemods and fixes
- **Acceptance Criteria**:
  - [ ] Codemod applied: `npx codemod@latest react/19/migration-recipe`
  - [ ] String refs converted to callback refs
  - [ ] Legacy context usage updated
  - [ ] forwardRef usage reviewed
- **Priority**: Conditional
- **Verification**: No React 19 deprecation warnings

### REQ-004: React Router 7 Upgrade
- **Description**: Upgrade React Router DOM to v7
- **Acceptance Criteria**:
  - [ ] react-router-dom version is `^7.0.0`
  - [ ] All routes render correctly
  - [ ] Navigation works (links, programmatic)
  - [ ] Route parameters work
  - [ ] Nested routes function
- **Priority**: Must
- **Verification**: Navigation testing

### REQ-005: Tailwind CSS Evaluation
- **Description**: Evaluate Tailwind v4 upgrade feasibility
- **Acceptance Criteria**:
  - [ ] Upgrade feasibility assessed
  - [ ] Decision made: Tailwind 3 or Tailwind 4
  - [ ] If v4: Migration plan created
- **Priority**: Should
- **Verification**: Assessment document

### REQ-006: Tailwind CSS v4 Migration (Conditional)
- **Description**: Migrate to Tailwind v4 if decided
- **Acceptance Criteria**:
  - [ ] `npx @tailwindcss/upgrade` completed
  - [ ] tailwind.config.js → CSS migration done
  - [ ] PostCSS config updated
  - [ ] All styles render correctly
- **Priority**: Conditional
- **Verification**: Visual inspection

### REQ-007: Radix UI Upgrades
- **Description**: Update all @radix-ui/* packages
- **Acceptance Criteria**:
  - [ ] All Radix UI packages at latest versions
  - [ ] Components render correctly
  - [ ] Accessibility features intact
- **Priority**: Must
- **Verification**: Component testing

### REQ-008: CodeMirror Upgrades
- **Description**: Update CodeMirror packages
- **Acceptance Criteria**:
  - [ ] All @codemirror/* at latest 6.x
  - [ ] @uiw/react-codemirror at latest
  - [ ] Editor renders correctly
  - [ ] Syntax highlighting works
  - [ ] Autocomplete functions
- **Priority**: Must
- **Verification**: Editor testing

### REQ-009: Remaining UI Dependencies
- **Description**: Update remaining frontend packages
- **Acceptance Criteria**:
  - [ ] lucide-react updated
  - [ ] sonner updated
  - [ ] react-dropzone updated
  - [ ] react-hotkeys-hook updated
  - [ ] mermaid updated
  - [ ] posthog-js updated
- **Priority**: Should
- **Verification**: Feature testing

## Implementation Steps

### Step 1: React 19 Compatibility Audit

```bash
# Check each dependency for React 19 support
npm info @radix-ui/react-dialog peerDependencies
npm info @uiw/react-codemirror peerDependencies
npm info marked-react peerDependencies
npm info mermaid peerDependencies
npm info sonner peerDependencies
npm info react-dropzone peerDependencies
npm info react-hotkeys-hook peerDependencies
npm info react-textarea-autosize peerDependencies
npm info cmdk peerDependencies
npm info react-resizable-panels peerDependencies
```

Create compatibility matrix:

| Package | React 18 | React 19 | Notes |
|---------|----------|----------|-------|
| @radix-ui/* | ✓ | ? | Check |
| @uiw/react-codemirror | ✓ | ? | Check |
| marked-react | ✓ | ? | Check |
| ... | | | |

### Step 2: Make React Version Decision

**If ALL dependencies support React 19:**
→ Proceed with React 19 upgrade

**If ANY critical dependency doesn't support React 19:**
→ Stay on React 18.3.x, document blockers

### Step 3A: React 19 Upgrade Path

```bash
# Run migration codemod
npx codemod@latest react/19/migration-recipe

# Update packages
pnpm update react@^19.0.0 react-dom@^19.0.0 --filter web --filter components
pnpm update @types/react@^19.0.0 @types/react-dom@^19.0.0 --filter web --filter components
```

### Step 3B: React 18 Stay Path

```bash
# Update to latest React 18
pnpm update react@^18.3.1 react-dom@^18.3.1 --filter web --filter components
```

### Step 4: React Router 7 Migration

```bash
# Enable future flags first (in React Router 6)
# This allows incremental migration
```

Update router configuration:

```tsx
// Enable future flags
<BrowserRouter
  future={{
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }}
>
  {/* routes */}
</BrowserRouter>
```

Then upgrade:

```bash
pnpm update react-router-dom@^7.0.0 --filter web
```

Update imports:
```typescript
// Before
import { useLocation } from "react-router-dom";

// After (for non-DOM specific)
import { useLocation } from "react-router";
```

### Step 5: Tailwind CSS Decision

**Option A: Upgrade to Tailwind v4**
```bash
npx @tailwindcss/upgrade
```

**Option B: Stay on Tailwind v3**
```bash
pnpm update tailwindcss@^3.4.17 --filter web
```

**Recommendation**: Stay on v3 initially, upgrade later in separate PR.

### Step 6: Radix UI Upgrades

```bash
# Update all Radix packages
pnpm update @radix-ui/react-collapsible@latest \
  @radix-ui/react-context-menu@latest \
  @radix-ui/react-dialog@latest \
  @radix-ui/react-dropdown-menu@latest \
  @radix-ui/react-icons@latest \
  @radix-ui/react-navigation-menu@latest \
  @radix-ui/react-popover@latest \
  @radix-ui/react-scroll-area@latest \
  @radix-ui/react-select@latest \
  @radix-ui/react-slot@latest \
  @radix-ui/react-switch@latest \
  @radix-ui/react-tabs@latest \
  @radix-ui/react-tooltip@latest \
  --filter components
```

### Step 7: CodeMirror Upgrades

```bash
pnpm update @codemirror/autocomplete@latest \
  @codemirror/lang-css@latest \
  @codemirror/lang-html@latest \
  @codemirror/lang-javascript@latest \
  @codemirror/lang-json@latest \
  @codemirror/lang-markdown@latest \
  @codemirror/lint@latest \
  @codemirror/merge@latest \
  @codemirror/state@latest \
  @uiw/codemirror-themes@latest \
  @uiw/react-codemirror@latest \
  codemirror@latest \
  --filter web --filter components
```

### Step 8: Remaining Dependencies

```bash
pnpm update lucide-react@latest \
  sonner@latest \
  react-dropzone@latest \
  react-hotkeys-hook@latest \
  react-textarea-autosize@latest \
  mermaid@latest \
  posthog-js@latest \
  marked-react@latest \
  cmdk@latest \
  react-resizable-panels@latest \
  --filter web --filter components
```

### Step 9: Full Testing

```bash
# Build
pnpm build

# Type check
pnpm check-types

# Lint
pnpm lint

# Start dev server
pnpm dev

# Manual testing checklist
```

### Step 10: Commit

```bash
git add -A
git commit -m "feat: upgrade frontend stack

React: 18.3.1 → [18.x/19.x]
React Router: 6.26.2 → 7.x
Tailwind: 3.4.11 → [3.x/4.x]
Radix UI: all packages updated
CodeMirror: all packages updated

Additional updates:
- lucide-react, sonner, react-dropzone
- react-hotkeys-hook, mermaid, posthog-js

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

## Files to Modify

| File | Changes |
|------|---------|
| `packages/web/package.json` | React, router, tailwind, all UI deps |
| `packages/components/package.json` | React peer deps, Radix, CodeMirror |
| `packages/web/src/main.tsx` | React 19 migration if applicable |
| `packages/web/src/App.tsx` | Router updates |
| `packages/web/postcss.config.js` | Tailwind v4 if applicable |
| `packages/web/tailwind.config.js` | Tailwind v4 migration if applicable |
| Various component files | Possible ref/context updates |

## React 19 Migration Reference

### String Refs → Callback Refs
```tsx
// Before
<input ref="myInput" />
this.refs.myInput.focus();

// After
<input ref={(el) => (this.myInput = el)} />
this.myInput.focus();
```

### forwardRef (Optional in React 19)
```tsx
// Before (React 18)
const Button = forwardRef((props, ref) => (
  <button ref={ref} {...props} />
));

// After (React 19 - ref is a regular prop)
const Button = ({ ref, ...props }) => (
  <button ref={ref} {...props} />
);
```

## React Router 7 Migration Reference

### Import Changes
```typescript
// Core hooks/components - now from 'react-router'
import { useLocation, useNavigate, useParams } from 'react-router';

// DOM-specific - still from 'react-router-dom'
import { BrowserRouter, Link, NavLink } from 'react-router-dom';
```

### Future Flags
Enable incrementally before upgrading:
- `v7_startTransition`
- `v7_relativeSplatPath`
- `v7_fetcherPersist`
- `v7_normalizeFormMethod`
- `v7_partialHydration`
- `v7_skipActionErrorRevalidation`

## Tailwind v4 Migration Reference

### Config Migration
```css
/* Before: tailwind.config.js */
/* After: CSS with @theme */

@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
  --font-sans: "Inter", sans-serif;
}
```

### PostCSS Config
```javascript
// Before
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

// After
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

## Rollback Plan

```bash
# Revert all frontend package changes
git checkout main -- packages/web/package.json packages/components/package.json

# Revert any code changes
git checkout main -- packages/web/src packages/components/src

# Reinstall
pnpm install
```

## Success Criteria

- [ ] Application builds without errors
- [ ] All pages render correctly
- [ ] Navigation works
- [ ] All UI components function
- [ ] Editor (CodeMirror) works
- [ ] Dialogs, tooltips, dropdowns work
- [ ] Styling appears correct
- [ ] No console errors/warnings
- [ ] Keyboard shortcuts work
- [ ] Drag and drop works

## Testing Checklist

### Visual Testing
- [ ] Home page renders
- [ ] Srcbook list renders
- [ ] Srcbook editor renders
- [ ] Code cells render with syntax highlighting
- [ ] Markdown renders correctly
- [ ] Mermaid diagrams render
- [ ] Dark/light theme works

### Interaction Testing
- [ ] Navigation between pages
- [ ] Create new srcbook
- [ ] Edit srcbook cells
- [ ] Run code cells
- [ ] Keyboard shortcuts
- [ ] Context menus
- [ ] Dropdowns and selects
- [ ] Tooltips
- [ ] Modal dialogs
- [ ] File drag and drop

### Edge Cases
- [ ] Large srcbooks
- [ ] Long-running cells
- [ ] Error states
- [ ] Loading states

## Post-Implementation

After this spec is complete:
- All packages updated to latest versions
- Full upgrade complete
- Mark SPEC-005 as complete in state.json
- Clean up .interleaved-thinking/ and .spec-designer/
