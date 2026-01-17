# App Builder - Implementation Specification

**Version:** 1.0
**Date:** 2026-01-14
**Status:** Implementation-Ready
**Output:** `packages/api/srcbook/examples/internals/app-builder.src.md`
**Dependencies:** Session Management Srcbook

---

## 1. Overview

This specification defines the implementation of an educational Srcbook that explains how Srcbook creates, manages, and previews full React applications using Vite.

### Learning Objectives

1. Understand the difference between Srcbooks and Apps
2. Learn the Vite scaffolding and preview process
3. Comprehend file management and git integration
4. Know how AI-powered app generation works

---

## 2. File Structure

### 2.1 Srcbook Metadata

```markdown
<!-- srcbook:{"language":"typescript"} -->
```

### 2.2 Required Sections

| Section | Type | Purpose |
|---------|------|---------|
| Title | Title Cell | "App Builder - Full React Applications" |
| package.json | Package Cell | Node.js dependencies |
| Introduction | Markdown | Context and objectives |
| Key Concepts | Markdown | Apps vs Srcbooks, architecture |
| Simple Demo | Code | Basic file operations |
| Explanation | Markdown | Vite integration |
| Advanced Demo | Code | Full app lifecycle |
| Deep Dive | Markdown | Srcbook's implementation |
| Interactive Exercise | Code | Build app manager |
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
    "zod": "^3.23.8"
  }
}
```

### 3.2 Introduction Content

**What is the App Builder?**
- Creates standalone React+Vite applications
- Different from Srcbooks (notebooks vs full apps)
- Includes live preview with hot module replacement
- Supports AI-powered app generation and editing

**Why does it matter?**
- Understanding enables building production apps
- Necessary for extending the app builder
- Foundation for AI-assisted app development

### 3.3 Key Concepts - Architecture

```
┌─────────────────────────────────────────────────────────────┐
│               Srcbooks vs Apps Comparison                    │
│                                                              │
│  SRCBOOKS                         APPS                       │
│  ┌──────────────────────┐        ┌──────────────────────┐   │
│  │ Interactive notebooks│        │ Full React projects  │   │
│  │ .src.md files        │        │ Standard project     │   │
│  │ Cell-based execution │        │ Vite dev server      │   │
│  │ tsx/node per cell    │        │ Full build pipeline  │   │
│  │ No build step        │        │ Production builds    │   │
│  │ Single file output   │        │ Multiple files       │   │
│  └──────────────────────┘        └──────────────────────┘   │
│                                                              │
│                      App Architecture                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                                                       │   │
│  │   ~/.srcbook/apps/{appId}/                           │   │
│  │   ├── src/                                           │   │
│  │   │   ├── App.tsx        (main component)            │   │
│  │   │   ├── main.tsx       (entry point)               │   │
│  │   │   └── index.css      (styles)                    │   │
│  │   ├── index.html          (HTML shell)               │   │
│  │   ├── vite.config.ts      (Vite config)              │   │
│  │   ├── package.json        (dependencies)             │   │
│  │   ├── tsconfig.json       (TypeScript)               │   │
│  │   ├── tailwind.config.js  (Tailwind CSS)             │   │
│  │   ├── .git/               (version control)          │   │
│  │   └── node_modules/       (installed deps)           │   │
│  │                                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Simple Demo

**Filename:** `simple-app-operations.ts`

```typescript
// Demonstrate basic app file operations

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// App file interface (from packages/api/apps/disk.mts)
interface AppFile {
  path: string;
  name: string;
  type: 'file' | 'directory';
  content?: string;
  isBinary?: boolean;
}

// Create a mock app directory structure
function createMockAppStructure(baseDir: string): void {
  const structure = {
    'src/App.tsx': `
import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">My App</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
}

export default App;
`,
    'src/main.tsx': `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
    'src/index.css': `
@tailwind base;
@tailwind components;
@tailwind utilities;
`,
    'index.html': `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    'package.json': JSON.stringify({
      name: 'my-app',
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc && vite build',
        preview: 'vite preview',
      },
      dependencies: {
        react: '^18.3.1',
        'react-dom': '^18.3.1',
      },
      devDependencies: {
        '@types/react': '^18.3.3',
        '@types/react-dom': '^18.3.0',
        '@vitejs/plugin-react': '^4.3.1',
        typescript: '^5.5.3',
        vite: '^5.3.4',
        tailwindcss: '^3.4.7',
        autoprefixer: '^10.4.19',
        postcss: '^8.4.40',
      },
    }, null, 2),
    'vite.config.ts': `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`,
  };

  // Create directories and files
  for (const [filePath, content] of Object.entries(structure)) {
    const fullPath = path.join(baseDir, filePath);
    const dir = path.dirname(fullPath);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
}

// Load directory contents (like disk.mts loadDirectory)
function loadDirectory(dir: string, relativeTo: string = dir): AppFile[] {
  const files: AppFile[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  // Excluded directories
  const excluded = ['node_modules', 'dist', '.git'];

  for (const entry of entries) {
    if (excluded.includes(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(relativeTo, fullPath);

    if (entry.isDirectory()) {
      files.push({
        path: relativePath,
        name: entry.name,
        type: 'directory',
      });
      // Recurse into subdirectories
      files.push(...loadDirectory(fullPath, relativeTo));
    } else {
      files.push({
        path: relativePath,
        name: entry.name,
        type: 'file',
      });
    }
  }

  return files;
}

// Load file content (like disk.mts loadFile)
function loadFile(filePath: string): AppFile {
  const content = fs.readFileSync(filePath, 'utf-8');
  const name = path.basename(filePath);

  // Check if binary (simplified)
  const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.md'];
  const isBinary = !textExtensions.some(ext => filePath.endsWith(ext));

  return {
    path: filePath,
    name,
    type: 'file',
    content: isBinary ? undefined : content,
    isBinary,
  };
}

// Demo
console.log('=== App File Operations Demo ===\n');

// Create temporary app directory
const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'srcbook-app-demo-'));
console.log(`📁 Created app at: ${appDir}\n`);

// Create app structure
createMockAppStructure(appDir);
console.log('✅ Created app structure\n');

// List files
console.log('📋 App Files:');
const files = loadDirectory(appDir);
files.forEach(f => {
  const icon = f.type === 'directory' ? '📁' : '📄';
  console.log(`  ${icon} ${f.path}`);
});

// Load a specific file
console.log('\n📄 App.tsx Content:');
console.log('─'.repeat(50));
const appFile = loadFile(path.join(appDir, 'src/App.tsx'));
console.log(appFile.content?.slice(0, 300) + '...');

// Cleanup
fs.rmSync(appDir, { recursive: true });
console.log('\n🧹 Cleaned up temporary directory');
```

### 3.5 Advanced Demo

**Filename:** `app-lifecycle.ts`

```typescript
// Full app lifecycle management

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

// App database record (from db/schema.mts)
interface AppRecord {
  id: number;
  externalId: string;
  name: string;
  history: string; // JSON encoded
  historyVersion: number;
  createdAt: number;
  updatedAt: number;
}

// App file change plan (from AI)
interface FilePlan {
  type: 'create' | 'update' | 'delete';
  path: string;
  content?: string;
}

// Vite server info
interface ViteServer {
  process: ChildProcess;
  port: number;
  url: string;
}

class AppManager extends EventEmitter {
  private apps: Map<string, AppRecord> = new Map();
  private appDirs: Map<string, string> = new Map();
  private viteServers: Map<string, ViteServer> = new Map();
  private baseDir: string;

  constructor() {
    super();
    this.baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'srcbook-apps-'));
  }

  // Create a new app (like app.mts createApp)
  async createApp(name: string): Promise<AppRecord> {
    const externalId = `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const record: AppRecord = {
      id: this.apps.size + 1,
      externalId,
      name,
      history: '[]',
      historyVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.apps.set(externalId, record);

    // Create app directory
    const appDir = path.join(this.baseDir, externalId);
    fs.mkdirSync(appDir, { recursive: true });
    this.appDirs.set(externalId, appDir);

    // Scaffold Vite app
    await this.scaffold(appDir, name);

    console.log(`✅ Created app: ${name} (${externalId})`);
    this.emit('app:created', record);

    return record;
  }

  // Scaffold Vite React app (like disk.mts scaffold)
  private async scaffold(appDir: string, name: string): Promise<void> {
    // Create minimal structure
    const srcDir = path.join(appDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    // Create files
    const files: Record<string, string> = {
      'src/App.tsx': `
function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-gray-900">${name}</h1>
      <p className="mt-2 text-gray-600">Welcome to your new app!</p>
    </div>
  );
}

export default App;
`,
      'src/main.tsx': `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
      'index.html': `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
      'package.json': JSON.stringify({
        name: this.toValidPackageName(name),
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'tsc && vite build',
        },
        dependencies: {
          react: '^18.3.1',
          'react-dom': '^18.3.1',
        },
        devDependencies: {
          '@vitejs/plugin-react': '^4.3.1',
          typescript: '^5.5.3',
          vite: '^5.3.4',
        },
      }, null, 2),
      'vite.config.ts': `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`,
    };

    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(appDir, filePath);
      const dir = path.dirname(fullPath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, content.trim());
    }

    console.log(`📦 Scaffolded app at: ${appDir}`);
  }

  // Convert name to valid package name (like disk.mts toValidPackageName)
  private toValidPackageName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Apply AI-generated plan (like disk.mts applyPlan)
  async applyPlan(appId: string, plan: FilePlan[]): Promise<void> {
    const appDir = this.appDirs.get(appId);
    if (!appDir) throw new Error(`App not found: ${appId}`);

    console.log(`\n📝 Applying plan with ${plan.length} changes...`);

    for (const change of plan) {
      const fullPath = path.join(appDir, change.path);

      switch (change.type) {
        case 'create':
        case 'update':
          fs.mkdirSync(path.dirname(fullPath), { recursive: true });
          fs.writeFileSync(fullPath, change.content || '');
          console.log(`  ✅ ${change.type}: ${change.path}`);
          this.emit('file:updated', { appId, path: change.path });
          break;

        case 'delete':
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`  🗑️ deleted: ${change.path}`);
            this.emit('file:deleted', { appId, path: change.path });
          }
          break;
      }
    }
  }

  // Start Vite dev server (like processes.mts viteServer)
  async startPreview(appId: string): Promise<ViteServer> {
    const appDir = this.appDirs.get(appId);
    if (!appDir) throw new Error(`App not found: ${appId}`);

    // Check if already running
    if (this.viteServers.has(appId)) {
      return this.viteServers.get(appId)!;
    }

    const port = 3000 + this.viteServers.size;

    console.log(`\n🚀 Starting Vite preview on port ${port}...`);
    console.log(`   (In real implementation, this would spawn Vite)`);

    // In real code: spawn('npx', ['vite', '--port', port.toString()], { cwd: appDir })
    const server: ViteServer = {
      process: null as any, // Mock
      port,
      url: `http://localhost:${port}`,
    };

    this.viteServers.set(appId, server);
    this.emit('preview:status', { appId, status: 'running', url: server.url });

    return server;
  }

  // Stop preview server
  async stopPreview(appId: string): Promise<void> {
    const server = this.viteServers.get(appId);
    if (!server) return;

    console.log(`🛑 Stopping preview for ${appId}`);
    // server.process.kill();
    this.viteServers.delete(appId);
    this.emit('preview:status', { appId, status: 'stopped' });
  }

  // List all apps
  listApps(): AppRecord[] {
    return Array.from(this.apps.values());
  }

  // Get app details
  getApp(appId: string): AppRecord | undefined {
    return this.apps.get(appId);
  }

  // Delete app
  async deleteApp(appId: string): Promise<void> {
    await this.stopPreview(appId);

    const appDir = this.appDirs.get(appId);
    if (appDir && fs.existsSync(appDir)) {
      fs.rmSync(appDir, { recursive: true });
    }

    this.apps.delete(appId);
    this.appDirs.delete(appId);

    console.log(`🗑️ Deleted app: ${appId}`);
    this.emit('app:deleted', { appId });
  }

  // Cleanup
  async cleanup(): Promise<void> {
    for (const appId of this.apps.keys()) {
      await this.deleteApp(appId);
    }
    if (fs.existsSync(this.baseDir)) {
      fs.rmSync(this.baseDir, { recursive: true });
    }
  }
}

// Demo
async function demo() {
  console.log('=== App Lifecycle Demo ===\n');

  const manager = new AppManager();

  // Listen for events
  manager.on('app:created', (app) => {
    console.log(`🔔 Event: app created - ${app.name}`);
  });
  manager.on('file:updated', ({ appId, path }) => {
    console.log(`🔔 Event: file updated - ${path}`);
  });

  // Create an app
  const app = await manager.createApp('My Todo App');

  // Apply an AI-generated plan
  await manager.applyPlan(app.externalId, [
    {
      type: 'update',
      path: 'src/App.tsx',
      content: `
import { useState } from 'react';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (!input.trim()) return;
    setTodos([...todos, { id: Date.now(), text: input, done: false }]);
    setInput('');
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Todo App</h1>
      <div className="flex gap-2 mt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="border p-2 rounded"
          placeholder="Add todo..."
        />
        <button onClick={addTodo} className="bg-blue-500 text-white px-4 rounded">
          Add
        </button>
      </div>
      <ul className="mt-4">
        {todos.map((todo) => (
          <li key={todo.id}>{todo.text}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
`,
    },
  ]);

  // Start preview
  const server = await manager.startPreview(app.externalId);
  console.log(`\n🌐 Preview available at: ${server.url}`);

  // List apps
  console.log('\n📋 All Apps:');
  manager.listApps().forEach(a => {
    console.log(`  - ${a.name} (${a.externalId})`);
  });

  // Cleanup
  await manager.cleanup();
  console.log('\n✅ Demo complete!');
}

demo();
```

### 3.6 Deep Dive Content

**Source File References:**

1. **`packages/api/apps/app.mts`** - App CRUD operations
   - `createApp()` - Create new app
   - `createAppWithAi()` - AI-powered creation
   - `deleteApp()` - Remove app

2. **`packages/api/apps/disk.mts`** - File system operations
   - `scaffold()` - Create Vite structure
   - `loadDirectory()` - List files
   - `writeFile()` - Save file changes
   - `applyPlan()` - Apply AI changes

3. **`packages/api/apps/processes.mts`** - Process management
   - `viteServer()` - Start preview server
   - Port allocation
   - Process lifecycle

4. **`packages/api/apps/git.mts`** - Version control
   - `initRepo()` - Initialize git
   - `commitAllFiles()` - Create commits
   - `checkoutCommit()` - Time travel

### 3.7 Interactive Exercise

```typescript
// Exercise: Build an App Template System
//
// Challenge:
// 1. Support multiple app templates (React, Vue, etc.)
// 2. Implement template customization
// 3. Add dependency injection
// 4. Create a template registry

interface AppTemplate {
  name: string;
  framework: 'react' | 'vue' | 'svelte';
  files: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

class TemplateRegistry {
  private templates: Map<string, AppTemplate> = new Map();

  register(template: AppTemplate): void {
    // TODO: Store template
  }

  list(): AppTemplate[] {
    // TODO: Return all templates
    throw new Error('Not implemented');
  }

  instantiate(templateName: string, appName: string): Record<string, string> {
    // TODO: Create files from template with customization
    throw new Error('Not implemented');
  }
}

// Test your implementation:
// const registry = new TemplateRegistry();
// registry.register({ name: 'react-tailwind', ... });
// registry.register({ name: 'react-minimal', ... });
// const files = registry.instantiate('react-tailwind', 'my-app');
```

### 3.8 Source References

| File | Purpose |
|------|---------|
| `packages/api/apps/app.mts` | App CRUD operations |
| `packages/api/apps/disk.mts` | File system operations |
| `packages/api/apps/processes.mts` | Vite server management |
| `packages/api/apps/git.mts` | Git integration |
| `packages/api/apps/templates/` | React+Vite template |

---

## 4. Acceptance Criteria

- [ ] Srcbooks vs Apps difference explained
- [ ] Vite scaffolding demonstrated
- [ ] File operations work correctly
- [ ] Git integration documented
- [ ] Exercise is achievable

---

## 5. Implementation Notes

### File Location
```
packages/api/srcbook/examples/internals/app-builder.src.md
```

### Validation
- Test app creation and preview
- Verify AI plan application
