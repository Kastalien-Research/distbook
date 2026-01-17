<!-- srcbook:{"language":"typescript"} -->

# Database Layer - SQLite Persistence

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "@types/node": "latest",
    "zod": "^3.24.1",
    "tsx": "latest",
    "typescript": "latest"
  }
}
```

## Introduction

**What is the Database Layer?**

Srcbook uses SQLite with Drizzle ORM to persist all application data. This includes:

- **Configuration**: AI provider settings, API keys, default language preferences
- **Secrets**: Environment variables that can be associated with sessions
- **Apps**: Application data with conversation history
- **MCP Data**: Model Context Protocol server configurations, tokens, and audit logs

The database file lives at `~/.srcbook/srcbook.db` and is automatically created and migrated on startup.

**Why does it matter?**

Understanding the database layer is crucial because:

- It's the foundation for extending Srcbook with new persistent features
- It shows how to use Drizzle ORM with SQLite in a TypeScript application
- The migration system demonstrates best practices for schema evolution
- It reveals how configuration and secrets are managed securely

**Prerequisites**

Before diving into this Srcbook, you should be familiar with:

- TypeScript basics
- SQL fundamentals (tables, columns, relationships)
- Basic ORM concepts

**Learning Objectives**

By the end of this Srcbook, you will understand:

- How Srcbook initializes and connects to SQLite
- The complete database schema with all tables
- Drizzle ORM patterns for type-safe queries
- The migration system and how to extend it
- How to add new tables and features

## Key Concepts

### Database Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Srcbook Database Architecture            │
│                                                             │
│  Location: ~/.srcbook/srcbook.db                            │
│  Engine: SQLite (via better-sqlite3)                        │
│  ORM: Drizzle                                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              packages/api/db/                        │   │
│  │                                                      │   │
│  │  index.mts    - Database connection & migration     │   │
│  │  schema.mts   - Table definitions (Drizzle)         │   │
│  └─────────────────────────────────────────────────────┘   │
│                        │                                    │
│                        ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              packages/api/config.mts                 │   │
│  │                                                      │   │
│  │  getConfig(), updateConfig()                        │   │
│  │  getSecrets(), addSecret(), removeSecret()          │   │
│  │  associateSecretWithSession()                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                        │                                    │
│                        ▼                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              packages/api/drizzle/                   │   │
│  │                                                      │   │
│  │  0000_initial.sql                                   │   │
│  │  0001_favorite_language.sql                         │   │
│  │  ... 18 migration files ...                         │   │
│  │  0017_add_mcp_tables.sql                            │   │
│  │  meta/_journal.json (migration tracking)            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Schema Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Database Schema                          │
│                                                             │
│  CONFIG TABLE (Singleton)                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ baseDir, defaultLanguage, aiProvider, aiModel        │  │
│  │ openaiKey, anthropicKey, geminiKey, xaiKey           │  │
│  │ openrouterKey, customApiKey, aiBaseUrl               │  │
│  │ subscriptionEmail, installId, enabledAnalytics       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  SECRETS TABLE                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ id (PK) | name (unique) | value                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                     │                                       │
│                     ▼ Foreign Key                           │
│  SECRETS_TO_SESSIONS (Junction Table)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ id (PK) | session_id | secret_id (FK)                │  │
│  │ Constraint: unique(session_id, secret_id)            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  APPS TABLE                                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ id (PK) | name | externalId (unique)                 │  │
│  │ history (JSON) | historyVersion                      │  │
│  │ createdAt | updatedAt                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  MCP_SERVERS TABLE                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ id (PK) | name | transport ('stdio'|'http')          │  │
│  │ config (JSON) | enabled | autoConnect | timeout      │  │
│  │ lastConnectedAt | createdAt | updatedAt              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  MCP_TOKENS TABLE                                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ id (PK) | tokenHash (unique) | clientName            │  │
│  │ permissions (JSON[]) | createdAt | expiresAt         │  │
│  │ lastUsedAt | revokedAt                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  MCP_TOOL_INVOCATIONS TABLE                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ id (PK auto) | sessionId | serverId | clientId       │  │
│  │ toolName | input (JSON) | output (JSON) | error      │  │
│  │ durationMs | createdAt                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  MCP_RESOURCE_SUBSCRIPTIONS TABLE                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ id (PK auto) | subscriptionId (unique) | sessionId   │  │
│  │ serverId | resourceUri | active | createdAt          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Core Concepts

**Concept 1: Drizzle ORM**

Drizzle is a TypeScript ORM that provides:
- Type-safe query building
- Schema-first design with `$inferSelect` and `$inferInsert` type helpers
- SQL-like syntax that's easy to understand
- Automatic migrations via Drizzle Kit

**Concept 2: SQLite Advantages**

SQLite is perfect for Srcbook because:
- Zero configuration - just a single file
- ACID compliant - reliable transactions
- Fast for local operations
- Easy to back up (copy the file)
- No separate database server needed

**Concept 3: Migration System**

Drizzle Kit handles schema migrations:
- Each migration is a numbered SQL file
- `_journal.json` tracks which migrations have been applied
- Migrations run automatically on startup
- Forward-only (no rollback by default)

## Simple Demo: Mock Database Operations

Let's demonstrate the core database patterns using mock implementations that mirror how Srcbook actually works.

###### simple-demo.ts

```typescript
// This demonstrates Drizzle ORM patterns using mock implementations
// In the real Srcbook, these patterns are used with actual SQLite

import { z } from 'zod';

// =============================================================================
// Schema Definitions (mirrors packages/api/db/schema.mts)
// =============================================================================

// Config schema - represents the singleton configuration row
const ConfigSchema = z.object({
  baseDir: z.string(),
  defaultLanguage: z.enum(['typescript', 'javascript']),
  aiProvider: z.enum(['openai', 'anthropic', 'google', 'xai', 'openrouter', 'custom']),
  aiModel: z.string().nullable(),
  openaiKey: z.string().nullable(),
  anthropicKey: z.string().nullable(),
  geminiKey: z.string().nullable(),
  xaiKey: z.string().nullable(),
  openrouterKey: z.string().nullable(),
  customApiKey: z.string().nullable(),
  aiBaseUrl: z.string().nullable(),
  enabledAnalytics: z.boolean(),
  installId: z.string(),
  subscriptionEmail: z.string().nullable(),
});

type Config = z.infer<typeof ConfigSchema>;

// Secret schema
const SecretSchema = z.object({
  id: z.number(),
  name: z.string(),
  value: z.string(),
});

type Secret = z.infer<typeof SecretSchema>;

// App schema
const AppSchema = z.object({
  id: z.number(),
  name: z.string(),
  externalId: z.string(),
  history: z.string(), // JSON encoded
  historyVersion: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type App = z.infer<typeof AppSchema>;

// =============================================================================
// Mock Database Implementation
// =============================================================================

class MockDatabase {
  private config: Config | null = null;
  private secrets: Map<number, Secret> = new Map();
  private secretsToSession: Map<string, Set<number>> = new Map();
  private apps: Map<number, App> = new Map();
  private nextSecretId = 1;
  private nextAppId = 1;

  // Helper to generate unique IDs (like randomid() in Srcbook)
  private randomid(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // ==========================================================================
  // Initialization (mirrors db/index.mts)
  // ==========================================================================

  async init(): Promise<void> {
    // In real Srcbook: drizzle(new Database(DB_PATH), { schema })
    // followed by migrate(db, { migrationsFolder: drizzleFolder })

    // Check for existing config (like config.mts init())
    if (!this.config) {
      const defaultConfig: Config = {
        baseDir: process.env.HOME || '/Users/demo',
        defaultLanguage: 'typescript',
        aiProvider: 'openai',
        aiModel: 'gpt-4o',
        openaiKey: null,
        anthropicKey: null,
        geminiKey: null,
        xaiKey: null,
        openrouterKey: null,
        customApiKey: null,
        aiBaseUrl: null,
        enabledAnalytics: true,
        installId: this.randomid(),
        subscriptionEmail: null,
      };
      this.config = defaultConfig;
      console.log('Database initialized with default configuration');
    }
  }

  // ==========================================================================
  // Config Operations (mirrors config.mts)
  // ==========================================================================

  async getConfig(): Promise<Config> {
    // In real Srcbook: db.select().from(configs)
    if (!this.config) {
      throw new Error('No config found - database not initialized');
    }
    return { ...this.config };
  }

  async updateConfig(attrs: Partial<Config>): Promise<Config> {
    // In real Srcbook: db.update(configs).set(attrs).returning()
    if (!this.config) {
      throw new Error('No config found');
    }
    this.config = { ...this.config, ...attrs };
    return { ...this.config };
  }

  // ==========================================================================
  // Secret Operations (mirrors config.mts)
  // ==========================================================================

  async getSecrets(): Promise<Secret[]> {
    // In real Srcbook: db.select().from(secrets)
    return Array.from(this.secrets.values()).map(s => ({ ...s }));
  }

  async addSecret(name: string, value: string): Promise<Secret> {
    // In real Srcbook uses onConflictDoUpdate for upsert behavior:
    // db.insert(secrets).values({ name, value })
    //   .onConflictDoUpdate({ target: secrets.name, set: { value } })

    // Check for existing secret with same name (upsert)
    for (const secret of this.secrets.values()) {
      if (secret.name === name) {
        secret.value = value;
        return { ...secret };
      }
    }

    // Create new secret
    const secret: Secret = {
      id: this.nextSecretId++,
      name,
      value,
    };
    this.secrets.set(secret.id, secret);
    return { ...secret };
  }

  async removeSecret(name: string): Promise<boolean> {
    // In real Srcbook: db.delete(secrets).where(eq(secrets.name, name))
    for (const [id, secret] of this.secrets) {
      if (secret.name === name) {
        this.secrets.delete(id);
        // Also clean up any session associations
        for (const [_, secretIds] of this.secretsToSession) {
          secretIds.delete(id);
        }
        return true;
      }
    }
    return false;
  }

  async associateSecretWithSession(secretName: string, sessionId: string): Promise<void> {
    // In real Srcbook: Insert into secretsToSession junction table
    const secret = Array.from(this.secrets.values()).find(s => s.name === secretName);
    if (!secret) {
      throw new Error(`Cannot find secret with name: ${secretName}`);
    }

    if (!this.secretsToSession.has(sessionId)) {
      this.secretsToSession.set(sessionId, new Set());
    }
    this.secretsToSession.get(sessionId)!.add(secret.id);
  }

  async getSecretsForSession(sessionId: string): Promise<Record<string, string>> {
    // In real Srcbook: Join secrets with secretsToSession
    const secretIds = this.secretsToSession.get(sessionId) || new Set();
    const result: Record<string, string> = {};

    for (const secret of this.secrets.values()) {
      if (secretIds.has(secret.id)) {
        result[secret.name] = secret.value;
      }
    }

    return result;
  }

  // ==========================================================================
  // App Operations
  // ==========================================================================

  async createApp(name: string): Promise<App> {
    // In real Srcbook: db.insert(apps).values(...)
    const now = new Date();
    const app: App = {
      id: this.nextAppId++,
      name,
      externalId: `app-${this.randomid()}`,
      history: '[]',
      historyVersion: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.apps.set(app.id, app);
    return { ...app };
  }

  async getApps(): Promise<App[]> {
    return Array.from(this.apps.values()).map(a => ({ ...a }));
  }

  async appendToHistory(appId: string, messages: any[]): Promise<void> {
    // In real Srcbook: Update apps table history JSON field
    for (const app of this.apps.values()) {
      if (app.externalId === appId) {
        const history = JSON.parse(app.history);
        history.push(...messages);
        app.history = JSON.stringify(history);
        app.updatedAt = new Date();
        return;
      }
    }
    throw new Error(`App not found: ${appId}`);
  }
}

// =============================================================================
// Demo
// =============================================================================

console.log('=== Srcbook Database Layer Demo ===\n');

const db = new MockDatabase();
await db.init();

// Config operations
console.log('1. Configuration Management');
console.log('----------------------------');
const config = await db.getConfig();
console.log(`   Default language: ${config.defaultLanguage}`);
console.log(`   AI provider: ${config.aiProvider}`);
console.log(`   AI model: ${config.aiModel}`);
console.log(`   Install ID: ${config.installId.slice(0, 12)}...`);

console.log('\n   Updating to Anthropic...');
await db.updateConfig({
  aiProvider: 'anthropic',
  aiModel: 'claude-3-5-sonnet-20241022',
});
const updated = await db.getConfig();
console.log(`   New provider: ${updated.aiProvider}`);
console.log(`   New model: ${updated.aiModel}`);

// Secret operations
console.log('\n2. Secrets Management');
console.log('---------------------');
await db.addSecret('DATABASE_URL', 'postgres://localhost:5432/mydb');
await db.addSecret('API_KEY', 'sk-secret-key-12345');
await db.addSecret('JWT_SECRET', 'super-secret-jwt-token');

const secrets = await db.getSecrets();
console.log(`   Added ${secrets.length} secrets:`);
secrets.forEach(s => {
  console.log(`   - ${s.name}: ${s.value.slice(0, 15)}...`);
});

// Associate secrets with a session
console.log('\n   Associating secrets with session "session-123"...');
await db.associateSecretWithSession('DATABASE_URL', 'session-123');
await db.associateSecretWithSession('API_KEY', 'session-123');

const sessionSecrets = await db.getSecretsForSession('session-123');
console.log(`   Session has ${Object.keys(sessionSecrets).length} secrets:`);
Object.keys(sessionSecrets).forEach(name => {
  console.log(`   - ${name}`);
});

// App operations
console.log('\n3. App Management');
console.log('-----------------');
const app = await db.createApp('My Todo App');
console.log(`   Created app: ${app.name}`);
console.log(`   External ID: ${app.externalId}`);

await db.appendToHistory(app.externalId, [
  { role: 'user', content: 'Create a todo list' },
  { role: 'assistant', content: 'Here is your todo list...' },
]);
console.log('   Appended conversation history');

// Schema validation
console.log('\n4. Schema Validation');
console.log('--------------------');
console.log(`   Config valid: ${ConfigSchema.safeParse(config).success ? 'Yes' : 'No'}`);
console.log(`   Secret valid: ${SecretSchema.safeParse(secrets[0]).success ? 'Yes' : 'No'}`);
console.log(`   App valid: ${AppSchema.safeParse(app).success ? 'Yes' : 'No'}`);

console.log('\n=== Demo Complete ===');
```

## Explanation: Drizzle ORM Patterns

Let's break down the key Drizzle ORM patterns used in Srcbook:

### Pattern 1: Schema Definition

In `packages/api/db/schema.mts`, tables are defined using `sqliteTable`:

```typescript
// Actual code from schema.mts
export const configs = sqliteTable('config', {
  baseDir: text('base_dir').notNull(),
  defaultLanguage: text('default_language').notNull().default('typescript'),
  openaiKey: text('openai_api_key'),
  // ... more columns
  installId: text('srcbook_installation_id').notNull().default(randomid()),
});
```

**Key points:**
- `text()` creates a TEXT column
- `integer()` creates an INTEGER column
- `.notNull()` adds NOT NULL constraint
- `.default()` sets a default value
- `.unique()` adds a UNIQUE constraint
- `.primaryKey()` designates the primary key

### Pattern 2: Type Inference

Drizzle provides `$inferSelect` and `$inferInsert` for type safety:

```typescript
export type Config = typeof configs.$inferSelect;
export type Secret = typeof secrets.$inferSelect;
```

This means TypeScript knows exactly what shape your data has, preventing runtime errors.

### Pattern 3: Database Initialization

In `packages/api/db/index.mts`:

```typescript
const DB_PATH = `${HOME_DIR}/.srcbook/srcbook.db`;
export const db = drizzle(new Database(DB_PATH), { schema });
migrate(db, { migrationsFolder: drizzleFolder });
```

This:
1. Creates the SQLite database file if it doesn't exist
2. Wraps it with Drizzle ORM
3. Runs any pending migrations automatically

### Pattern 4: Query Operations

**Select:**
```typescript
const results = await db.select().from(configs);
```

**Insert with conflict handling:**
```typescript
await db.insert(secrets)
  .values({ name, value })
  .onConflictDoUpdate({ target: secrets.name, set: { value } })
  .returning();
```

**Update:**
```typescript
await db.update(configs).set(attrs).returning();
```

**Delete:**
```typescript
await db.delete(secrets).where(eq(secrets.name, name));
```

### Pattern 5: Relations and Joins

The `secretsToSession` junction table shows how to handle many-to-many relationships:

```typescript
export const secretsToSession = sqliteTable(
  'secrets_to_sessions',
  {
    id: integer('id').primaryKey(),
    session_id: text('session_id').notNull(),
    secret_id: integer('secret_id')
      .notNull()
      .references(() => secrets.id),  // Foreign key
  },
  (t) => ({
    unique_session_secret: unique().on(t.session_id, t.secret_id),
  }),
);
```

## Advanced Demo: MCP Tables and Query Building

The MCP (Model Context Protocol) tables demonstrate more advanced Drizzle patterns including timestamps, JSON storage, and complex queries.

###### advanced-demo.ts

```typescript
// Advanced Drizzle patterns: MCP tables simulation

import { z } from 'zod';

// =============================================================================
// MCP Schema Definitions (from packages/api/db/schema.mts)
// =============================================================================

// MCP Server schema
const MCPServerSchema = z.object({
  id: z.string(),
  name: z.string(),
  transport: z.enum(['stdio', 'http']),
  config: z.string(), // JSON: { command, args, env, url, headers }
  enabled: z.boolean(),
  autoConnect: z.boolean(),
  timeout: z.number(),
  lastConnectedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type MCPServer = z.infer<typeof MCPServerSchema>;

// MCP Token schema
const MCPTokenSchema = z.object({
  id: z.string(),
  tokenHash: z.string(),
  clientName: z.string(),
  permissions: z.string(), // JSON array: ["read", "write", "execute"]
  createdAt: z.date(),
  expiresAt: z.date(),
  lastUsedAt: z.date().nullable(),
  revokedAt: z.date().nullable(),
});

type MCPToken = z.infer<typeof MCPTokenSchema>;

// MCP Tool Invocation schema (audit log)
const MCPToolInvocationSchema = z.object({
  id: z.number(),
  sessionId: z.string().nullable(),
  serverId: z.string().nullable(),
  clientId: z.string().nullable(),
  toolName: z.string(),
  input: z.string(), // JSON
  output: z.string().nullable(), // JSON
  error: z.string().nullable(),
  durationMs: z.number().nullable(),
  createdAt: z.date(),
});

type MCPToolInvocation = z.infer<typeof MCPToolInvocationSchema>;

// =============================================================================
// Query Builder Simulation
// =============================================================================

// Simulates Drizzle's query builder patterns
class QueryBuilder<T> {
  private _conditions: Array<(item: T) => boolean> = [];
  private _orderBy: Array<{ key: keyof T; direction: 'asc' | 'desc' }> = [];
  private _limitCount?: number;

  constructor(private data: T[]) {}

  // WHERE clause - filters data
  where(condition: (item: T) => boolean): this {
    this._conditions.push(condition);
    return this;
  }

  // ORDER BY clause
  orderBy(key: keyof T, direction: 'asc' | 'desc' = 'asc'): this {
    this._orderBy.push({ key, direction });
    return this;
  }

  // LIMIT clause
  limit(count: number): this {
    this._limitCount = count;
    return this;
  }

  // Execute the query
  execute(): T[] {
    let result = [...this.data];

    // Apply WHERE conditions
    for (const condition of this._conditions) {
      result = result.filter(condition);
    }

    // Apply ORDER BY
    for (const order of this._orderBy.reverse()) {
      result.sort((a, b) => {
        const va = a[order.key];
        const vb = b[order.key];

        // Handle different types
        if (va instanceof Date && vb instanceof Date) {
          return order.direction === 'asc'
            ? va.getTime() - vb.getTime()
            : vb.getTime() - va.getTime();
        }

        if (typeof va === 'string' && typeof vb === 'string') {
          return order.direction === 'asc'
            ? va.localeCompare(vb)
            : vb.localeCompare(va);
        }

        if (typeof va === 'number' && typeof vb === 'number') {
          return order.direction === 'asc' ? va - vb : vb - va;
        }

        return 0;
      });
    }

    // Apply LIMIT
    if (this._limitCount !== undefined) {
      result = result.slice(0, this._limitCount);
    }

    return result;
  }

  // Get first result or null
  first(): T | null {
    const results = this.limit(1).execute();
    return results[0] || null;
  }
}

// =============================================================================
// Mock MCP Database
// =============================================================================

class MCPDatabase {
  private servers: MCPServer[] = [];
  private tokens: MCPToken[] = [];
  private invocations: MCPToolInvocation[] = [];
  private nextInvocationId = 1;

  private randomid(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // ==========================================================================
  // MCP Server Operations
  // ==========================================================================

  async insertServer(data: Omit<MCPServer, 'id' | 'createdAt' | 'updatedAt'>): Promise<MCPServer> {
    const now = new Date();
    const server: MCPServer = {
      id: `server-${this.randomid()}`,
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.servers.push(server);
    return server;
  }

  selectServers(): QueryBuilder<MCPServer> {
    return new QueryBuilder(this.servers);
  }

  async updateServer(id: string, updates: Partial<MCPServer>): Promise<MCPServer | null> {
    const server = this.servers.find(s => s.id === id);
    if (!server) return null;

    Object.assign(server, updates, { updatedAt: new Date() });
    return server;
  }

  async deleteServer(id: string): Promise<boolean> {
    const index = this.servers.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.servers.splice(index, 1);
    return true;
  }

  // Upsert pattern (ON CONFLICT DO UPDATE)
  async upsertServer(
    data: Omit<MCPServer, 'createdAt' | 'updatedAt'>,
  ): Promise<MCPServer> {
    const existing = this.servers.find(s => s.id === data.id);

    if (existing) {
      Object.assign(existing, data, { updatedAt: new Date() });
      return existing;
    }

    const now = new Date();
    const server: MCPServer = {
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    this.servers.push(server);
    return server;
  }

  // ==========================================================================
  // MCP Token Operations
  // ==========================================================================

  async createToken(clientName: string, permissions: string[], expiresInMs: number): Promise<MCPToken> {
    const now = new Date();
    const token: MCPToken = {
      id: `token-${this.randomid()}`,
      tokenHash: `hash-${this.randomid()}`, // In real code: SHA-256 hash
      clientName,
      permissions: JSON.stringify(permissions),
      createdAt: now,
      expiresAt: new Date(now.getTime() + expiresInMs),
      lastUsedAt: null,
      revokedAt: null,
    };
    this.tokens.push(token);
    return token;
  }

  selectTokens(): QueryBuilder<MCPToken> {
    return new QueryBuilder(this.tokens);
  }

  async revokeToken(id: string): Promise<boolean> {
    const token = this.tokens.find(t => t.id === id);
    if (!token) return false;
    token.revokedAt = new Date();
    return true;
  }

  // ==========================================================================
  // MCP Tool Invocation Operations (Audit Log)
  // ==========================================================================

  async logInvocation(data: {
    sessionId?: string;
    serverId?: string;
    clientId?: string;
    toolName: string;
    input: any;
    output?: any;
    error?: string;
    durationMs?: number;
  }): Promise<MCPToolInvocation> {
    const invocation: MCPToolInvocation = {
      id: this.nextInvocationId++,
      sessionId: data.sessionId || null,
      serverId: data.serverId || null,
      clientId: data.clientId || null,
      toolName: data.toolName,
      input: JSON.stringify(data.input),
      output: data.output ? JSON.stringify(data.output) : null,
      error: data.error || null,
      durationMs: data.durationMs || null,
      createdAt: new Date(),
    };
    this.invocations.push(invocation);
    return invocation;
  }

  selectInvocations(): QueryBuilder<MCPToolInvocation> {
    return new QueryBuilder(this.invocations);
  }
}

// =============================================================================
// Demo
// =============================================================================

console.log('=== MCP Database Advanced Demo ===\n');

const db = new MCPDatabase();

// 1. Create MCP Servers
console.log('1. Creating MCP Servers');
console.log('-----------------------');

const filesystemServer = await db.insertServer({
  name: 'filesystem',
  transport: 'stdio',
  config: JSON.stringify({
    command: 'npx',
    args: ['@modelcontextprotocol/server-filesystem', '/tmp'],
  }),
  enabled: true,
  autoConnect: false,
  timeout: 30000,
  lastConnectedAt: null,
});
console.log(`   Created: ${filesystemServer.name} (${filesystemServer.transport})`);

const githubServer = await db.insertServer({
  name: 'github',
  transport: 'stdio',
  config: JSON.stringify({
    command: 'npx',
    args: ['@modelcontextprotocol/server-github'],
    env: { GITHUB_TOKEN: '***' },
  }),
  enabled: true,
  autoConnect: true,
  timeout: 60000,
  lastConnectedAt: null,
});
console.log(`   Created: ${githubServer.name} (${githubServer.transport})`);

const httpServer = await db.insertServer({
  name: 'custom-api',
  transport: 'http',
  config: JSON.stringify({
    url: 'https://api.example.com/mcp',
    headers: { 'Authorization': 'Bearer ***' },
  }),
  enabled: false,
  autoConnect: false,
  timeout: 30000,
  lastConnectedAt: null,
});
console.log(`   Created: ${httpServer.name} (${httpServer.transport})`);

// 2. Query Servers with complex conditions
console.log('\n2. Query Patterns');
console.log('-----------------');

// Find enabled servers
const enabledServers = db.selectServers()
  .where(s => s.enabled === true)
  .orderBy('name', 'asc')
  .execute();
console.log(`   Enabled servers: ${enabledServers.map(s => s.name).join(', ')}`);

// Find auto-connect servers
const autoConnectServers = db.selectServers()
  .where(s => s.autoConnect === true)
  .execute();
console.log(`   Auto-connect servers: ${autoConnectServers.map(s => s.name).join(', ')}`);

// Find HTTP transport servers
const httpServers = db.selectServers()
  .where(s => s.transport === 'http')
  .execute();
console.log(`   HTTP servers: ${httpServers.map(s => s.name).join(', ')}`);

// Combined query: enabled stdio servers
const enabledStdioServers = db.selectServers()
  .where(s => s.enabled === true)
  .where(s => s.transport === 'stdio')
  .execute();
console.log(`   Enabled stdio servers: ${enabledStdioServers.map(s => s.name).join(', ')}`);

// 3. Upsert pattern (update if exists, insert if not)
console.log('\n3. Upsert Pattern');
console.log('-----------------');

await db.upsertServer({
  id: filesystemServer.id,
  name: 'filesystem-v2',  // Updated name
  transport: 'stdio',
  config: JSON.stringify({
    command: 'npx',
    args: ['@mcp/server-filesystem', '/home/user'],
  }),
  enabled: true,
  autoConnect: true,  // Changed to true
  timeout: 45000,     // Increased timeout
  lastConnectedAt: new Date(),
});

const updatedServer = db.selectServers()
  .where(s => s.id === filesystemServer.id)
  .first();
console.log(`   Updated server: ${updatedServer?.name}`);
console.log(`   Auto-connect: ${updatedServer?.autoConnect}`);
console.log(`   Timeout: ${updatedServer?.timeout}ms`);

// 4. Token Management
console.log('\n4. Token Management');
console.log('-------------------');

const token1 = await db.createToken('claude-desktop', ['read', 'write'], 24 * 60 * 60 * 1000);
const token2 = await db.createToken('api-client', ['read'], 1 * 60 * 60 * 1000);
console.log(`   Created token for: ${token1.clientName}`);
console.log(`   Created token for: ${token2.clientName}`);

// Find non-revoked tokens
const activeTokens = db.selectTokens()
  .where(t => t.revokedAt === null)
  .where(t => t.expiresAt > new Date())
  .execute();
console.log(`   Active tokens: ${activeTokens.length}`);

// Revoke a token
await db.revokeToken(token2.id);
console.log(`   Revoked token for: ${token2.clientName}`);

// 5. Audit Log (Tool Invocations)
console.log('\n5. Audit Log');
console.log('------------');

// Log some tool invocations
await db.logInvocation({
  sessionId: 'session-abc',
  serverId: filesystemServer.id,
  toolName: 'read_file',
  input: { path: '/tmp/test.txt' },
  output: { content: 'Hello, World!' },
  durationMs: 45,
});

await db.logInvocation({
  sessionId: 'session-abc',
  serverId: filesystemServer.id,
  toolName: 'write_file',
  input: { path: '/tmp/output.txt', content: 'New content' },
  output: { success: true },
  durationMs: 23,
});

await db.logInvocation({
  sessionId: 'session-abc',
  serverId: githubServer.id,
  toolName: 'search_repositories',
  input: { query: 'drizzle orm' },
  error: 'Rate limit exceeded',
  durationMs: 150,
});

// Query invocations
const sessionInvocations = db.selectInvocations()
  .where(i => i.sessionId === 'session-abc')
  .orderBy('createdAt', 'desc')
  .execute();
console.log(`   Session invocations: ${sessionInvocations.length}`);

// Find failed invocations
const failedInvocations = db.selectInvocations()
  .where(i => i.error !== null)
  .execute();
console.log(`   Failed invocations: ${failedInvocations.length}`);

// Calculate average duration for successful calls
const successfulInvocations = db.selectInvocations()
  .where(i => i.error === null)
  .where(i => i.durationMs !== null)
  .execute();
const avgDuration = successfulInvocations.reduce((sum, i) => sum + (i.durationMs || 0), 0) / successfulInvocations.length;
console.log(`   Average duration (successful): ${avgDuration.toFixed(1)}ms`);

// Summary
console.log('\n6. Summary');
console.log('----------');
const allServers = db.selectServers().execute();
const allTokens = db.selectTokens().execute();
const allInvocations = db.selectInvocations().execute();
console.log(`   Total servers: ${allServers.length}`);
console.log(`   Total tokens: ${allTokens.length}`);
console.log(`   Total invocations: ${allInvocations.length}`);

console.log('\n=== Demo Complete ===');
```

## Deep Dive: Implementation Details

### How Srcbook Implements the Database Layer

**1. Database Connection (`packages/api/db/index.mts`)**

The database is initialized in a single location:

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.mjs';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

const DB_PATH = `${HOME_DIR}/.srcbook/srcbook.db`;

// Create database directory if needed
fs.mkdirSync(SRCBOOKS_DIR, { recursive: true });

// Initialize Drizzle with better-sqlite3
export const db = drizzle(new Database(DB_PATH), { schema });

// Run migrations automatically on import
migrate(db, { migrationsFolder: drizzleFolder });
```

**Key points:**
- Uses `better-sqlite3` for synchronous SQLite operations
- Automatically runs migrations on startup
- Exports a single `db` instance used everywhere

**2. Schema Design (`packages/api/db/schema.mts`)**

Tables are defined using Drizzle's fluent API:

```typescript
// Singleton config table
export const configs = sqliteTable('config', {
  baseDir: text('base_dir').notNull(),
  // ...
});

// Table with foreign key relationship
export const secretsToSession = sqliteTable(
  'secrets_to_sessions',
  {
    id: integer('id').primaryKey(),
    session_id: text('session_id').notNull(),
    secret_id: integer('secret_id')
      .notNull()
      .references(() => secrets.id),  // Foreign key
  },
  (t) => ({
    // Composite unique constraint
    unique_session_secret: unique().on(t.session_id, t.secret_id),
  }),
);
```

**3. Migration System (`packages/api/drizzle/`)**

Migrations are SQL files named with a numeric prefix:

```
0000_initial.sql
0001_favorite_language.sql
0002_add-openai-key.sql
...
0017_add_mcp_tables.sql
```

The `meta/_journal.json` tracks applied migrations:

```json
{
  "entries": [
    {
      "idx": 0,
      "when": 1718315667825,
      "tag": "0000_initial"
    },
    // ...
  ]
}
```

**Migration File Example (`0017_add_mcp_tables.sql`):**

```sql
CREATE TABLE `mcp_servers` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `transport` text NOT NULL CHECK (transport IN ('stdio', 'http')),
  `config` text NOT NULL DEFAULT '{}',
  `enabled` integer DEFAULT true NOT NULL,
  ...
);

CREATE INDEX `idx_mcp_servers_enabled` ON `mcp_servers` (`enabled`);
```

### Architecture Details

**Data Flow:**

```
API Request
     │
     ▼
packages/api/config.mts  (Business Logic)
     │
     ├── getConfig()
     ├── updateConfig()
     ├── getSecrets()
     └── addSecret()
           │
           ▼
packages/api/db/index.mts (Database Instance)
           │
           ▼
packages/api/db/schema.mts (Table Definitions)
           │
           ▼
~/.srcbook/srcbook.db (SQLite File)
```

**Initialization Sequence:**

1. Import `db` from `db/index.mts`
2. Drizzle creates/opens SQLite database
3. Migrations run automatically
4. Config module checks for existing config
5. If no config exists, insert defaults
6. Application ready

### Performance Considerations

- **SQLite is synchronous**: Operations block the event loop briefly
- **Connection pooling**: Not needed - single file, single connection
- **Indexes**: Used on frequently queried columns (see MCP tables)
- **JSON columns**: Flexible but not queryable within SQLite

### Common Gotchas

**Gotcha 1: Migration Order**

Migrations must be applied in order. If you create a migration that depends on another, ensure the index number is higher.

**Gotcha 2: Default Values**

SQLite defaults are set at INSERT time. If you add a new column with a default, existing rows won't have the default until updated.

**Gotcha 3: Boolean Storage**

SQLite stores booleans as integers (0/1). Drizzle handles this with `{ mode: 'boolean' }`:

```typescript
enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
```

## Interactive Exercise: Build a Migration Runner

Now it's your turn! Implement a migration runner that tracks and applies migrations.

###### exercise.ts

```typescript
// Exercise: Build a Migration Runner
//
// Your challenge:
// 1. Track which migrations have been applied
// 2. Run pending migrations in order
// 3. Validate migration checksums (bonus)
// 4. Support viewing migration status
//
// This simulates how Drizzle's migrate() function works internally.

import { z } from 'zod';

// Migration definition
interface Migration {
  tag: string;        // e.g., "0001_add_users"
  sql: string;        // The SQL to execute
  checksum?: string;  // Optional checksum for validation
}

// Journal entry (like _journal.json)
interface JournalEntry {
  idx: number;
  when: number;  // timestamp
  tag: string;
}

// Simulated SQL execution result
interface ExecutionResult {
  success: boolean;
  rowsAffected: number;
  error?: string;
}

class MigrationRunner {
  private journal: JournalEntry[] = [];
  private registeredMigrations: Migration[] = [];

  // Register a migration to be run
  register(migration: Migration): void {
    // TODO: Implement this
    // - Add migration to the list
    // - Keep migrations sorted by tag
    throw new Error('Not implemented: register()');
  }

  // Get list of applied migrations
  getApplied(): string[] {
    // TODO: Implement this
    // - Return list of applied migration tags
    throw new Error('Not implemented: getApplied()');
  }

  // Get list of pending migrations
  getPending(): Migration[] {
    // TODO: Implement this
    // - Return migrations not in journal, in order
    throw new Error('Not implemented: getPending()');
  }

  // Simulate executing SQL
  private executeSQL(sql: string): ExecutionResult {
    // Simulate SQL execution
    console.log(`    Executing SQL: ${sql.slice(0, 50)}...`);

    // Simulate occasional failures for demonstration
    if (sql.includes('FAIL')) {
      return { success: false, rowsAffected: 0, error: 'Simulated failure' };
    }

    return { success: true, rowsAffected: 1 };
  }

  // Run a single migration
  async run(migration: Migration): Promise<boolean> {
    // TODO: Implement this
    // - Execute the SQL
    // - If successful, add to journal
    // - Return success/failure
    throw new Error('Not implemented: run()');
  }

  // Run all pending migrations
  async runAll(): Promise<{ applied: string[]; failed: string[] }> {
    // TODO: Implement this
    // - Get pending migrations
    // - Run each in order
    // - Stop on first failure
    // - Return results
    throw new Error('Not implemented: runAll()');
  }

  // Get migration status summary
  getStatus(): {
    applied: number;
    pending: number;
    total: number;
    lastApplied?: string;
  } {
    // TODO: Implement this
    throw new Error('Not implemented: getStatus()');
  }
}

// =============================================================================
// Test Your Implementation
// =============================================================================

console.log('=== Migration Runner Exercise ===\n');

const runner = new MigrationRunner();

// Register migrations
console.log('Registering migrations...');
runner.register({
  tag: '0000_initial',
  sql: 'CREATE TABLE config (id INTEGER PRIMARY KEY);',
});

runner.register({
  tag: '0001_add_users',
  sql: 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);',
});

runner.register({
  tag: '0002_add_secrets',
  sql: 'CREATE TABLE secrets (id INTEGER PRIMARY KEY, value TEXT);',
});

// Check status
console.log('\nMigration Status:');
const status = runner.getStatus();
console.log(`  Total: ${status.total}`);
console.log(`  Applied: ${status.applied}`);
console.log(`  Pending: ${status.pending}`);

// List pending
console.log('\nPending migrations:');
runner.getPending().forEach(m => {
  console.log(`  - ${m.tag}`);
});

// Run all
console.log('\nRunning migrations...');
const result = await runner.runAll();
console.log(`  Applied: ${result.applied.join(', ')}`);
console.log(`  Failed: ${result.failed.length > 0 ? result.failed.join(', ') : 'none'}`);

// Final status
console.log('\nFinal Status:');
const finalStatus = runner.getStatus();
console.log(`  Applied: ${finalStatus.applied}`);
console.log(`  Last applied: ${finalStatus.lastApplied}`);

console.log('\n=== Exercise Complete ===');

// =============================================================================
// Solution (Uncomment to see the working implementation)
// =============================================================================

/*
class MigrationRunnerSolution {
  private journal: JournalEntry[] = [];
  private registeredMigrations: Migration[] = [];

  register(migration: Migration): void {
    this.registeredMigrations.push(migration);
    this.registeredMigrations.sort((a, b) => a.tag.localeCompare(b.tag));
  }

  getApplied(): string[] {
    return this.journal.map(e => e.tag);
  }

  getPending(): Migration[] {
    const applied = new Set(this.getApplied());
    return this.registeredMigrations.filter(m => !applied.has(m.tag));
  }

  private executeSQL(sql: string): ExecutionResult {
    console.log(`    Executing SQL: ${sql.slice(0, 50)}...`);
    if (sql.includes('FAIL')) {
      return { success: false, rowsAffected: 0, error: 'Simulated failure' };
    }
    return { success: true, rowsAffected: 1 };
  }

  async run(migration: Migration): Promise<boolean> {
    const result = this.executeSQL(migration.sql);

    if (result.success) {
      this.journal.push({
        idx: this.journal.length,
        when: Date.now(),
        tag: migration.tag,
      });
      return true;
    }

    console.log(`    Error: ${result.error}`);
    return false;
  }

  async runAll(): Promise<{ applied: string[]; failed: string[] }> {
    const applied: string[] = [];
    const failed: string[] = [];

    for (const migration of this.getPending()) {
      console.log(`  Running ${migration.tag}...`);
      const success = await this.run(migration);

      if (success) {
        applied.push(migration.tag);
      } else {
        failed.push(migration.tag);
        break; // Stop on first failure
      }
    }

    return { applied, failed };
  }

  getStatus() {
    const applied = this.journal.length;
    const pending = this.getPending().length;
    const lastApplied = this.journal[this.journal.length - 1]?.tag;

    return {
      applied,
      pending,
      total: this.registeredMigrations.length,
      lastApplied,
    };
  }
}
*/
```

## Source Code References

Want to see how this is actually implemented in Srcbook? Check out these files:

### Primary Implementation

- **[`packages/api/db/index.mts`](../../../db/index.mts)**: Database connection
  - SQLite initialization with better-sqlite3
  - Drizzle ORM wrapper
  - Automatic migration on startup

- **[`packages/api/db/schema.mts`](../../../db/schema.mts)**: Schema definitions
  - All table definitions using Drizzle
  - Type exports via `$inferSelect`, `$inferInsert`
  - Foreign key relationships

- **[`packages/api/config.mts`](../../../config.mts)**: Config operations
  - `getConfig()`, `updateConfig()`
  - `getSecrets()`, `addSecret()`, `removeSecret()`
  - `associateSecretWithSession()`

### Migration Files

- **[`packages/api/drizzle/`](../../../drizzle/)**: Migration directory
  - `0000_initial.sql` - Initial config and secrets tables
  - `0010_create_apps.sql` - Apps table for generated applications
  - `0017_add_mcp_tables.sql` - MCP server, token, and audit tables
  - `meta/_journal.json` - Migration tracking

### Related Code

- **[`packages/api/constants.mts`](../../../constants.mts)**: Path constants
  - `HOME_DIR`, `DIST_DIR`, `SRCBOOKS_DIR`
  - Database file path derivation

## Next Steps

### Related Topics

Now that you understand the database layer, you might want to explore:

- **Session Management**: How Srcbooks are stored and retrieved from disk
- **MCP Integration**: How MCP servers connect and communicate
- **WebSocket Protocol**: How database changes are broadcast to clients

### Extending the Database

To add a new table:

1. Add the schema definition to `packages/api/db/schema.mts`
2. Create a migration file in `packages/api/drizzle/`
3. Update `meta/_journal.json` with the new entry
4. Create CRUD functions in the appropriate module
5. Export types for use throughout the codebase

### Further Reading

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview) - Complete Drizzle guide
- [SQLite Documentation](https://www.sqlite.org/docs.html) - SQLite reference
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - The SQLite driver used

### Contributing

Found an error or want to improve this educational Srcbook?

1. The source for this Srcbook is at `packages/api/srcbook/examples/internals/database-layer.src.md`
2. Submit a PR with your improvements
3. Help make Srcbook's documentation even better!

## Summary

In this Srcbook, we covered:

- **SQLite + Drizzle Architecture**: How Srcbook uses SQLite with Drizzle ORM for type-safe persistence
- **Complete Schema**: All 8 tables including config, secrets, apps, and MCP data
- **Drizzle Patterns**: Select, insert, update, delete, and upsert operations
- **Migration System**: How schema changes are tracked and applied automatically
- **Query Building**: Complex queries with filtering, ordering, and limiting
- **Type Safety**: How `$inferSelect` and `$inferInsert` provide compile-time safety

You now understand how Srcbook persists data and how to extend the database layer for new features. This knowledge is essential for building features that need to store configuration, user data, or audit logs.

Happy coding!
