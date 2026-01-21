# Database Layer - Implementation Specification

**Version:** 1.0
**Date:** 2026-01-14
**Status:** Implementation-Ready
**Output:** `packages/api/srcbook/examples/internals/database-layer.src.md`
**Dependencies:** Session Management Srcbook

---

## 1. Overview

This specification defines the implementation of an educational Srcbook that explains how Srcbook persists data using SQLite and Drizzle ORM.

### Learning Objectives

1. Understand the SQLite + Drizzle ORM architecture
2. Learn the database schema structure
3. Comprehend migration management
4. Know how to extend the database layer

---

## 2. File Structure

### 2.1 Srcbook Metadata

```markdown
<!-- srcbook:{"language":"typescript"} -->
```

### 2.2 Required Sections

| Section | Type | Purpose |
|---------|------|---------|
| Title | Title Cell | "Database Layer - SQLite Persistence" |
| package.json | Package Cell | SQLite and Drizzle dependencies |
| Introduction | Markdown | Context and objectives |
| Key Concepts | Markdown | Schema and migration diagram |
| Simple Demo | Code | Basic Drizzle operations |
| Explanation | Markdown | Schema design |
| Advanced Demo | Code | Full database operations |
| Deep Dive | Markdown | Srcbook's implementation |
| Interactive Exercise | Code | Build migration system |
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
    "better-sqlite3": "^11.1.2",
    "drizzle-orm": "^0.33.0",
    "zod": "^3.23.8"
  }
}
```

### 3.2 Introduction Content

**What is the Database Layer?**
- SQLite database for persistent storage
- Drizzle ORM for type-safe queries
- Stores configuration, secrets, apps, and MCP data
- Located at `~/.srcbook/srcbook.db`

**Why does it matter?**
- Understanding enables extending data storage
- Necessary for building features that persist data
- Foundation for configuration and secrets management

### 3.3 Key Concepts - Schema Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Database Schema                           │
│                                                              │
│  CONFIG TABLE (Singleton)                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ baseDir, defaultLanguage, aiProvider, aiModel        │   │
│  │ openaiKey, anthropicKey, geminiKey, xaiKey, ...      │   │
│  │ subscriptionEmail, installId                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  SECRETS TABLE                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ id | name (unique) | value                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                     │                                        │
│                     ▼                                        │
│  SECRETS_TO_SESSIONS (Junction)                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ id | session_id | secret_id (FK)                     │   │
│  │ (unique: session_id + secret_id)                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  APPS TABLE                                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ id | name | externalId (unique) | history | ...      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  MCP TABLES (3)                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ mcp_servers: Server configurations                    │   │
│  │ mcp_tokens: Authentication tokens                     │   │
│  │ mcp_tool_invocations: Audit log                       │   │
│  │ mcp_resource_subscriptions: Resource subscriptions    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Simple Demo

**Filename:** `simple-database.ts`

```typescript
// Demonstrate Drizzle ORM patterns (using mock data)

import { z } from 'zod';

// Schema definitions (mirrors db/schema.mts)
// In real code, these use drizzle-orm's sqliteTable

// Config schema
const ConfigSchema = z.object({
  id: z.number().optional(),
  baseDir: z.string(),
  defaultLanguage: z.enum(['typescript', 'javascript']),
  aiProvider: z.enum(['openai', 'anthropic', 'google', 'xai', 'openrouter', 'custom']),
  aiModel: z.string(),
  openaiKey: z.string().nullable(),
  anthropicKey: z.string().nullable(),
  geminiKey: z.string().nullable(),
  xaiKey: z.string().nullable(),
  openrouterKey: z.string().nullable(),
  customApiKey: z.string().nullable(),
  aiBaseUrl: z.string().nullable(),
  installId: z.string(),
  subscriptionEmail: z.string().nullable(),
});

type Config = z.infer<typeof ConfigSchema>;

// Secrets schema
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
  createdAt: z.number(),
  updatedAt: z.number(),
});

type App = z.infer<typeof AppSchema>;

// Mock database storage
class MockDatabase {
  private config: Config | null = null;
  private secrets: Map<number, Secret> = new Map();
  private apps: Map<number, App> = new Map();
  private nextSecretId = 1;
  private nextAppId = 1;

  // Initialize with defaults
  init(): void {
    this.config = {
      baseDir: '/Users/demo',
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
      installId: `install-${Date.now()}`,
      subscriptionEmail: null,
    };
    console.log('✅ Database initialized');
  }

  // Config operations
  getConfig(): Config {
    if (!this.config) throw new Error('Database not initialized');
    return { ...this.config };
  }

  updateConfig(updates: Partial<Config>): Config {
    if (!this.config) throw new Error('Database not initialized');
    this.config = { ...this.config, ...updates };
    return this.getConfig();
  }

  // Secret operations
  addSecret(name: string, value: string): Secret {
    // Check for existing secret with same name
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

  getSecrets(): Secret[] {
    return Array.from(this.secrets.values()).map(s => ({ ...s }));
  }

  removeSecret(name: string): boolean {
    for (const [id, secret] of this.secrets) {
      if (secret.name === name) {
        this.secrets.delete(id);
        return true;
      }
    }
    return false;
  }

  // App operations
  createApp(name: string): App {
    const app: App = {
      id: this.nextAppId++,
      name,
      externalId: `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      history: '[]',
      historyVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.apps.set(app.id, app);
    return { ...app };
  }

  getApps(): App[] {
    return Array.from(this.apps.values()).map(a => ({ ...a }));
  }

  updateApp(id: number, updates: Partial<App>): App | null {
    const app = this.apps.get(id);
    if (!app) return null;

    Object.assign(app, updates, { updatedAt: Date.now() });
    return { ...app };
  }
}

// Demo
console.log('=== Database Layer Demo ===\n');

const db = new MockDatabase();
db.init();

// Config operations
console.log('📋 Initial Config:');
const config = db.getConfig();
console.log(`  Provider: ${config.aiProvider}`);
console.log(`  Model: ${config.aiModel}`);
console.log(`  Install ID: ${config.installId.slice(0, 20)}...`);

console.log('\n📝 Updating config...');
db.updateConfig({
  aiProvider: 'anthropic',
  aiModel: 'claude-3-5-sonnet-20241022',
});
const updated = db.getConfig();
console.log(`  New provider: ${updated.aiProvider}`);
console.log(`  New model: ${updated.aiModel}`);

// Secret operations
console.log('\n🔐 Adding secrets...');
db.addSecret('DATABASE_URL', 'postgres://localhost:5432/mydb');
db.addSecret('API_KEY', 'sk-secret-key-123');
console.log(`  Added ${db.getSecrets().length} secrets`);

console.log('\n📋 Secrets:');
db.getSecrets().forEach(s => {
  console.log(`  ${s.name}: ${s.value.slice(0, 10)}...`);
});

// App operations
console.log('\n📱 Creating apps...');
const app1 = db.createApp('Todo App');
const app2 = db.createApp('Dashboard');

console.log('\n📋 Apps:');
db.getApps().forEach(a => {
  console.log(`  ${a.name} (${a.externalId.slice(0, 15)}...)`);
});

// Validate schemas
console.log('\n✅ Schema Validation:');
console.log(`  Config: ${ConfigSchema.safeParse(config).success ? '✅' : '❌'}`);
console.log(`  Secret: ${SecretSchema.safeParse(db.getSecrets()[0]).success ? '✅' : '❌'}`);
console.log(`  App: ${AppSchema.safeParse(app1).success ? '✅' : '❌'}`);
```

### 3.5 Advanced Demo - Drizzle Patterns

**Filename:** `drizzle-patterns.ts`

```typescript
// Drizzle ORM patterns used in Srcbook

// Note: This demo uses mock implementations to demonstrate patterns
// without requiring actual database connection

import { z } from 'zod';

// Simulated Drizzle table definition
// In real code: import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

interface TableColumn {
  name: string;
  type: 'text' | 'integer' | 'real' | 'blob';
  primaryKey?: boolean;
  unique?: boolean;
  notNull?: boolean;
  default?: any;
}

interface TableDefinition {
  name: string;
  columns: TableColumn[];
}

// Schema builder (mimics Drizzle's API)
class SchemaBuilder {
  private tables: Map<string, TableDefinition> = new Map();

  sqliteTable(name: string, columns: Record<string, TableColumn>): TableDefinition {
    const table: TableDefinition = {
      name,
      columns: Object.entries(columns).map(([key, col]) => ({
        ...col,
        name: key,
      })),
    };
    this.tables.set(name, table);
    return table;
  }

  // Column helpers
  text(name: string): TableColumn {
    return { name, type: 'text' };
  }

  integer(name: string): TableColumn {
    return { name, type: 'integer' };
  }

  getTables(): TableDefinition[] {
    return Array.from(this.tables.values());
  }
}

// MCP Server schema (from db/schema.mts)
const mcpServerColumns = {
  id: { name: 'id', type: 'text' as const, primaryKey: true },
  name: { name: 'name', type: 'text' as const, notNull: true },
  transport: { name: 'transport', type: 'text' as const, notNull: true },
  config: { name: 'config', type: 'text' as const, notNull: true }, // JSON
  enabled: { name: 'enabled', type: 'integer' as const, notNull: true, default: 1 },
  autoConnect: { name: 'autoConnect', type: 'integer' as const, notNull: true, default: 0 },
  timeout: { name: 'timeout', type: 'integer' as const, notNull: true, default: 30000 },
  lastConnectedAt: { name: 'lastConnectedAt', type: 'integer' as const },
  createdAt: { name: 'createdAt', type: 'integer' as const, notNull: true },
  updatedAt: { name: 'updatedAt', type: 'integer' as const, notNull: true },
};

// MCP Token schema
const mcpTokenColumns = {
  id: { name: 'id', type: 'text' as const, primaryKey: true },
  tokenHash: { name: 'tokenHash', type: 'text' as const, notNull: true, unique: true },
  clientName: { name: 'clientName', type: 'text' as const, notNull: true },
  permissions: { name: 'permissions', type: 'text' as const, notNull: true }, // JSON array
  createdAt: { name: 'createdAt', type: 'integer' as const, notNull: true },
  expiresAt: { name: 'expiresAt', type: 'integer' as const },
  lastUsedAt: { name: 'lastUsedAt', type: 'integer' as const },
  revokedAt: { name: 'revokedAt', type: 'integer' as const },
};

// Query builder (simulates Drizzle query patterns)
class QueryBuilder<T> {
  private _where: Array<{ column: string; op: string; value: any }> = [];
  private _orderBy: Array<{ column: string; direction: 'asc' | 'desc' }> = [];
  private _limit?: number;

  constructor(private table: string, private data: T[]) {}

  where(column: string, op: string, value: any): this {
    this._where.push({ column, op, value });
    return this;
  }

  orderBy(column: string, direction: 'asc' | 'desc' = 'asc'): this {
    this._orderBy.push({ column, direction });
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  execute(): T[] {
    let result = [...this.data];

    // Apply WHERE
    for (const cond of this._where) {
      result = result.filter(row => {
        const value = (row as any)[cond.column];
        switch (cond.op) {
          case '=': return value === cond.value;
          case '!=': return value !== cond.value;
          case '>': return value > cond.value;
          case '<': return value < cond.value;
          default: return true;
        }
      });
    }

    // Apply ORDER BY
    for (const order of this._orderBy.reverse()) {
      result.sort((a, b) => {
        const va = (a as any)[order.column];
        const vb = (b as any)[order.column];
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return order.direction === 'asc' ? cmp : -cmp;
      });
    }

    // Apply LIMIT
    if (this._limit !== undefined) {
      result = result.slice(0, this._limit);
    }

    return result;
  }
}

// Database operations class
class Database {
  private mcpServers: any[] = [];
  private mcpTokens: any[] = [];

  // Select pattern
  select(table: string): QueryBuilder<any> {
    switch (table) {
      case 'mcp_servers':
        return new QueryBuilder(table, this.mcpServers);
      case 'mcp_tokens':
        return new QueryBuilder(table, this.mcpTokens);
      default:
        throw new Error(`Unknown table: ${table}`);
    }
  }

  // Insert pattern
  insert(table: string, values: any): any {
    const now = Date.now();
    const record = { ...values, createdAt: now, updatedAt: now };

    switch (table) {
      case 'mcp_servers':
        this.mcpServers.push(record);
        break;
      case 'mcp_tokens':
        this.mcpTokens.push(record);
        break;
    }

    console.log(`INSERT INTO ${table}:`, Object.keys(values).join(', '));
    return record;
  }

  // Update pattern (with conflict handling)
  upsert(table: string, values: any, conflictColumn: string): any {
    const existing = this.select(table)
      .where(conflictColumn, '=', values[conflictColumn])
      .execute()[0];

    if (existing) {
      Object.assign(existing, values, { updatedAt: Date.now() });
      console.log(`UPDATE ${table} (conflict on ${conflictColumn})`);
      return existing;
    }

    return this.insert(table, values);
  }

  // Delete pattern
  delete(table: string, column: string, value: any): number {
    let deleted = 0;

    switch (table) {
      case 'mcp_servers':
        const beforeLen = this.mcpServers.length;
        this.mcpServers = this.mcpServers.filter(s => s[column] !== value);
        deleted = beforeLen - this.mcpServers.length;
        break;
    }

    console.log(`DELETE FROM ${table} WHERE ${column} = ${value}: ${deleted} rows`);
    return deleted;
  }
}

// Demo
console.log('=== Drizzle ORM Patterns Demo ===\n');

const db = new Database();

// Insert MCP servers
console.log('📝 Inserting MCP servers...\n');

db.insert('mcp_servers', {
  id: 'server-1',
  name: 'filesystem',
  transport: 'stdio',
  config: JSON.stringify({ command: 'npx', args: ['@modelcontextprotocol/server-filesystem'] }),
  enabled: 1,
  autoConnect: 0,
  timeout: 30000,
});

db.insert('mcp_servers', {
  id: 'server-2',
  name: 'github',
  transport: 'stdio',
  config: JSON.stringify({ command: 'npx', args: ['@modelcontextprotocol/server-github'] }),
  enabled: 1,
  autoConnect: 1,
  timeout: 60000,
});

db.insert('mcp_servers', {
  id: 'server-3',
  name: 'disabled-server',
  transport: 'stdio',
  config: JSON.stringify({}),
  enabled: 0,
  autoConnect: 0,
  timeout: 30000,
});

// Query patterns
console.log('\n📋 Query: All enabled servers');
const enabledServers = db.select('mcp_servers')
  .where('enabled', '=', 1)
  .orderBy('name', 'asc')
  .execute();

enabledServers.forEach(s => {
  console.log(`  - ${s.name} (${s.transport})`);
});

console.log('\n📋 Query: Auto-connect servers');
const autoConnectServers = db.select('mcp_servers')
  .where('autoConnect', '=', 1)
  .execute();

autoConnectServers.forEach(s => {
  console.log(`  - ${s.name}`);
});

// Upsert pattern
console.log('\n📝 Upsert: Update existing server');
db.upsert('mcp_servers', {
  id: 'server-1',
  name: 'filesystem-updated',
  transport: 'stdio',
  config: JSON.stringify({ command: 'npx', args: ['@mcp/fs', '--new-flag'] }),
  enabled: 1,
}, 'id');

// Verify update
const updated = db.select('mcp_servers')
  .where('id', '=', 'server-1')
  .execute()[0];
console.log(`  Updated name: ${updated.name}`);

// Delete pattern
console.log('\n🗑️ Delete: Remove disabled server');
db.delete('mcp_servers', 'enabled', 0);

// Final count
console.log('\n📊 Final server count:', db.select('mcp_servers').execute().length);
```

### 3.6 Deep Dive Content

**Source File References:**

1. **`packages/api/db/index.mts`** - Database initialization
   - Creates SQLite connection via better-sqlite3
   - Runs migrations automatically
   - Exports `db` instance

2. **`packages/api/db/schema.mts`** - Schema definitions
   - All table definitions using Drizzle
   - Type exports via `$inferSelect`, `$inferInsert`

3. **`packages/api/config.mts`** - Config operations
   - `getConfig()`, `updateConfig()`
   - `getSecrets()`, `addSecret()`

4. **`packages/api/drizzle/`** - Migrations
   - 17+ SQL migration files
   - `meta/_journal.json` tracking

**Database Location:**
```
~/.srcbook/srcbook.db
```

**Migration History (Key Migrations):**
- `0000_initial.sql` - Config, secrets
- `0010_create_apps.sql` - Apps table
- `0017_add_mcp_tables.sql` - MCP tables

### 3.7 Interactive Exercise

```typescript
// Exercise: Build a Migration Runner
//
// Challenge:
// 1. Track applied migrations
// 2. Run pending migrations in order
// 3. Support rollback (optional)
// 4. Validate migration checksums

interface Migration {
  name: string;
  up: string;    // SQL to apply
  down?: string; // SQL to rollback
  checksum: string;
}

class MigrationRunner {
  private applied: Set<string> = new Set();
  private migrations: Migration[] = [];

  register(migration: Migration): void {
    // TODO: Add migration to list
  }

  getPending(): Migration[] {
    // TODO: Return unapplied migrations in order
    throw new Error('Not implemented');
  }

  async run(migration: Migration): Promise<void> {
    // TODO: Execute migration, track in applied set
  }

  async runAll(): Promise<{ applied: string[]; skipped: string[] }> {
    // TODO: Run all pending migrations
    throw new Error('Not implemented');
  }

  async rollback(migrationName: string): Promise<void> {
    // TODO: Rollback specific migration if down SQL exists
    throw new Error('Not implemented');
  }
}

// Test your implementation:
// const runner = new MigrationRunner();
// runner.register({ name: '001_initial', up: 'CREATE TABLE...', checksum: 'abc' });
// runner.register({ name: '002_add_column', up: 'ALTER TABLE...', checksum: 'def' });
// await runner.runAll();
```

### 3.8 Source References

| File | Purpose |
|------|---------|
| `packages/api/db/index.mts` | Database connection |
| `packages/api/db/schema.mts` | All table definitions |
| `packages/api/config.mts` | Config and secrets CRUD |
| `packages/api/drizzle/` | Migration SQL files |
| `packages/api/drizzle.config.ts` | Drizzle Kit configuration |

---

## 4. Acceptance Criteria

- [ ] SQLite + Drizzle architecture explained
- [ ] All tables documented
- [ ] Query patterns demonstrated
- [ ] Migration system explained
- [ ] Exercise is achievable

---

## 5. Implementation Notes

### File Location
```
packages/api/srcbook/examples/internals/database-layer.src.md
```

### Validation
- Test with mock database operations
- Verify schema validation with Zod
