<!-- srcbook:{"language":"typescript"} -->

# AI Integration - Multi-Provider Architecture

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "@types/node": "^22.10.1",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "zod": "^3.23.8"
  }
}
```

## Introduction

This srcbook explores how Srcbook integrates with multiple AI providers for code generation. Srcbook uses a unified architecture that abstracts away provider-specific differences, allowing seamless switching between OpenAI, Anthropic, Google Gemini, xAI, OpenRouter, and custom endpoints.

### What is AI Integration?

Srcbook's AI integration provides:

- **Multi-provider support** - Use any major AI provider or your own custom endpoint
- **Unified API** - The Vercel AI SDK provides consistent interfaces across all providers
- **Configuration persistence** - Settings stored in SQLite database
- **Runtime switching** - Change providers without code changes

### Why does it matter?

Understanding the AI integration architecture enables you to:

1. **Add new providers** - Extend support to additional AI services
2. **Customize behavior** - Fine-tune model selection and parameters
3. **Debug issues** - Troubleshoot configuration problems
4. **Build features** - Leverage AI capabilities in your own code

### Learning Objectives

By the end of this srcbook, you will:

1. Understand the multi-provider AI architecture
2. Learn how the Vercel AI SDK abstracts provider differences
3. Comprehend configuration and API key management
4. Know how to extend AI capabilities

---

## Key Concepts - Architecture Overview

The AI provider architecture follows a simple pattern:

```
+-------------------------------------------------------------+
|                  AI Provider Architecture                    |
|                                                              |
|  Configuration (Database)                                    |
|  +------------------------------------------------------+   |
|  | aiProvider: "openai" | "anthropic" | "Gemini" | ...  |   |
|  | aiModel: "gpt-4o" | "claude-3-5-sonnet" | ...        |   |
|  | apiKeys: { openai, anthropic, gemini, xai, ... }     |   |
|  | aiBaseUrl: (optional custom endpoint)                |   |
|  +------------------------------------------------------+   |
|                           |                                  |
|                           v                                  |
|  getModel() Function                                         |
|  +------------------------------------------------------+   |
|  | switch (provider) {                                   |   |
|  |   case 'openai':    return createOpenAI({ ... });    |   |
|  |   case 'anthropic': return createAnthropic({ ... }); |   |
|  |   case 'Gemini':    return createGoogle({ ... });    |   |
|  |   case 'Xai':       return createOpenAI({ baseURL }); |   |
|  |   case 'custom':    return createOpenAI({ baseURL }); |   |
|  | }                                                     |   |
|  +------------------------------------------------------+   |
|                           |                                  |
|                           v                                  |
|  Vercel AI SDK                                               |
|  +------------------------------------------------------+   |
|  | Unified API: generateText(), streamText()            |   |
|  | Works with any LanguageModel instance                |   |
|  +------------------------------------------------------+   |
|                                                              |
+-------------------------------------------------------------+
```

### Provider Flow

1. **Configuration Load** - Settings retrieved from SQLite database
2. **Provider Selection** - Switch statement selects correct SDK factory
3. **Client Creation** - Provider-specific client instantiated with API key
4. **Model Binding** - Model ID applied to create LanguageModel instance
5. **Unified Usage** - AI SDK methods work identically across providers

---

## Supported AI Providers

Srcbook supports 6 AI providers out of the box:

| Provider | SDK Package | Base URL | Key Field | Default Model |
|----------|-------------|----------|-----------|---------------|
| **OpenAI** | `@ai-sdk/openai` | Default | `openaiKey` | `chatgpt-4o-latest` |
| **Anthropic** | `@ai-sdk/anthropic` | Default | `anthropicKey` | `claude-3-5-sonnet-latest` |
| **Google Gemini** | `@ai-sdk/google` | Default | `geminiKey` | `gemini-1.5-pro-latest` |
| **xAI** | `@ai-sdk/openai` (compat) | `https://api.x.ai/v1` | `xaiKey` | `grok-beta` |
| **OpenRouter** | `@ai-sdk/openai` (compat) | `https://openrouter.ai/api/v1` | `openrouterKey` | `anthropic/claude-3-opus-20240229` |
| **Custom** | `@ai-sdk/openai` (compat) | User-provided | `customApiKey` | `mistral-nemo` |

### OpenAI-Compatible APIs

Note that xAI, OpenRouter, and Custom providers use the OpenAI SDK with a custom `baseURL`. This pattern works because these services implement the OpenAI API specification. The Vercel AI SDK sets `compatibility: 'compatible'` mode for these providers.

---

## Simple Demo - Configuration Schema

Let's explore the configuration schema that defines AI provider settings.

###### simple-ai-config.ts

```typescript
// Demonstrate AI provider configuration pattern
// This mirrors the actual schema from packages/api/db/schema.mts

import { z } from 'zod';

// =============================================================================
// Configuration Schema
// =============================================================================

// Provider type enum (from packages/shared/src/ai.mts)
const AiProvider = {
  OpenAI: 'openai',
  Anthropic: 'anthropic',
  XAI: 'Xai',
  Gemini: 'Gemini',
  OpenRouter: 'openrouter',
  Custom: 'custom',
} as const;

type AiProviderType = (typeof AiProvider)[keyof typeof AiProvider];

// Full configuration schema (mirrors db/schema.mts configs table)
const AIConfigSchema = z.object({
  // Provider selection
  aiProvider: z.enum([
    'openai',
    'anthropic',
    'Gemini',
    'Xai',
    'openrouter',
    'custom',
  ]),
  aiModel: z.string().optional(),
  aiBaseUrl: z.string().optional(),

  // API keys for each provider
  openaiKey: z.string().optional(),
  anthropicKey: z.string().optional(),
  geminiKey: z.string().optional(),
  xaiKey: z.string().optional(),
  openrouterKey: z.string().optional(),
  customApiKey: z.string().optional(),
});

type AIConfig = z.infer<typeof AIConfigSchema>;

// =============================================================================
// Default Models
// =============================================================================

// Default models per provider (from packages/shared/src/ai.mts)
const defaultModels: Record<AiProviderType, string> = {
  [AiProvider.OpenAI]: 'chatgpt-4o-latest',
  [AiProvider.Anthropic]: 'claude-3-5-sonnet-latest',
  [AiProvider.Custom]: 'mistral-nemo',
  [AiProvider.XAI]: 'grok-beta',
  [AiProvider.Gemini]: 'gemini-1.5-pro-latest',
  [AiProvider.OpenRouter]: 'anthropic/claude-3-opus-20240229',
} as const;

// Provider base URLs
const providerBaseUrls: Record<AiProviderType, string | undefined> = {
  openai: undefined,        // Uses default OpenAI endpoint
  anthropic: undefined,     // Uses default Anthropic endpoint
  Gemini: undefined,        // Uses default Google endpoint
  Xai: 'https://api.x.ai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  custom: undefined,        // User-provided
};

// =============================================================================
// Helper Functions
// =============================================================================

function getDefaultModel(provider: AiProviderType): string {
  return defaultModels[provider];
}

// Get the API key field name for a provider
function getApiKeyField(provider: AiProviderType): keyof AIConfig {
  const keyMap: Record<AiProviderType, keyof AIConfig> = {
    openai: 'openaiKey',
    anthropic: 'anthropicKey',
    Gemini: 'geminiKey',
    Xai: 'xaiKey',
    openrouter: 'openrouterKey',
    custom: 'customApiKey',
  };
  return keyMap[provider];
}

// Get the API key value from config
function getApiKey(config: AIConfig): string | undefined {
  const keyField = getApiKeyField(config.aiProvider as AiProviderType);
  return config[keyField] as string | undefined;
}

// Validate configuration completeness
function validateConfig(config: AIConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate with Zod first
  const parseResult = AIConfigSchema.safeParse(config);
  if (!parseResult.success) {
    errors.push(...parseResult.error.errors.map(e => e.message));
  }

  // Check API key is set
  const apiKey = getApiKey(config);
  if (!apiKey) {
    errors.push(`Missing API key for provider: ${config.aiProvider}`);
  }

  // Custom provider requires base URL
  if (config.aiProvider === 'custom' && !config.aiBaseUrl) {
    errors.push('Custom provider requires aiBaseUrl to be set');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Demo - Configuration Validation
// =============================================================================

console.log('=== AI Configuration Schema Demo ===\n');

// Example 1: Valid OpenAI configuration
const openaiConfig: AIConfig = {
  aiProvider: 'openai',
  aiModel: 'gpt-4o',
  openaiKey: 'sk-demo-openai-key-12345',
};

console.log('1. OpenAI Configuration:');
console.log(`   Provider: ${openaiConfig.aiProvider}`);
console.log(`   Model: ${openaiConfig.aiModel || getDefaultModel('openai')}`);
console.log(`   API Key: ${getApiKey(openaiConfig) ? '[SET]' : '[MISSING]'}`);

const openaiValidation = validateConfig(openaiConfig);
console.log(`   Valid: ${openaiValidation.valid ? 'Yes' : 'No'}`);

// Example 2: Valid Anthropic configuration
const anthropicConfig: AIConfig = {
  aiProvider: 'anthropic',
  aiModel: 'claude-3-5-sonnet-20241022',
  anthropicKey: 'sk-demo-anthropic-key-67890',
};

console.log('\n2. Anthropic Configuration:');
console.log(`   Provider: ${anthropicConfig.aiProvider}`);
console.log(`   Model: ${anthropicConfig.aiModel}`);
console.log(`   API Key: ${getApiKey(anthropicConfig) ? '[SET]' : '[MISSING]'}`);

const anthropicValidation = validateConfig(anthropicConfig);
console.log(`   Valid: ${anthropicValidation.valid ? 'Yes' : 'No'}`);

// Example 3: Invalid custom configuration (missing baseUrl)
const invalidCustomConfig: AIConfig = {
  aiProvider: 'custom',
  aiModel: 'local-llama',
  customApiKey: 'local-key',
  // Missing aiBaseUrl!
};

console.log('\n3. Invalid Custom Configuration:');
console.log(`   Provider: ${invalidCustomConfig.aiProvider}`);
console.log(`   Model: ${invalidCustomConfig.aiModel}`);
console.log(`   Base URL: ${invalidCustomConfig.aiBaseUrl || '[MISSING]'}`);

const customValidation = validateConfig(invalidCustomConfig);
console.log(`   Valid: ${customValidation.valid ? 'Yes' : 'No'}`);
if (!customValidation.valid) {
  customValidation.errors.forEach(e => console.log(`   Error: ${e}`));
}

// Example 4: xAI configuration (OpenAI-compatible)
const xaiConfig: AIConfig = {
  aiProvider: 'Xai',
  aiModel: 'grok-beta',
  xaiKey: 'xai-demo-key-abcdef',
};

console.log('\n4. xAI Configuration:');
console.log(`   Provider: ${xaiConfig.aiProvider}`);
console.log(`   Model: ${xaiConfig.aiModel}`);
console.log(`   Base URL: ${providerBaseUrls['Xai']}`);
console.log(`   API Key: ${getApiKey(xaiConfig) ? '[SET]' : '[MISSING]'}`);
console.log(`   Note: Uses OpenAI SDK with custom baseURL`);

// Print all available providers
console.log('\n=== Available Providers ===');
Object.entries(defaultModels).forEach(([provider, model]) => {
  const baseUrl = providerBaseUrls[provider as AiProviderType];
  console.log(`\n[${provider}]`);
  console.log(`   Default Model: ${model}`);
  console.log(`   Base URL: ${baseUrl || '(default)'}`);
  console.log(`   Key Field: ${getApiKeyField(provider as AiProviderType)}`);
});
```

---

## SDK Abstraction Layer

The Vercel AI SDK provides a unified interface across all providers. Here's how Srcbook leverages this:

### The LanguageModel Interface

All AI providers return a `LanguageModel` instance that implements the same interface:

```typescript
// Simplified from the AI SDK
interface LanguageModel {
  // Generate text completion
  doGenerate(options: GenerateOptions): Promise<GenerateResult>;

  // Stream text completion
  doStream(options: StreamOptions): Promise<StreamResult>;

  // Provider and model metadata
  provider: string;
  modelId: string;
}
```

### Provider Factory Pattern

Each provider SDK exports a factory function:

```typescript
// OpenAI
import { createOpenAI } from '@ai-sdk/openai';
const openai = createOpenAI({ apiKey: '...' });
const model = openai('gpt-4o');

// Anthropic
import { createAnthropic } from '@ai-sdk/anthropic';
const anthropic = createAnthropic({ apiKey: '...' });
const model = anthropic('claude-3-5-sonnet-20241022');

// Google
import { createGoogleGenerativeAI } from '@ai-sdk/google';
const google = createGoogleGenerativeAI({ apiKey: '...' });
const model = google('gemini-1.5-pro');
```

### OpenAI-Compatible Endpoints

For xAI, OpenRouter, and custom endpoints, the OpenAI SDK is used with a custom `baseURL`:

```typescript
import { createOpenAI } from '@ai-sdk/openai';

// xAI (Grok)
const xai = createOpenAI({
  apiKey: 'xai-key',
  baseURL: 'https://api.x.ai/v1',
  compatibility: 'compatible',
});

// OpenRouter
const openrouter = createOpenAI({
  apiKey: 'openrouter-key',
  baseURL: 'https://openrouter.ai/api/v1',
  compatibility: 'compatible',
});

// Custom (e.g., local Ollama)
const custom = createOpenAI({
  apiKey: 'any-key',  // Some endpoints don't require a key
  baseURL: 'http://localhost:11434/v1',
  compatibility: 'compatible',
});
```

---

## Advanced Demo - Multi-Provider System

This demo shows a complete multi-provider AI configuration manager with mock implementations.

###### multi-provider.ts

```typescript
// Multi-provider AI system (simplified from packages/api/ai/config.mts)
// Uses mock implementations - does NOT make actual API calls

// =============================================================================
// Types
// =============================================================================

interface LanguageModel {
  provider: string;
  modelId: string;
  doGenerate: (prompt: string) => Promise<{ text: string; tokens: number }>;
}

interface ProviderConfig {
  apiKey: string;
  baseURL?: string;
  compatibility?: 'strict' | 'compatible';
}

type ProviderFactory = (config: ProviderConfig) => (modelId: string) => LanguageModel;

// =============================================================================
// Mock Provider Factories
// =============================================================================

// These mock the behavior of the actual AI SDK factories
// In real code, these are imported from @ai-sdk/openai, @ai-sdk/anthropic, etc.

const createMockOpenAI: ProviderFactory = (config) => (modelId) => ({
  provider: config.baseURL ? 'openai-compatible' : 'openai',
  modelId,
  doGenerate: async (prompt: string) => {
    const baseUrl = config.baseURL || 'https://api.openai.com/v1';
    console.log(`  [OpenAI] ${baseUrl}`);
    console.log(`  [Model] ${modelId}`);
    console.log(`  [Prompt] "${prompt.slice(0, 50)}..."`);

    // Simulate API response
    return {
      text: `[Mock OpenAI/${modelId} response]`,
      tokens: Math.floor(Math.random() * 100) + 50,
    };
  },
});

const createMockAnthropic: ProviderFactory = (config) => (modelId) => ({
  provider: 'anthropic',
  modelId,
  doGenerate: async (prompt: string) => {
    console.log(`  [Anthropic] https://api.anthropic.com/v1`);
    console.log(`  [Model] ${modelId}`);
    console.log(`  [Prompt] "${prompt.slice(0, 50)}..."`);

    return {
      text: `[Mock Anthropic/${modelId} response]`,
      tokens: Math.floor(Math.random() * 100) + 50,
    };
  },
});

const createMockGoogle: ProviderFactory = (config) => (modelId) => ({
  provider: 'google',
  modelId,
  doGenerate: async (prompt: string) => {
    console.log(`  [Google] https://generativelanguage.googleapis.com`);
    console.log(`  [Model] ${modelId}`);
    console.log(`  [Prompt] "${prompt.slice(0, 50)}..."`);

    return {
      text: `[Mock Google/${modelId} response]`,
      tokens: Math.floor(Math.random() * 100) + 50,
    };
  },
});

// =============================================================================
// AI Configuration Manager
// =============================================================================

interface AIManagerConfig {
  provider: string;
  model: string;
  apiKeys: Record<string, string>;
  customBaseUrl?: string;
}

class AIConfigManager {
  private config: AIManagerConfig;

  constructor() {
    // Default configuration
    this.config = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKeys: {
        openai: 'sk-mock-openai-key',
        anthropic: 'sk-mock-anthropic-key',
        gemini: 'mock-gemini-key',
        xai: 'xai-mock-key',
        openrouter: 'sk-or-mock-key',
        custom: 'local-key',
      },
    };
  }

  // Switch to a different provider/model
  setProvider(provider: string, model?: string): void {
    this.config.provider = provider;
    if (model) {
      this.config.model = model;
    } else {
      // Use default model for provider
      this.config.model = this.getDefaultModel(provider);
    }
    console.log(`Switched to ${provider}/${this.config.model}`);
  }

  // Set custom base URL (for 'custom' provider)
  setCustomBaseUrl(url: string): void {
    this.config.customBaseUrl = url;
  }

  // Get default model for a provider
  private getDefaultModel(provider: string): string {
    const defaults: Record<string, string> = {
      openai: 'chatgpt-4o-latest',
      anthropic: 'claude-3-5-sonnet-latest',
      Gemini: 'gemini-1.5-pro-latest',
      Xai: 'grok-beta',
      openrouter: 'anthropic/claude-3-opus-20240229',
      custom: 'mistral-nemo',
    };
    return defaults[provider] || 'default-model';
  }

  // Get the configured LanguageModel instance
  // This mirrors packages/api/ai/config.mts getModel()
  getModel(): LanguageModel {
    const { provider, model, apiKeys, customBaseUrl } = this.config;

    switch (provider) {
      case 'openai':
        if (!apiKeys.openai) {
          throw new Error('OpenAI API key is not set');
        }
        return createMockOpenAI({
          apiKey: apiKeys.openai,
          compatibility: 'strict',
        })(model);

      case 'anthropic':
        if (!apiKeys.anthropic) {
          throw new Error('Anthropic API key is not set');
        }
        return createMockAnthropic({
          apiKey: apiKeys.anthropic,
        })(model);

      case 'Gemini':
        if (!apiKeys.gemini) {
          throw new Error('Gemini API key is not set');
        }
        return createMockGoogle({
          apiKey: apiKeys.gemini,
        })(model);

      case 'Xai':
        if (!apiKeys.xai) {
          throw new Error('xAI API key is not set');
        }
        // xAI uses OpenAI-compatible API
        return createMockOpenAI({
          apiKey: apiKeys.xai,
          baseURL: 'https://api.x.ai/v1',
          compatibility: 'compatible',
        })(model);

      case 'openrouter':
        if (!apiKeys.openrouter) {
          throw new Error('OpenRouter API key is not set');
        }
        // OpenRouter uses OpenAI-compatible API
        return createMockOpenAI({
          apiKey: apiKeys.openrouter,
          baseURL: 'https://openrouter.ai/api/v1',
          compatibility: 'compatible',
        })(model);

      case 'custom':
        if (!customBaseUrl) {
          throw new Error('Custom provider requires baseURL');
        }
        // Custom uses OpenAI-compatible API
        return createMockOpenAI({
          apiKey: apiKeys.custom || 'bogus',
          baseURL: customBaseUrl,
          compatibility: 'compatible',
        })(model);

      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  // Generate text using the configured model
  async generateText(prompt: string): Promise<string> {
    const model = this.getModel();
    console.log(`\nGenerating with ${model.provider}/${model.modelId}...`);

    const result = await model.doGenerate(prompt);
    console.log(`  [Tokens used] ${result.tokens}`);

    return result.text;
  }

  // Health check endpoint (mirrors /ai/healthcheck in server/http.mts)
  async healthCheck(): Promise<{
    configured: boolean;
    provider: string;
    model: string;
    error?: string;
  }> {
    try {
      const model = this.getModel();
      // In real code, this makes a minimal API call to verify the key works
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
        error: (e as Error).message,
      };
    }
  }

  // Get current configuration summary
  getConfigSummary(): Record<string, string> {
    return {
      provider: this.config.provider,
      model: this.config.model,
      customBaseUrl: this.config.customBaseUrl || '(not set)',
    };
  }
}

// =============================================================================
// Demo
// =============================================================================

async function demo() {
  const ai = new AIConfigManager();

  console.log('=== Multi-Provider AI Demo ===\n');

  // Health check
  console.log('1. Initial Health Check:');
  const health = await ai.healthCheck();
  console.log(`   Configured: ${health.configured}`);
  console.log(`   Provider: ${health.provider}`);
  console.log(`   Model: ${health.model}`);

  // Test with default provider (OpenAI)
  console.log('\n2. Generate with OpenAI (default):');
  await ai.generateText('Write a function that calculates factorial');

  // Switch to Anthropic
  console.log('\n3. Switch to Anthropic:');
  ai.setProvider('anthropic', 'claude-3-5-sonnet-20241022');
  await ai.generateText('Explain the factory pattern in TypeScript');

  // Switch to Google Gemini
  console.log('\n4. Switch to Google Gemini:');
  ai.setProvider('Gemini', 'gemini-1.5-pro');
  await ai.generateText('Generate a React component for a todo list');

  // Switch to xAI (OpenAI-compatible)
  console.log('\n5. Switch to xAI (OpenAI-compatible):');
  ai.setProvider('Xai', 'grok-beta');
  await ai.generateText('What are the best practices for error handling?');

  // Switch to OpenRouter
  console.log('\n6. Switch to OpenRouter:');
  ai.setProvider('openrouter', 'anthropic/claude-3-opus-20240229');
  await ai.generateText('Compare REST and GraphQL APIs');

  // Switch to Custom (local Ollama)
  console.log('\n7. Switch to Custom (local endpoint):');
  ai.setProvider('custom', 'llama3.2');
  ai.setCustomBaseUrl('http://localhost:11434/v1');
  await ai.generateText('What is dependency injection?');

  // Final summary
  console.log('\n=== Final Configuration ===');
  const summary = ai.getConfigSummary();
  Object.entries(summary).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });

  console.log('\nAll providers tested successfully!');
}

demo();
```

---

## Deep Dive - Source File Analysis

Let's examine how AI integration is implemented in Srcbook's actual source code.

### 1. ai/config.mts - Provider Configuration

**Location:** `packages/api/ai/config.mts`

This is the core file that handles AI provider selection:

```typescript
// Simplified version of the actual implementation

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { getConfig } from '../config.mjs';
import type { LanguageModel } from 'ai';

export async function getModel(): Promise<LanguageModel> {
  const config = await getConfig();
  const { aiModel, aiProvider, aiBaseUrl } = config;

  switch (aiProvider) {
    case 'openai':
      if (!config.openaiKey) throw new Error('OpenAI API key is not set');
      return createOpenAI({
        compatibility: 'strict',
        apiKey: config.openaiKey,
      })(aiModel);

    case 'anthropic':
      if (!config.anthropicKey) throw new Error('Anthropic API key is not set');
      return createAnthropic({ apiKey: config.anthropicKey })(aiModel);

    case 'Gemini':
      if (!config.geminiKey) throw new Error('Gemini API key is not set');
      return createGoogleGenerativeAI({ apiKey: config.geminiKey })(aiModel);

    case 'Xai':
      if (!config.xaiKey) throw new Error('Xai API key is not set');
      return createOpenAI({
        compatibility: 'compatible',
        baseURL: 'https://api.x.ai/v1',
        apiKey: config.xaiKey,
      })(aiModel);

    case 'openrouter':
      if (!config.openrouterKey) throw new Error('OpenRouter API key is not set');
      return createOpenAI({
        compatibility: 'compatible',
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: config.openrouterKey,
      })(aiModel);

    case 'custom':
      if (!aiBaseUrl) throw new Error('Local AI base URL is not set');
      return createOpenAI({
        compatibility: 'compatible',
        apiKey: config.customApiKey || 'bogus',
        baseURL: aiBaseUrl,
      })(aiModel);
  }
}
```

**Key Points:**
- Uses a switch statement for provider selection
- Each case validates the API key before creating the client
- OpenAI-compatible providers (xAI, OpenRouter, custom) use `createOpenAI` with custom `baseURL`
- Returns a unified `LanguageModel` type regardless of provider

### 2. db/schema.mts - Configuration Schema

**Location:** `packages/api/db/schema.mts`

Defines the database schema for storing AI configuration:

```typescript
// Relevant portion of the configs table

export const configs = sqliteTable('config', {
  // ... other fields ...

  // API keys for each provider
  openaiKey: text('openai_api_key'),
  anthropicKey: text('anthropic_api_key'),
  xaiKey: text('xai_api_key'),
  geminiKey: text('gemini_api_key'),
  openrouterKey: text('openrouter_api_key'),
  customApiKey: text('custom_api_key'),

  // Provider selection
  aiProvider: text('ai_provider').notNull().default('openai'),
  aiModel: text('ai_model').default('gpt-4o'),
  aiBaseUrl: text('ai_base_url'),  // For custom endpoints
});
```

**Key Points:**
- All API keys stored in the same table
- Default provider is OpenAI
- `aiBaseUrl` only used for custom provider

### 3. config.mts - CRUD Operations

**Location:** `packages/api/config.mts`

Provides functions to read and update configuration:

```typescript
// Get current configuration
export async function getConfig(): Promise<Config> {
  const results = await db.select().from(configs);
  return results[0] as Config;
}

// Update configuration
export async function updateConfig(attrs: Partial<Config>) {
  return db.update(configs).set(attrs).returning();
}
```

**Key Points:**
- Single config row in database
- `updateConfig` accepts partial updates
- Configuration persists across server restarts

### 4. server/http.mts - HTTP Endpoints

**Location:** `packages/api/server/http.mts`

Exposes AI configuration through HTTP API:

```typescript
// Health check endpoint
router.get('/ai/healthcheck', cors(), async (_req, res) => {
  try {
    const result = await healthcheck();
    return res.json({ error: false, result });
  } catch (e) {
    return res.json({ error: true, result: error.stack });
  }
});

// Settings endpoint (includes AI config)
router.get('/settings', cors(), async (_req, res) => {
  const config = await getConfig();
  return res.json({ error: false, result: config });
});

router.post('/settings', cors(), async (req, res) => {
  const updated = await updateConfig(req.body);
  return res.json({ result: updated });
});
```

**Key Points:**
- `/ai/healthcheck` - Tests if AI is properly configured
- `/settings` GET - Retrieves all settings including AI config
- `/settings` POST - Updates any settings including AI config

---

## Interactive Exercise - AI Provider Registry

Build a more sophisticated AI provider system with fallback logic and health monitoring.

###### ai-registry-exercise.ts

```typescript
// Exercise: Build an AI Provider Registry
//
// Challenge:
// 1. Create a registry that supports dynamic provider registration
// 2. Implement fallback logic (if primary fails, try secondary)
// 3. Add rate limiting awareness
// 4. Track provider health metrics

// =============================================================================
// Types (provided)
// =============================================================================

interface ProviderConfig {
  apiKey: string;
  baseURL?: string;
}

interface LanguageModel {
  provider: string;
  modelId: string;
  generate: (prompt: string) => Promise<string>;
}

interface ProviderEntry {
  name: string;
  priority: number;
  factory: (modelId: string) => LanguageModel;
  healthCheck: () => Promise<boolean>;
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

interface HealthMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  lastCallTime: number | null;
  lastError: string | null;
}

// =============================================================================
// Mock Provider Factories (provided)
// =============================================================================

function createMockProvider(
  name: string,
  shouldFail: boolean = false
): (modelId: string) => LanguageModel {
  return (modelId: string) => ({
    provider: name,
    modelId,
    generate: async (prompt: string) => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));

      if (shouldFail) {
        throw new Error(`${name} provider failed`);
      }

      return `[${name}/${modelId}] Response to: ${prompt.slice(0, 30)}...`;
    },
  });
}

// =============================================================================
// TODO: Implement AIProviderRegistry
// =============================================================================

class AIProviderRegistry {
  private providers: Map<string, ProviderEntry> = new Map();
  private metrics: Map<string, HealthMetrics> = new Map();
  private fallbackOrder: string[] = [];

  /**
   * Register a new provider
   *
   * TODO: Implement this method
   * - Add the provider to the providers map
   * - Initialize metrics for this provider
   * - Update fallback order based on priority
   */
  register(entry: ProviderEntry): void {
    // TODO: Your implementation here

    // Hint: Initialize metrics like this:
    // this.metrics.set(entry.name, {
    //   totalCalls: 0,
    //   successfulCalls: 0,
    //   failedCalls: 0,
    //   lastCallTime: null,
    //   lastError: null,
    // });

    throw new Error('Not implemented: register()');
  }

  /**
   * Set the fallback order for providers
   *
   * TODO: Implement this method
   * - Validate that all providers exist
   * - Store the fallback order
   */
  setFallbackOrder(providers: string[]): void {
    // TODO: Your implementation here

    throw new Error('Not implemented: setFallbackOrder()');
  }

  /**
   * Call an AI provider with automatic fallback
   *
   * TODO: Implement this method
   * - Try the preferred provider first (or first in fallback order)
   * - If it fails, try the next provider in the fallback order
   * - Track success/failure metrics
   * - Return the response or throw if all providers fail
   */
  async call(
    modelId: string,
    prompt: string,
    preferredProvider?: string
  ): Promise<{ response: string; provider: string }> {
    // TODO: Your implementation here

    // Hint: The flow should be:
    // 1. Determine which providers to try (preferred first, then fallbacks)
    // 2. Loop through providers, attempting each one
    // 3. Update metrics on success or failure
    // 4. Return on first success, or throw if all fail

    throw new Error('Not implemented: call()');
  }

  /**
   * Get health report for all providers
   *
   * TODO: Implement this method
   * - Calculate success rate for each provider
   * - Return a summary of provider health
   */
  getHealthReport(): Record<string, {
    successRate: number;
    totalCalls: number;
    lastError: string | null;
  }> {
    // TODO: Your implementation here

    throw new Error('Not implemented: getHealthReport()');
  }

  /**
   * Get the list of registered providers
   */
  getProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}

// =============================================================================
// Test Your Implementation
// =============================================================================

async function testRegistry() {
  console.log('=== AI Provider Registry Test ===\n');

  const registry = new AIProviderRegistry();

  // Register providers
  console.log('1. Registering providers...');

  // OpenAI - primary, reliable
  registry.register({
    name: 'openai',
    priority: 1,
    factory: createMockProvider('openai'),
    healthCheck: async () => true,
    rateLimits: { requestsPerMinute: 60, tokensPerMinute: 90000 },
  });

  // Anthropic - secondary
  registry.register({
    name: 'anthropic',
    priority: 2,
    factory: createMockProvider('anthropic'),
    healthCheck: async () => true,
    rateLimits: { requestsPerMinute: 40, tokensPerMinute: 100000 },
  });

  // Unreliable provider (for testing fallback)
  registry.register({
    name: 'unreliable',
    priority: 3,
    factory: createMockProvider('unreliable', true), // Always fails
    healthCheck: async () => false,
    rateLimits: { requestsPerMinute: 10, tokensPerMinute: 10000 },
  });

  console.log(`   Registered: ${registry.getProviders().join(', ')}`);

  // Set fallback order
  console.log('\n2. Setting fallback order...');
  registry.setFallbackOrder(['unreliable', 'openai', 'anthropic']);
  console.log('   Order: unreliable -> openai -> anthropic');

  // Test calls
  console.log('\n3. Testing calls with fallback...');

  // Call 1: Should fallback from unreliable to openai
  try {
    const result1 = await registry.call('gpt-4o', 'Write a hello world function');
    console.log(`   Call 1 success: ${result1.provider}`);
  } catch (e) {
    console.log(`   Call 1 failed: ${(e as Error).message}`);
  }

  // Call 2: Explicitly use anthropic
  try {
    const result2 = await registry.call('claude-3', 'Explain recursion', 'anthropic');
    console.log(`   Call 2 success: ${result2.provider}`);
  } catch (e) {
    console.log(`   Call 2 failed: ${(e as Error).message}`);
  }

  // Call 3: Another fallback test
  try {
    const result3 = await registry.call('grok-beta', 'What is TypeScript?');
    console.log(`   Call 3 success: ${result3.provider}`);
  } catch (e) {
    console.log(`   Call 3 failed: ${(e as Error).message}`);
  }

  // Health report
  console.log('\n4. Health Report:');
  const report = registry.getHealthReport();
  Object.entries(report).forEach(([provider, stats]) => {
    console.log(`   ${provider}:`);
    console.log(`      Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
    console.log(`      Total Calls: ${stats.totalCalls}`);
    if (stats.lastError) {
      console.log(`      Last Error: ${stats.lastError}`);
    }
  });

  console.log('\nTest complete!');
}

// Run the test
// Uncomment the line below after implementing the registry
// testRegistry();

console.log('Exercise: Implement the AIProviderRegistry class');
console.log('Then uncomment testRegistry() to verify your implementation.');
console.log('\nHints:');
console.log('- Use Map for storing providers and metrics');
console.log('- Sort fallbackOrder by provider priority');
console.log('- Track metrics in try/catch blocks');
console.log('- Success rate = successfulCalls / totalCalls');
```

---

## Source References

| File | Purpose | Key Functions |
|------|---------|---------------|
| `packages/api/ai/config.mts` | Provider configuration and model creation | `getModel()` |
| `packages/api/db/schema.mts` | Database schema for AI settings | `configs` table definition |
| `packages/api/config.mts` | Configuration CRUD operations | `getConfig()`, `updateConfig()` |
| `packages/api/server/http.mts` | AI-related HTTP endpoints | `/ai/healthcheck`, `/settings` |
| `packages/shared/src/ai.mts` | Provider types and defaults | `AiProvider`, `defaultModels`, `getDefaultModel()` |

---

## Next Steps

Now that you understand AI integration, explore these related topics:

1. **Cell Execution** - How generated code gets executed
   - File: `packages/api/srcbook/examples/internals/cell-execution.src.md`

2. **WebSocket Protocol** - How AI responses are streamed to the UI
   - File: `packages/api/srcbook/examples/internals/websocket-protocol.src.md`

3. **App Builder** - How AI generates complete applications
   - File: `packages/api/srcbook/examples/internals/app-builder.src.md`

---

## Summary

### Key Takeaways

1. **Unified Provider Architecture**
   - Srcbook supports 6 AI providers through the Vercel AI SDK
   - OpenAI, Anthropic, and Google have dedicated SDK packages
   - xAI, OpenRouter, and custom endpoints use OpenAI SDK with custom `baseURL`

2. **Configuration Flow**
   - Settings stored in SQLite `configs` table
   - `getModel()` function handles provider selection
   - `/ai/healthcheck` endpoint validates configuration

3. **LanguageModel Abstraction**
   - All providers return the same `LanguageModel` interface
   - AI SDK provides `generateText()` and `streamText()` functions
   - Provider differences hidden behind unified API

4. **Extension Patterns**
   - New providers added by extending the switch statement
   - OpenAI-compatible APIs only need `baseURL` configuration
   - API keys stored in dedicated database columns

### Provider Quick Reference

```
OpenAI:     createOpenAI({ apiKey, compatibility: 'strict' })
Anthropic:  createAnthropic({ apiKey })
Google:     createGoogleGenerativeAI({ apiKey })
xAI:        createOpenAI({ apiKey, baseURL: 'https://api.x.ai/v1', compatibility: 'compatible' })
OpenRouter: createOpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1', compatibility: 'compatible' })
Custom:     createOpenAI({ apiKey, baseURL: customUrl, compatibility: 'compatible' })
```
