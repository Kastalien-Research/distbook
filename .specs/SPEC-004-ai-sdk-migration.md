# SPEC-004: Vercel AI SDK v6 Migration

> **Status**: Ready for Implementation
> **Priority**: P0 (Critical)
> **Estimated Effort**: 8-16 hours
> **Risk Level**: HIGH
> **Dependencies**: SPEC-001 (Foundation & Build System)

## Overview

Migrate the Vercel AI SDK from v3.x to v6.x. This is the most significant and risky upgrade in the project, involving multiple major version jumps with substantial API changes. The AI SDK is core to srcbook's functionality.

## Objectives

1. Upgrade `ai` package from 3.4.33 to 6.x
2. Upgrade `@ai-sdk/anthropic` from 0.0.49 to 3.x
3. Upgrade `@ai-sdk/openai` from 0.0.58 to 3.x
4. Upgrade `@ai-sdk/google` from 1.0.x to 3.x
5. Upgrade `@ai-sdk/provider` to latest
6. Apply codemods and manual migrations
7. Verify all AI features work end-to-end

## Requirements

### REQ-001: AI SDK Core Upgrade
- **Description**: Upgrade the `ai` package to v6.x
- **Acceptance Criteria**:
  - [ ] `ai` version is `^6.0.0` or higher
  - [ ] All imports resolve correctly
  - [ ] TypeScript types compile
- **Priority**: Must
- **Verification**: `pnpm build --filter api`

### REQ-002: Provider Package Upgrades
- **Description**: Upgrade all @ai-sdk/* provider packages
- **Acceptance Criteria**:
  - [ ] `@ai-sdk/anthropic` is `^3.0.0`
  - [ ] `@ai-sdk/openai` is `^3.0.0`
  - [ ] `@ai-sdk/google` is `^3.0.0`
  - [ ] `@ai-sdk/provider` is latest
  - [ ] All providers can be instantiated
- **Priority**: Must
- **Verification**: Test each provider initialization

### REQ-003: Codemod Application
- **Description**: Apply official AI SDK codemods
- **Acceptance Criteria**:
  - [ ] `npx @ai-sdk/codemod upgrade v6` completed
  - [ ] All automated transformations applied
  - [ ] Manual review of flagged items complete
- **Priority**: Must
- **Verification**: No codemod warnings remain

### REQ-004: Streaming API Migration
- **Description**: Update all streaming text/object calls
- **Acceptance Criteria**:
  - [ ] `streamText` calls updated to v6 API
  - [ ] `streamObject` calls updated if used
  - [ ] Streaming responses work in UI
- **Priority**: Must
- **Verification**: Test streaming in srcbook cells

### REQ-005: Tool Calling Migration
- **Description**: Update tool/function calling interfaces
- **Acceptance Criteria**:
  - [ ] Tool definitions use v6 schema
  - [ ] Tool execution works correctly
  - [ ] Multi-turn tool conversations function
- **Priority**: Must
- **Verification**: Test tool-using features

### REQ-006: Provider Configuration Migration
- **Description**: Update provider initialization and configuration
- **Acceptance Criteria**:
  - [ ] Provider instantiation uses new API
  - [ ] API key handling works
  - [ ] Model selection functions correctly
- **Priority**: Must
- **Verification**: Test with each provider

### REQ-007: Error Handling Migration
- **Description**: Update error handling for new error types
- **Acceptance Criteria**:
  - [ ] New error types caught correctly
  - [ ] Error messages displayed appropriately
  - [ ] Retry logic still functions
- **Priority**: Must
- **Verification**: Trigger and verify error handling

## Implementation Steps

### Step 1: Understand Current AI SDK Usage

```bash
# Find all AI SDK imports
grep -r "from 'ai'" packages/ --include="*.ts" --include="*.mts"
grep -r 'from "@ai-sdk' packages/ --include="*.ts" --include="*.mts"

# Find specific function usage
grep -r "generateText" packages/
grep -r "streamText" packages/
grep -r "generateObject" packages/
grep -r "streamObject" packages/
```

### Step 2: Create Backup

```bash
# Create backup of current AI-related files
mkdir -p .backup/ai-sdk
cp -R packages/api/server/*.mts .backup/ai-sdk/
cp -R packages/api/srcbook/*.mts .backup/ai-sdk/
```

### Step 3: Update pnpm-workspace.yaml Catalog

```yaml
catalog:
  '@ai-sdk/anthropic': '^3.0.12'
  '@ai-sdk/openai': '^3.0.9'
  # Note: zod, marked, ws already updated in SPEC-003
```

### Step 4: Update packages/api/package.json

```json
{
  "dependencies": {
    "@ai-sdk/anthropic": "catalog:",
    "@ai-sdk/google": "^3.0.7",
    "@ai-sdk/openai": "catalog:",
    "@ai-sdk/provider": "^1.0.1",
    "ai": "^6.0.33"
  }
}
```

### Step 5: Update packages/shared/package.json

```json
{
  "dependencies": {
    "@ai-sdk/google": "^3.0.7"
  }
}
```

### Step 6: Install and Run Codemod

```bash
# Install updated packages
pnpm install

# Run the official codemod
npx @ai-sdk/codemod upgrade v6

# Review changes
git diff packages/
```

### Step 7: Manual Migration - Provider Initialization

**Before (v3):**
```typescript
import { anthropic } from '@ai-sdk/anthropic';

const model = anthropic('claude-3-opus-20240229');
```

**After (v6):**
```typescript
import { createAnthropic } from '@ai-sdk/anthropic';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
const model = anthropic('claude-sonnet-4-20250514');
```

### Step 8: Manual Migration - streamText

**Before (v3):**
```typescript
import { streamText } from 'ai';

const result = await streamText({
  model,
  messages,
});

for await (const chunk of result.textStream) {
  // handle chunk
}
```

**After (v6):**
```typescript
import { streamText } from 'ai';

const result = streamText({
  model,
  messages,
});

for await (const chunk of result.textStream) {
  // handle chunk
}
```

Note: v6 `streamText` returns immediately (not a Promise).

### Step 9: Manual Migration - Tool Calling

**Before (v3):**
```typescript
const result = await generateText({
  model,
  messages,
  tools: {
    weather: {
      description: 'Get weather',
      parameters: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => {
        return getWeather(location);
      },
    },
  },
});
```

**After (v6):**
```typescript
import { tool } from 'ai';

const result = await generateText({
  model,
  messages,
  tools: {
    weather: tool({
      description: 'Get weather',
      parameters: z.object({
        location: z.string(),
      }),
      execute: async ({ location }) => {
        return getWeather(location);
      },
    }),
  },
});
```

### Step 10: Test All AI Features

```bash
# Run API tests
pnpm --filter api test

# Manual testing checklist:
# - [ ] Text generation (non-streaming)
# - [ ] Text streaming
# - [ ] Code generation
# - [ ] Tool/function calling
# - [ ] Multi-turn conversations
# - [ ] Error handling (rate limits, invalid API key)
# - [ ] All providers (Anthropic, OpenAI, Google)
```

### Step 11: Commit

```bash
git add -A
git commit -m "feat: migrate to Vercel AI SDK v6

BREAKING CHANGE: AI SDK upgraded from v3 to v6

- ai 3.4.33 → 6.0.33
- @ai-sdk/anthropic 0.0.49 → 3.0.12
- @ai-sdk/openai 0.0.58 → 3.0.9
- @ai-sdk/google 1.0.x → 3.0.7

Migration includes:
- Provider initialization API changes
- streamText/generateText API updates
- Tool calling interface changes
- Error handling updates

Codemods applied via @ai-sdk/codemod

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

## Files to Modify

| File | Expected Changes |
|------|------------------|
| `pnpm-workspace.yaml` | Update @ai-sdk/* versions in catalog |
| `packages/api/package.json` | Update ai, @ai-sdk/* versions |
| `packages/shared/package.json` | Update @ai-sdk/google |
| `packages/api/server/*.mts` | Provider initialization, streaming |
| `packages/api/srcbook/*.mts` | AI generation logic |
| Any file with AI SDK imports | Codemod transformations |

## AI SDK v6 Migration Reference

### Key API Changes

| v3 | v6 |
|----|-----|
| `import { anthropic } from '@ai-sdk/anthropic'` | `import { createAnthropic } from '@ai-sdk/anthropic'` |
| `await streamText(...)` | `streamText(...)` (returns immediately) |
| `result.text` | `await result.text` (now async) |
| Inline tool definition | `tool({ ... })` wrapper |

### Streaming Behavior Changes

```typescript
// v6 streaming is lazy - starts when you iterate
const result = streamText({ model, messages });

// Start streaming by iterating
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

// Or consume all at once
const text = await result.text;
```

### Error Types

```typescript
// v6 has more specific error types
import { APICallError, InvalidResponseDataError } from 'ai';

try {
  const result = await generateText({ model, messages });
} catch (error) {
  if (error instanceof APICallError) {
    // Handle API-level errors
  }
}
```

## Rollback Plan

```bash
# Restore backup
cp -R .backup/ai-sdk/* packages/api/

# Revert package.json changes
git checkout main -- pnpm-workspace.yaml packages/*/package.json

# Reinstall
pnpm install
```

## Success Criteria

- [ ] All AI SDK packages at v6/v3 versions
- [ ] Application builds without errors
- [ ] All AI-related tests pass
- [ ] Text generation works (all providers)
- [ ] Text streaming works (all providers)
- [ ] Tool calling works
- [ ] Error handling functions correctly
- [ ] No runtime errors in AI features

## Known Issues & Workarounds

### Issue: Codemod Misses Some Patterns
**Symptom**: TypeScript errors after codemod
**Workaround**: Manual review and fix of flagged patterns

### Issue: Provider API Key Configuration
**Symptom**: "API key not found" errors
**Workaround**: Ensure environment variables set correctly, check new provider instantiation

### Issue: Streaming Response Format Changes
**Symptom**: UI doesn't display streaming correctly
**Workaround**: Update stream consumption code to match v6 API

### Issue: Tool Result Type Changes
**Symptom**: Tool results not typed correctly
**Workaround**: Update tool result handling to use new types

## Testing Checklist

### Unit Tests
- [ ] Provider initialization tests
- [ ] Text generation tests
- [ ] Streaming tests
- [ ] Tool calling tests

### Integration Tests
- [ ] End-to-end generation flow
- [ ] WebSocket streaming to client
- [ ] Multi-turn conversation

### Manual Tests
- [ ] Anthropic Claude generation
- [ ] OpenAI GPT generation
- [ ] Google Gemini generation
- [ ] Code cell execution with AI
- [ ] AI-assisted editing

## Post-Implementation

After this spec is complete:
- SPEC-005 (Frontend Stack) can proceed
- Core AI functionality is modernized
- New AI SDK features available (v6 improvements)
- Mark SPEC-004 as complete in state.json

## References

- [AI SDK v6 Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0)
- [AI SDK v5 Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0)
- [AI SDK v4 Migration Guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-4-0)
- [AI SDK Codemods](https://ai-sdk.dev/docs/reference/ai-sdk-codemod)
