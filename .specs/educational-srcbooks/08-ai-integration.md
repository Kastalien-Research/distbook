# AI Integration - Implementation Specification

**Version:** 1.0
**Date:** 2026-01-14
**Status:** Implementation-Ready
**Output:** `packages/api/srcbook/examples/internals/ai-integration.src.md`
**Dependencies:** Cell Execution Srcbook

---

## 1. Overview

This specification defines the implementation of an educational Srcbook that explains how Srcbook integrates with AI providers (OpenAI, Anthropic, Google, etc.) using the Vercel AI SDK.

### Learning Objectives

1. Understand multi-provider AI architecture
2. Learn how the Vercel AI SDK abstracts provider differences
3. Comprehend configuration and API key management
4. Know how to extend AI capabilities

---

## 2. File Structure

### 2.1 Srcbook Metadata

```markdown
<!-- srcbook:{"language":"typescript"} -->
```

### 2.2 Required Sections

| Section | Type | Purpose |
|---------|------|---------|
| Title | Title Cell | "AI Integration - Multi-Provider Architecture" |
| package.json | Package Cell | AI SDK dependencies |
| Introduction | Markdown | Context and objectives |
| Key Concepts | Markdown | Provider architecture diagram |
| Simple Demo | Code | Basic provider configuration |
| Explanation | Markdown | SDK abstraction layer |
| Advanced Demo | Code | Multi-provider switching |
| Deep Dive | Markdown | Srcbook's implementation |
| Interactive Exercise | Code | Build custom provider |
| Source References | Markdown | Links to source files |
| Next Steps | Markdown | Related topics |
| Summary | Markdown | Key takeaways |

---

## 3. Content Specification

### 3.1 package.json Cell

```json
{
  "type": "module",
  "dependencies": {
    "@types/node": "latest",
    "tsx": "latest",
    "typescript": "latest",
    "ai": "^3.0.0",
    "@ai-sdk/openai": "^0.0.20",
    "@ai-sdk/anthropic": "^0.0.20",
    "zod": "^3.23.8"
  }
}
```

### 3.2 Introduction Content

**What is AI Integration?**
- Srcbook supports multiple AI providers for code generation
- Uses Vercel AI SDK for unified API across providers
- Supports: OpenAI, Anthropic, Google Gemini, xAI, OpenRouter, Custom
- Configuration stored in SQLite database

**Why does it matter?**
- Understanding enables adding new providers
- Necessary for customizing AI behavior
- Foundation for code generation features

### 3.3 Key Concepts - Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  AI Provider Architecture                    │
│                                                              │
│  Configuration (Database)                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ aiProvider: "openai" | "anthropic" | "google" | ...  │   │
│  │ aiModel: "gpt-4o" | "claude-3.5-sonnet" | ...        │   │
│  │ apiKeys: { openai, anthropic, google, ... }          │   │
│  │ aiBaseUrl: (optional custom endpoint)                │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  getModel() Function                                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ switch (provider) {                                   │   │
│  │   case 'openai':    return createOpenAI({ ... });    │   │
│  │   case 'anthropic': return createAnthropic({ ... }); │   │
│  │   case 'google':    return createGoogle({ ... });    │   │
│  │   case 'xai':       return createOpenAI({ baseURL }); │   │
│  │   case 'custom':    return createOpenAI({ baseURL }); │   │
│  │ }                                                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  Vercel AI SDK                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Unified API: generateText(), streamText()            │   │
│  │ Works with any LanguageModel instance                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Simple Demo

**Filename:** `simple-ai-config.ts`

```typescript
// Demonstrate AI provider configuration pattern

import { z } from 'zod';

// Configuration schema (based on packages/api/db/schema.mts)
const AIConfigSchema = z.object({
  aiProvider: z.enum([
    'openai',
    'anthropic',
    'google',
    'xai',
    'openrouter',
    'custom',
  ]),
  aiModel: z.string(),
  aiBaseUrl: z.string().optional(),
  openaiKey: z.string().optional(),
  anthropicKey: z.string().optional(),
  geminiKey: z.string().optional(),
  xaiKey: z.string().optional(),
  openrouterKey: z.string().optional(),
  customApiKey: z.string().optional(),
});

type AIConfig = z.infer<typeof AIConfigSchema>;

// Provider-specific model defaults
const defaultModels: Record<string, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-20241022',
  google: 'gemini-1.5-pro',
  xai: 'grok-beta',
  openrouter: 'anthropic/claude-3.5-sonnet',
  custom: 'custom-model',
};

// Provider base URLs
const providerBaseUrls: Record<string, string | undefined> = {
  openai: undefined,  // Uses default
  anthropic: undefined,
  google: undefined,
  xai: 'https://api.x.ai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  custom: undefined,  // User-provided
};

// Simulate getting config from database
function getConfig(): AIConfig {
  return {
    aiProvider: 'openai',
    aiModel: 'gpt-4o',
    openaiKey: process.env.OPENAI_API_KEY || 'sk-demo-key',
  };
}

// Get the API key for the current provider
function getApiKey(config: AIConfig): string | undefined {
  const keyMap: Record<string, keyof AIConfig> = {
    openai: 'openaiKey',
    anthropic: 'anthropicKey',
    google: 'geminiKey',
    xai: 'xaiKey',
    openrouter: 'openrouterKey',
    custom: 'customApiKey',
  };

  const keyField = keyMap[config.aiProvider];
  return keyField ? (config[keyField] as string | undefined) : undefined;
}

// Validate configuration
function validateConfig(config: AIConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check API key
  const apiKey = getApiKey(config);
  if (!apiKey) {
    errors.push(`Missing API key for provider: ${config.aiProvider}`);
  }

  // Check custom base URL
  if (config.aiProvider === 'custom' && !config.aiBaseUrl) {
    errors.push('Custom provider requires aiBaseUrl');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Demo
console.log('=== AI Configuration Demo ===\n');

const config = getConfig();
console.log('Current Configuration:');
console.log(`  Provider: ${config.aiProvider}`);
console.log(`  Model: ${config.aiModel}`);
console.log(`  API Key: ${getApiKey(config) ? '✅ Set' : '❌ Missing'}`);

const validation = validateConfig(config);
console.log(`\nValidation: ${validation.valid ? '✅ Valid' : '❌ Invalid'}`);
if (!validation.valid) {
  validation.errors.forEach(e => console.log(`  ⚠️ ${e}`));
}

console.log('\n=== Available Providers ===');
Object.entries(defaultModels).forEach(([provider, model]) => {
  const baseUrl = providerBaseUrls[provider];
  console.log(`\n📦 ${provider.toUpperCase()}`);
  console.log(`   Default Model: ${model}`);
  console.log(`   Base URL: ${baseUrl || '(default)'}`);
});
```

### 3.5 Advanced Demo

**Filename:** `multi-provider.ts`

```typescript
// Multi-provider AI system (simplified from config.mts)

// Note: This demo uses mock implementations since we can't actually
// import the AI SDK in a Srcbook cell without the real API keys.

interface LanguageModel {
  provider: string;
  modelId: string;
  call: (prompt: string) => Promise<string>;
}

interface ProviderConfig {
  apiKey: string;
  baseURL?: string;
}

// Mock provider factories (in real code, these use @ai-sdk/*)
function createOpenAI(config: ProviderConfig): (modelId: string) => LanguageModel {
  return (modelId: string) => ({
    provider: 'openai',
    modelId,
    call: async (prompt: string) => {
      console.log(`[OpenAI/${modelId}] Calling with prompt: "${prompt.slice(0, 50)}..."`);
      return `[Mock OpenAI Response for ${modelId}]`;
    },
  });
}

function createAnthropic(config: ProviderConfig): (modelId: string) => LanguageModel {
  return (modelId: string) => ({
    provider: 'anthropic',
    modelId,
    call: async (prompt: string) => {
      console.log(`[Anthropic/${modelId}] Calling with prompt: "${prompt.slice(0, 50)}..."`);
      return `[Mock Anthropic Response for ${modelId}]`;
    },
  });
}

function createGoogle(config: ProviderConfig): (modelId: string) => LanguageModel {
  return (modelId: string) => ({
    provider: 'google',
    modelId,
    call: async (prompt: string) => {
      console.log(`[Google/${modelId}] Calling with prompt: "${prompt.slice(0, 50)}..."`);
      return `[Mock Google Response for ${modelId}]`;
    },
  });
}

// AI Configuration Manager
class AIConfigManager {
  private config: {
    provider: string;
    model: string;
    apiKeys: Record<string, string>;
    customBaseUrl?: string;
  };

  constructor() {
    this.config = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKeys: {
        openai: 'sk-mock-openai-key',
        anthropic: 'sk-mock-anthropic-key',
        google: 'mock-google-key',
        xai: 'mock-xai-key',
      },
    };
  }

  setProvider(provider: string, model?: string): void {
    this.config.provider = provider;
    if (model) {
      this.config.model = model;
    }
    console.log(`✅ Switched to ${provider}/${model || this.config.model}`);
  }

  getModel(): LanguageModel {
    const { provider, model, apiKeys, customBaseUrl } = this.config;

    switch (provider) {
      case 'openai':
        return createOpenAI({ apiKey: apiKeys.openai })(model);

      case 'anthropic':
        return createAnthropic({ apiKey: apiKeys.anthropic })(model);

      case 'google':
        return createGoogle({ apiKey: apiKeys.google })(model);

      case 'xai':
        // xAI uses OpenAI-compatible API
        return createOpenAI({
          apiKey: apiKeys.xai,
          baseURL: 'https://api.x.ai/v1',
        })(model);

      case 'openrouter':
        // OpenRouter uses OpenAI-compatible API
        return createOpenAI({
          apiKey: apiKeys.openrouter || '',
          baseURL: 'https://openrouter.ai/api/v1',
        })(model);

      case 'custom':
        if (!customBaseUrl) {
          throw new Error('Custom provider requires baseURL');
        }
        return createOpenAI({
          apiKey: apiKeys.custom || '',
          baseURL: customBaseUrl,
        })(model);

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async generateText(prompt: string): Promise<string> {
    const model = this.getModel();
    console.log(`\n🤖 Generating with ${model.provider}/${model.modelId}...`);
    return model.call(prompt);
  }

  // Health check (like /ai/healthcheck endpoint)
  async healthCheck(): Promise<{ configured: boolean; provider: string; model: string }> {
    try {
      const model = this.getModel();
      return {
        configured: true,
        provider: model.provider,
        model: model.modelId,
      };
    } catch (e) {
      return {
        configured: false,
        provider: this.config.provider,
        model: this.config.model,
      };
    }
  }
}

// Demo
async function demo() {
  const ai = new AIConfigManager();

  console.log('=== Multi-Provider AI Demo ===\n');

  // Health check
  const health = await ai.healthCheck();
  console.log('Health Check:', health);

  // Test with default provider (OpenAI)
  await ai.generateText('Write a function that calculates factorial');

  // Switch to Anthropic
  ai.setProvider('anthropic', 'claude-3-5-sonnet-20241022');
  await ai.generateText('Explain the factory pattern in TypeScript');

  // Switch to Google
  ai.setProvider('google', 'gemini-1.5-pro');
  await ai.generateText('Generate a React component for a todo list');

  // Switch to xAI (OpenAI-compatible)
  ai.setProvider('xai', 'grok-beta');
  await ai.generateText('What are the best practices for error handling?');

  console.log('\n✅ All providers tested successfully!');
}

demo();
```

### 3.6 Deep Dive Content

**Source File References:**

1. **`packages/api/ai/config.mts`** - Provider configuration
   - `getModel()` - Returns configured LanguageModel
   - Provider-specific client creation
   - API key validation

2. **`packages/api/db/schema.mts`** - Configuration schema
   - AI provider settings (lines 10-30)
   - API key storage

3. **`packages/api/config.mts`** - Config CRUD operations
   - `getConfig()` - Retrieve settings
   - `updateConfig()` - Save settings

4. **`packages/api/server/http.mts`** - HTTP endpoints
   - `/ai/healthcheck` - Test configuration
   - `/settings` - Update AI settings

**Supported Providers:**

| Provider | SDK Package | Base URL | Key Field |
|----------|-------------|----------|-----------|
| OpenAI | `@ai-sdk/openai` | Default | `openaiKey` |
| Anthropic | `@ai-sdk/anthropic` | Default | `anthropicKey` |
| Google | `@ai-sdk/google` | Default | `geminiKey` |
| xAI | `@ai-sdk/openai` (compat) | `https://api.x.ai/v1` | `xaiKey` |
| OpenRouter | `@ai-sdk/openai` (compat) | `https://openrouter.ai/api/v1` | `openrouterKey` |
| Custom | `@ai-sdk/openai` (compat) | User-provided | `customApiKey` |

### 3.7 Interactive Exercise

```typescript
// Exercise: Build an AI Provider Registry
//
// Challenge:
// 1. Create a registry that supports dynamic provider registration
// 2. Implement fallback logic (if primary fails, try secondary)
// 3. Add rate limiting awareness
// 4. Track provider health metrics

interface ProviderEntry {
  name: string;
  factory: (config: ProviderConfig) => LanguageModel;
  isCompatible: (modelId: string) => boolean;
  rateLimits: { requestsPerMinute: number; tokensPerMinute: number };
}

class AIProviderRegistry {
  private providers: Map<string, ProviderEntry> = new Map();
  private fallbackOrder: string[] = [];
  private metrics: Map<string, { calls: number; failures: number }> = new Map();

  register(entry: ProviderEntry): void {
    // TODO: Add provider to registry
  }

  setFallbackOrder(providers: string[]): void {
    // TODO: Set fallback priority
  }

  async call(prompt: string, preferredProvider?: string): Promise<string> {
    // TODO: Try preferred, then fallbacks
    // TODO: Track metrics
    throw new Error('Not implemented');
  }

  getHealthReport(): Record<string, { successRate: number }> {
    // TODO: Calculate success rates from metrics
    throw new Error('Not implemented');
  }
}

// Test your implementation:
// const registry = new AIProviderRegistry();
// registry.register({ name: 'openai', ... });
// registry.register({ name: 'anthropic', ... });
// registry.setFallbackOrder(['openai', 'anthropic']);
// await registry.call('Generate code');
```

### 3.8 Source References

| File | Purpose |
|------|---------|
| `packages/api/ai/config.mts` | Provider configuration and model creation |
| `packages/api/db/schema.mts` | Database schema for AI settings |
| `packages/api/config.mts` | Configuration CRUD operations |
| `packages/api/server/http.mts` | AI-related HTTP endpoints |

---

## 4. Acceptance Criteria

- [ ] Multi-provider architecture explained
- [ ] All supported providers documented
- [ ] Configuration pattern demonstrated
- [ ] Code examples work (with mock data)
- [ ] Exercise is achievable

---

## 5. Implementation Notes

### File Location
```
packages/api/srcbook/examples/internals/ai-integration.src.md
```

### Validation
- Test with different provider configurations
- Verify health check endpoint behavior
