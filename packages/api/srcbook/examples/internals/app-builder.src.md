<!-- srcbook:{"language":"typescript"} -->

# App Builder - Full React Applications

###### package.json

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

## Introduction

**What is the App Builder?**

The App Builder is Srcbook's system for creating, managing, and previewing standalone React applications. Unlike Srcbooks which are interactive notebooks for exploration and documentation, Apps are full React+Vite projects that can be:

- **Created from scratch** with a starter template
- **Generated with AI** from natural language prompts
- **Previewed live** with hot module replacement
- **Edited in real-time** with instant updates
- **Version controlled** with built-in git integration

**Srcbooks vs Apps - Key Differences**

| Aspect | Srcbooks | Apps |
|--------|----------|------|
| **Format** | .src.md files (markdown with code) | Standard project structure |
| **Execution** | Cell-by-cell via tsx/node | Full Vite dev server |
| **Output** | Console output, in-notebook | Live preview in iframe |
| **Build** | No build step | Full build pipeline |
| **Use Case** | Exploration, documentation, learning | Production applications |

**Why does it matter?**

Understanding the App Builder enables you to:
- Build production React applications with AI assistance
- Extend the app builder with custom templates
- Debug issues with app creation and preview
- Contribute to Srcbook's core functionality

**Prerequisites**

- TypeScript basics
- React fundamentals
- Node.js file system operations
- Basic understanding of Vite

**Learning Objectives**

By the end of this Srcbook, you will understand:
- How Srcbook scaffolds Vite applications
- File management and directory structure
- Process management for preview servers
- Git integration for version control
- AI-powered app generation workflow

## Key Concepts

### Architecture Overview

```
                    Srcbooks vs Apps Comparison

  SRCBOOKS                            APPS
  +------------------------+          +------------------------+
  | Interactive notebooks  |          | Full React projects    |
  | .src.md files          |          | Standard file structure|
  | Cell-based execution   |          | Vite dev server        |
  | tsx/node per cell      |          | Full build pipeline    |
  | No build step          |          | Production builds      |
  | Single file output     |          | Multiple files         |
  +------------------------+          +------------------------+

                      App Directory Structure

  ~/.srcbook/apps/{appId}/
  +-----------------------------------------------------------+
  |                                                           |
  |   src/                                                    |
  |   +-- App.tsx           (main component)                  |
  |   +-- main.tsx          (entry point)                     |
  |   +-- index.css         (Tailwind styles)                 |
  |   +-- vite-env.d.ts     (Vite type declarations)          |
  |                                                           |
  |   index.html            (HTML shell)                      |
  |   vite.config.ts        (Vite configuration)              |
  |   package.json          (dependencies)                    |
  |   tsconfig.json         (TypeScript config)               |
  |   tailwind.config.js    (Tailwind CSS config)             |
  |   postcss.config.js     (PostCSS config)                  |
  |   .gitignore            (git ignore rules)                |
  |   .git/                 (version control)                 |
  |   node_modules/         (installed dependencies)          |
  |                                                           |
  +-----------------------------------------------------------+

                       App Lifecycle Flow

  +------------+    +------------+    +---------------+
  |  Create    |    | Scaffold   |    | npm install   |
  |  App       |--->| Vite Files |--->| Dependencies  |
  +------------+    +------------+    +---------------+
                                             |
                                             v
  +------------+    +------------+    +---------------+
  |  Preview   |<---| Git Commit |<---| Init Git      |
  |  in iframe |    | Changes    |    | Repository    |
  +------------+    +------------+    +---------------+

```

### Core Components

**1. App CRUD Operations** (`app.mts`)
- `createApp()` - Create a new app from template
- `createAppWithAi()` - Generate app with AI
- `loadApps()` / `loadApp()` - Retrieve apps from database
- `deleteApp()` - Remove app and files

**2. File System Operations** (`disk.mts`)
- `scaffold()` - Create Vite app structure
- `loadDirectory()` / `loadFile()` - Read app contents
- `writeFile()` - Save file changes with broadcast
- `applyPlan()` - Apply AI-generated modifications

**3. Process Management** (`processes.mts`)
- `viteServer()` - Start/manage Vite dev server
- `npmInstall()` - Install dependencies
- Process tracking and cleanup

**4. Git Integration** (`git.mts`)
- `initRepo()` - Initialize git repository
- `commitAllFiles()` - Commit changes
- `checkoutCommit()` - Navigate history
- `getCommitHistory()` - List commits

## Simple Demo: File Operations

Let's create a mock app directory structure and perform basic file operations.

###### simple-demo.ts

```typescript
// Demonstrate basic app file operations
// This mirrors what happens in packages/api/apps/disk.mts

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Types that mirror the actual Srcbook types
interface FileType {
  path: string;
  name: string;
  source: string;
  binary: boolean;
}

interface DirEntry {
  path: string;
  dirname: string;
  basename: string;
  type: 'file' | 'directory';
  children?: DirEntry[] | null;
}

// Text file extensions (from disk.mts)
const TEXT_FILE_EXTENSIONS = [
  '.ts', '.cts', '.mts', '.tsx',
  '.js', '.cjs', '.mjs', '.jsx',
  '.md', '.markdown', '.json',
  '.css', '.html'
];

function isBinary(basename: string): boolean {
  const isDotfile = basename.startsWith('.');
  const isTextFile = TEXT_FILE_EXTENSIONS.some(ext => basename.endsWith(ext));
  return !(isDotfile || isTextFile);
}

// Create a mock app directory structure (simulating scaffold())
function createMockAppStructure(baseDir: string, appName: string): void {
  const structure: Record<string, string> = {
    'src/App.tsx': `import './index.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold text-gray-900">
        ${appName}
      </h1>
      <p className="mt-2 text-gray-600">
        Welcome to your new app!
      </p>
    </div>
  );
}

export default App;
`,
    'src/main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
    'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
    'src/vite-env.d.ts': `/// <reference types="vite/client" />
`,
    'index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    'package.json': JSON.stringify({
      name: appName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'tsc -b && vite build',
        preview: 'vite preview',
      },
      dependencies: {
        'lucide-react': '^0.453.0',
        react: '^18.3.1',
        'react-dom': '^18.3.1',
      },
      devDependencies: {
        '@types/react': '^18.3.6',
        '@types/react-dom': '^18.3.0',
        '@vitejs/plugin-react': '^4.3.1',
        autoprefixer: '^10.4.20',
        postcss: '^8.4.47',
        tailwindcss: '^3.4.14',
        typescript: '^5.5.3',
        vite: '^5.4.6',
      },
    }, null, 2),
    'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`,
    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2020',
        useDefineForClassFields: true,
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        skipLibCheck: true,
        moduleResolution: 'bundler',
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: 'react-jsx',
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true,
      },
      include: ['src'],
    }, null, 2),
    'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
`,
    'postcss.config.js': `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`,
    '.gitignore': `node_modules
dist
.DS_Store
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
function loadDirectory(
  dir: string,
  relativeTo: string,
  excludes = ['node_modules', 'dist', '.git']
): DirEntry {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const relativePath = path.relative(relativeTo, dir) || '.';

  const children = entries
    .filter(entry => !excludes.includes(entry.name))
    .map(entry => {
      const fullPath = path.join(dir, entry.name);
      const entryRelativePath = path.relative(relativeTo, fullPath);

      if (entry.isDirectory()) {
        return {
          path: entryRelativePath,
          dirname: path.dirname(entryRelativePath),
          basename: entry.name,
          type: 'directory' as const,
          children: null, // Would recurse in real implementation
        };
      } else {
        return {
          path: entryRelativePath,
          dirname: path.dirname(entryRelativePath),
          basename: entry.name,
          type: 'file' as const,
        };
      }
    });

  return {
    path: relativePath,
    dirname: path.dirname(relativePath),
    basename: path.basename(dir),
    type: 'directory',
    children,
  };
}

// Load file content (like disk.mts loadFile)
function loadFile(projectDir: string, filePath: string): FileType {
  const fullPath = path.join(projectDir, filePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const basename = path.basename(filePath);

  return {
    path: filePath,
    name: basename,
    source: content,
    binary: isBinary(basename),
  };
}

// Demo execution
console.log('=== App File Operations Demo ===\n');

// Create temporary app directory
const appDir = fs.mkdtempSync(path.join(os.tmpdir(), 'srcbook-app-demo-'));
const appId = 'demo-' + Date.now().toString(36);
const appName = 'My Demo App';

console.log(`App ID: ${appId}`);
console.log(`App Directory: ${appDir}\n`);

// Create app structure (simulating scaffold)
console.log('1. Scaffolding app structure...');
createMockAppStructure(appDir, appName);
console.log('   Done!\n');

// List files (simulating loadDirectory)
console.log('2. Loading directory structure:');
const dirEntry = loadDirectory(appDir, appDir);
console.log(`   Root: ${dirEntry.path}`);
dirEntry.children?.forEach(child => {
  const icon = child.type === 'directory' ? '+' : '-';
  console.log(`   ${icon} ${child.basename}`);
});

// Load specific file (simulating loadFile)
console.log('\n3. Loading App.tsx content:');
console.log('   ' + '-'.repeat(50));
const appFile = loadFile(appDir, 'src/App.tsx');
console.log(`   File: ${appFile.name}`);
console.log(`   Binary: ${appFile.binary}`);
console.log(`   Preview (first 200 chars):`);
console.log('   ' + appFile.source.slice(0, 200).split('\n').join('\n   ') + '...');

// Cleanup
fs.rmSync(appDir, { recursive: true });
console.log('\n4. Cleaned up temporary directory');
console.log('\n=== Demo Complete ===');
```

## Explanation: How Scaffolding Works

When you create a new app, Srcbook performs these steps:

### Step 1: Database Record Creation

The `createApp()` function first creates a database record:

```typescript
// From app.mts (simplified)
const app = await db.insert(appsTable).values({
  name: data.name,
  externalId: randomid(),  // Unique identifier like 'a1b2c3d4'
}).returning();
```

### Step 2: Directory Scaffolding

The `scaffold()` function copies template files and customizes them:

```typescript
// From disk.mts (simplified)
async function scaffold(app, destDir) {
  const templateDir = 'templates/react-typescript';

  // Copy all template files
  for (const file of await fs.readdir(templateDir)) {
    await copy(path.join(templateDir, file), path.join(destDir, file));
  }

  // Customize package.json with app name
  const pkg = JSON.parse(await fs.readFile('package.json'));
  pkg.name = toValidPackageName(app.name);
  await fs.writeFile('package.json', JSON.stringify(pkg, null, 2));

  // Update index.html title
  const html = await fs.readFile('index.html', 'utf-8');
  const updated = html.replace(/<title>.*<\/title>/, `<title>${app.name}</title>`);
  await fs.writeFile('index.html', updated);
}
```

### Step 3: Dependency Installation

Background npm install runs to set up node_modules:

```typescript
// From app.mts
npmInstall(app.externalId, {
  stdout: (data) => console.log(data.toString()),
  stderr: (data) => console.error(data.toString()),
  onExit: (code) => console.log(`npm install exit code: ${code}`),
});
```

### Key Design Decisions

**1. Template-Based Scaffolding**
- Uses a pre-built React+TypeScript+Vite+Tailwind template
- Faster than scaffolding from scratch
- Ensures consistent, working configuration

**2. Package Name Sanitization**
- App names are converted to valid npm package names
- "My Cool App!" becomes "my-cool-app"
- Prevents npm install failures

**3. Non-Blocking Installation**
- npm install runs in background
- User can start editing immediately
- WebSocket broadcasts install progress

## Advanced Demo: App Lifecycle Simulation

This demo simulates the complete app lifecycle including creation, file updates, preview management, and cleanup.

###### advanced-demo.ts

```typescript
// Full app lifecycle management simulation
// This mirrors packages/api/apps/*.mts functionality

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EventEmitter } from 'events';

// Database record type (from db/schema.mts)
interface AppRecord {
  id: number;
  externalId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

// File change plan (from AI generation)
interface FilePlan {
  type: 'file';
  path: string;
  modified: string;
}

// Plan structure (from plan-parser.mts)
interface Plan {
  actions: FilePlan[];
}

// Process info
interface ProcessInfo {
  type: 'npm:install' | 'vite:server';
  status: 'running' | 'stopped' | 'failed';
  port?: number;
}

// Git commit info
interface CommitInfo {
  sha: string;
  message: string;
  timestamp: Date;
}

/**
 * AppManager simulates the Srcbook app management system
 *
 * In the real implementation:
 * - Apps are stored in SQLite via Drizzle ORM
 * - Files live in ~/.srcbook/apps/{appId}/
 * - Processes are managed via child_process
 * - Git uses simple-git library
 */
class AppManager extends EventEmitter {
  private apps: Map<string, AppRecord> = new Map();
  private appDirs: Map<string, string> = new Map();
  private processes: Map<string, ProcessInfo> = new Map();
  private commits: Map<string, CommitInfo[]> = new Map();
  private baseDir: string;
  private nextId = 1;

  constructor() {
    super();
    this.baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'srcbook-apps-'));
  }

  /**
   * Create a new app (like app.mts createApp)
   */
  async createApp(name: string): Promise<AppRecord> {
    const externalId = this.generateId();

    const record: AppRecord = {
      id: this.nextId++,
      externalId,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store in "database"
    this.apps.set(externalId, record);

    // Create app directory
    const appDir = path.join(this.baseDir, externalId);
    fs.mkdirSync(appDir, { recursive: true });
    this.appDirs.set(externalId, appDir);

    // Scaffold Vite app (like disk.mts scaffold)
    await this.scaffold(appDir, name);

    // Initialize git (like git.mts initRepo)
    await this.initGit(externalId);

    // Emit event (WebSocket broadcast in real impl)
    this.emit('app:created', { app: record });

    console.log(`Created app: ${name} (${externalId})`);
    return record;
  }

  /**
   * Scaffold app files (like disk.mts scaffold)
   */
  private async scaffold(appDir: string, name: string): Promise<void> {
    const packageName = this.toValidPackageName(name);

    const files: Record<string, string> = {
      'src/App.tsx': `import './index.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">${name}</h1>
        <p className="mt-4 text-gray-600">Your app is ready!</p>
      </div>
    </div>
  );
}

export default App;
`,
      'src/main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
      'src/index.css': '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n',
      'index.html': `<!DOCTYPE html>
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
        name: packageName,
        private: true,
        version: '0.0.0',
        type: 'module',
        scripts: { dev: 'vite', build: 'tsc -b && vite build' },
        dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' },
        devDependencies: {
          '@vitejs/plugin-react': '^4.3.1',
          typescript: '^5.5.3',
          vite: '^5.4.6',
          tailwindcss: '^3.4.14',
        },
      }, null, 2),
      'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`,
    };

    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(appDir, filePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }

    console.log(`  Scaffolded ${Object.keys(files).length} files`);
  }

  /**
   * Convert name to valid package name (like utils.mts toValidPackageName)
   */
  private toValidPackageName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  }

  /**
   * Initialize git repository (like git.mts initRepo)
   */
  private async initGit(appId: string): Promise<void> {
    const sha = this.generateSha();
    this.commits.set(appId, [{
      sha,
      message: 'Initial commit',
      timestamp: new Date(),
    }]);
    console.log(`  Initialized git (commit: ${sha.slice(0, 7)})`);
  }

  /**
   * Apply AI-generated plan (like disk.mts applyPlan)
   */
  async applyPlan(appId: string, plan: Plan): Promise<void> {
    const appDir = this.appDirs.get(appId);
    if (!appDir) throw new Error(`App not found: ${appId}`);

    console.log(`\nApplying plan with ${plan.actions.length} file changes...`);

    for (const action of plan.actions) {
      if (action.type === 'file') {
        const fullPath = path.join(appDir, action.path);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, action.modified);

        // Emit file update (WebSocket broadcast in real impl)
        this.emit('file:updated', { appId, file: { path: action.path } });
        console.log(`  Updated: ${action.path}`);
      }
    }

    // Update app timestamp
    const app = this.apps.get(appId);
    if (app) {
      app.updatedAt = new Date();
    }
  }

  /**
   * Commit all files (like git.mts commitAllFiles)
   */
  async commitChanges(appId: string, message: string): Promise<string> {
    const sha = this.generateSha();
    const commits = this.commits.get(appId) || [];
    commits.push({ sha, message, timestamp: new Date() });
    this.commits.set(appId, commits);

    console.log(`  Git commit: ${sha.slice(0, 7)} - ${message}`);
    return sha;
  }

  /**
   * Start preview server (like processes.mts viteServer)
   */
  async startPreview(appId: string): Promise<ProcessInfo> {
    const key = `${appId}:vite:server`;

    if (this.processes.has(key)) {
      console.log('  Preview server already running');
      return this.processes.get(key)!;
    }

    const port = 3000 + this.apps.size;
    const process: ProcessInfo = {
      type: 'vite:server',
      status: 'running',
      port,
    };

    this.processes.set(key, process);

    // Emit status (WebSocket broadcast in real impl)
    this.emit('preview:status', { appId, status: 'running', url: `http://localhost:${port}` });

    console.log(`  Preview server started at http://localhost:${port}`);
    console.log('  (In real implementation, this spawns vite dev server)');

    return process;
  }

  /**
   * Stop preview server
   */
  async stopPreview(appId: string): Promise<void> {
    const key = `${appId}:vite:server`;
    const process = this.processes.get(key);

    if (process) {
      process.status = 'stopped';
      this.processes.delete(key);
      this.emit('preview:status', { appId, status: 'stopped' });
      console.log(`  Preview server stopped`);
    }
  }

  /**
   * Get commit history (like git.mts getCommitHistory)
   */
  getCommitHistory(appId: string): CommitInfo[] {
    return this.commits.get(appId) || [];
  }

  /**
   * List all apps (like app.mts loadApps)
   */
  listApps(): AppRecord[] {
    return Array.from(this.apps.values());
  }

  /**
   * Delete app (like app.mts deleteApp)
   */
  async deleteApp(appId: string): Promise<void> {
    await this.stopPreview(appId);

    const appDir = this.appDirs.get(appId);
    if (appDir && fs.existsSync(appDir)) {
      fs.rmSync(appDir, { recursive: true });
    }

    this.apps.delete(appId);
    this.appDirs.delete(appId);
    this.commits.delete(appId);

    this.emit('app:deleted', { appId });
    console.log(`  Deleted app: ${appId}`);
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    for (const appId of Array.from(this.apps.keys())) {
      await this.deleteApp(appId);
    }
    if (fs.existsSync(this.baseDir)) {
      fs.rmSync(this.baseDir, { recursive: true });
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  private generateSha(): string {
    return Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
}

// Demo execution
async function demo() {
  console.log('=== App Lifecycle Demo ===\n');

  const manager = new AppManager();

  // Listen for events (simulates WebSocket broadcasts)
  manager.on('app:created', ({ app }) => {
    console.log(`  [Event] App created: ${app.name}`);
  });
  manager.on('file:updated', ({ appId, file }) => {
    console.log(`  [Event] File updated: ${file.path}`);
  });
  manager.on('preview:status', ({ appId, status, url }) => {
    console.log(`  [Event] Preview ${status}${url ? `: ${url}` : ''}`);
  });

  // 1. Create an app
  console.log('Step 1: Creating app...');
  const app = await manager.createApp('My Todo App');

  // 2. Simulate AI plan application (like createAppWithAi)
  console.log('\nStep 2: Applying AI-generated plan...');
  await manager.applyPlan(app.externalId, {
    actions: [
      {
        type: 'file',
        path: 'src/App.tsx',
        modified: `import { useState } from 'react';
import './index.css';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (!input.trim()) return;
    setTodos([...todos, {
      id: Date.now(),
      text: input,
      completed: false
    }]);
    setInput('');
  };

  const toggleTodo = (id: number) => {
    setTodos(todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-6">Todo App</h1>

        <div className="flex gap-2 mb-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            className="flex-1 px-4 py-2 border rounded-lg"
            placeholder="Add a todo..."
          />
          <button
            onClick={addTodo}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            Add
          </button>
        </div>

        <ul className="space-y-2">
          {todos.map((todo) => (
            <li
              key={todo.id}
              onClick={() => toggleTodo(todo.id)}
              className={\`p-3 bg-white rounded-lg cursor-pointer \${
                todo.completed ? 'line-through text-gray-400' : ''
              }\`}
            >
              {todo.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
`,
      },
    ],
  });

  // 3. Commit the changes
  console.log('\nStep 3: Committing changes...');
  await manager.commitChanges(app.externalId, 'Add todo functionality');

  // 4. Start preview
  console.log('\nStep 4: Starting preview server...');
  await manager.startPreview(app.externalId);

  // 5. Show commit history
  console.log('\nStep 5: Viewing commit history...');
  const history = manager.getCommitHistory(app.externalId);
  history.forEach((commit, i) => {
    console.log(`  ${i + 1}. ${commit.sha.slice(0, 7)} - ${commit.message}`);
  });

  // 6. List all apps
  console.log('\nStep 6: Listing all apps...');
  manager.listApps().forEach(a => {
    console.log(`  - ${a.name} (${a.externalId})`);
  });

  // Cleanup
  console.log('\nCleaning up...');
  await manager.cleanup();

  console.log('\n=== Demo Complete ===');
}

demo();
```

## Deep Dive: Implementation Details

### Process Management

The `processes.mts` file manages child processes for npm and Vite:

```typescript
// Simplified from processes.mts

class Processes {
  private map: Map<string, AppProcessType> = new Map();

  // Key format: "appId:processType"
  has(appId: string, type: ProcessType) {
    return this.map.has(`${appId}:${type}`);
  }

  get(appId: string, type: ProcessType) {
    return this.map.get(`${appId}:${type}`);
  }

  set(appId: string, process: AppProcessType) {
    this.map.set(`${appId}:${process.type}`, process);
  }
}

// Start Vite dev server
function viteServer(appId: string, options) {
  if (!processes.has(appId, 'vite:server')) {
    processes.set(appId, {
      type: 'vite:server',
      process: execVite({ cwd: pathToApp(appId), ...options }),
      port: null,  // Determined after server starts
    });
  }
  return processes.get(appId, 'vite:server');
}
```

**Key Points:**
- Only one Vite server per app at a time
- Port is determined dynamically
- Process cleanup happens on exit

### Git Integration

The `git.mts` file uses `simple-git` for version control:

```typescript
// From git.mts

import simpleGit from 'simple-git';

function getGit(app: DBAppType): SimpleGit {
  return simpleGit(pathToApp(app.externalId));
}

// Initialize repository with initial commit
async function initRepo(app: DBAppType): Promise<void> {
  const git = getGit(app);
  await git.init();
  await commitAllFiles(app, 'Initial commit');
}

// Commit all current files
async function commitAllFiles(app: DBAppType, message: string): Promise<string> {
  const git = getGit(app);
  await git.add('.');
  await git.commit(message, {
    '--author': 'Srcbook <ai@srcbook.com>',
  });
  return await git.revparse(['HEAD']);
}

// Time travel to a previous commit
async function checkoutCommit(app: DBAppType, commitSha: string): Promise<void> {
  const git = getGit(app);
  const files = await getChangedFiles(app, commitSha);

  // Stash any uncommitted changes
  await git.stash();

  // Checkout the commit
  await git.checkout(commitSha);

  // Notify client about changed files
  for (const file of files.modified) {
    const source = await fs.readFile(path.join(pathToApp(app.externalId), file), 'utf-8');
    broadcastFileUpdated(app, toFileType(file, source));
  }
}
```

**Key Points:**
- All commits authored by "Srcbook"
- Changes are broadcast to clients via WebSocket
- Stash protects uncommitted work during checkout

### AI-Powered Generation

When creating an app with AI:

```typescript
// From app.mts createAppWithAi (simplified)

async function createAppWithAi(data: CreateAppWithAiSchemaType): Promise<DBAppType> {
  // 1. Create app record and scaffold
  const app = await insert({ name: data.name, externalId: randomid() });
  await createViteApp(app);
  await initRepo(app);

  // 2. Start npm install (non-blocking)
  const npmProcess = npmInstall(app.externalId, { /* callbacks */ });

  // 3. Generate code with AI
  const files = await getFlatFilesForApp(app.externalId);
  const result = await generateApp(toValidPackageName(app.name), files, data.prompt);

  // 4. Parse AI response into actionable plan
  const plan = await parsePlan(result, app, data.prompt, randomid());

  // 5. Apply the plan (write files)
  await applyPlan(app, plan);

  // 6. Install any new dependencies
  const packagesToInstall = getPackagesToInstall(plan);
  if (packagesToInstall.length > 0) {
    await npmProcess; // Wait for initial install
    npmInstall(app.externalId, { packages: packagesToInstall, /* ... */ });
  }

  return app;
}
```

### File Update Broadcasting

When files change, clients are notified via WebSocket:

```typescript
// From disk.mts

function broadcastFileUpdated(app: DBAppType, file: FileType) {
  wss.broadcast(`app:${app.externalId}`, 'file:updated', { file });
}

async function writeFile(app: DBAppType, file: FileType) {
  // Guard against path traversal
  let path = file.path;
  if (!path.startsWith(pathToApp(app.externalId))) {
    path = Path.join(pathToApp(app.externalId), file.path);
  }

  await fs.mkdir(Path.dirname(path), { recursive: true });
  await fs.writeFile(path, file.source, 'utf-8');

  // Notify all connected clients
  broadcastFileUpdated(app, file);
}
```

## Interactive Exercise: Template System

Build a template registry that supports multiple app templates.

###### exercise.ts

```typescript
// Exercise: Build an App Template System
//
// Challenge:
// 1. Create a TemplateRegistry that stores app templates
// 2. Support multiple frameworks (React, Vue, Svelte - mocked)
// 3. Implement template customization with variables
// 4. Generate file contents from templates
//
// This is similar to how Srcbook's scaffold() function works,
// but generalized for multiple templates.

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Represents an app template configuration
 */
interface AppTemplate {
  name: string;
  displayName: string;
  framework: 'react' | 'vue' | 'svelte';
  description: string;
  files: TemplateFile[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

/**
 * A file within a template
 * Content can include {{variables}} for substitution
 */
interface TemplateFile {
  path: string;
  content: string;
}

/**
 * Variables to substitute in template files
 */
interface TemplateVariables {
  appName: string;
  packageName: string;
  [key: string]: string;
}

/**
 * Template Registry - stores and instantiates app templates
 *
 * TODO: Implement the following methods:
 * - register(template): Store a template
 * - list(): Return all templates
 * - get(name): Get template by name
 * - instantiate(name, variables): Create files from template
 */
class TemplateRegistry {
  private templates: Map<string, AppTemplate> = new Map();

  /**
   * Register a new template
   */
  register(template: AppTemplate): void {
    // TODO: Implement
    // Hint: Use this.templates.set()
    this.templates.set(template.name, template);
    console.log(`Registered template: ${template.displayName}`);
  }

  /**
   * List all registered templates
   */
  list(): AppTemplate[] {
    // TODO: Implement
    // Hint: Convert Map values to array
    return Array.from(this.templates.values());
  }

  /**
   * Get a specific template by name
   */
  get(name: string): AppTemplate | undefined {
    // TODO: Implement
    return this.templates.get(name);
  }

  /**
   * Instantiate a template with variables
   * Returns a map of filePath -> content
   */
  instantiate(templateName: string, variables: TemplateVariables): Map<string, string> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const files = new Map<string, string>();

    // TODO: Implement file generation
    // 1. Loop through template.files
    // 2. Replace {{variable}} placeholders with values
    // 3. Handle package.json specially (update name, deps)

    for (const file of template.files) {
      let content = file.content;

      // Replace all {{variable}} patterns
      for (const [key, value] of Object.entries(variables)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }

      files.set(file.path, content);
    }

    // Generate package.json
    const packageJson = {
      name: variables.packageName,
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: template.framework === 'react' ? 'vite' : `${template.framework} dev`,
        build: 'vite build',
      },
      dependencies: template.dependencies,
      devDependencies: template.devDependencies,
    };
    files.set('package.json', JSON.stringify(packageJson, null, 2));

    return files;
  }

  /**
   * Write instantiated files to disk
   */
  writeToDirectory(files: Map<string, string>, targetDir: string): void {
    for (const [filePath, content] of files) {
      const fullPath = path.join(targetDir, filePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
  }
}

// Create some sample templates
const reactTemplate: AppTemplate = {
  name: 'react-tailwind',
  displayName: 'React + Tailwind',
  framework: 'react',
  description: 'React with TypeScript and Tailwind CSS',
  files: [
    {
      path: 'src/App.tsx',
      content: `import './index.css';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <h1 className="text-4xl font-bold text-gray-900">{{appName}}</h1>
    </div>
  );
}

export default App;
`,
    },
    {
      path: 'src/main.tsx',
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
    },
    {
      path: 'src/index.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
    },
    {
      path: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>{{appName}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    },
  ],
  dependencies: {
    react: '^18.3.1',
    'react-dom': '^18.3.1',
  },
  devDependencies: {
    '@vitejs/plugin-react': '^4.3.1',
    tailwindcss: '^3.4.14',
    typescript: '^5.5.3',
    vite: '^5.4.6',
  },
};

const reactMinimalTemplate: AppTemplate = {
  name: 'react-minimal',
  displayName: 'React Minimal',
  framework: 'react',
  description: 'Minimal React setup without Tailwind',
  files: [
    {
      path: 'src/App.tsx',
      content: `function App() {
  return <h1>{{appName}}</h1>;
}

export default App;
`,
    },
    {
      path: 'src/main.tsx',
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
    },
    {
      path: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>{{appName}}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    },
  ],
  dependencies: {
    react: '^18.3.1',
    'react-dom': '^18.3.1',
  },
  devDependencies: {
    '@vitejs/plugin-react': '^4.3.1',
    typescript: '^5.5.3',
    vite: '^5.4.6',
  },
};

// Demo the template system
console.log('=== Template Registry Demo ===\n');

const registry = new TemplateRegistry();

// Register templates
registry.register(reactTemplate);
registry.register(reactMinimalTemplate);

// List templates
console.log('\nAvailable templates:');
registry.list().forEach(t => {
  console.log(`  - ${t.displayName} (${t.name}): ${t.description}`);
});

// Instantiate a template
console.log('\nInstantiating react-tailwind template...');
const files = registry.instantiate('react-tailwind', {
  appName: 'My Awesome App',
  packageName: 'my-awesome-app',
});

console.log('\nGenerated files:');
for (const [filePath, content] of files) {
  console.log(`\n--- ${filePath} ---`);
  console.log(content.slice(0, 200) + (content.length > 200 ? '...' : ''));
}

// Write to temp directory
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'template-demo-'));
registry.writeToDirectory(files, tempDir);
console.log(`\nWrote ${files.size} files to: ${tempDir}`);

// Cleanup
fs.rmSync(tempDir, { recursive: true });
console.log('Cleaned up temp directory');

console.log('\n=== Demo Complete ===');

// Bonus challenge: Try extending this to support:
// 1. Template validation (ensure required files exist)
// 2. Template inheritance (extend base templates)
// 3. Conditional files (include/exclude based on options)
// 4. Post-processing hooks (run code after instantiation)
```

## Source References

Want to see how this is actually implemented in Srcbook? Check out these files:

### Primary Implementation

| File | Purpose |
|------|---------|
| **[`packages/api/apps/app.mts`](../../../apps/app.mts)** | App CRUD operations, AI generation |
| **[`packages/api/apps/disk.mts`](../../../apps/disk.mts)** | File system operations, scaffolding |
| **[`packages/api/apps/processes.mts`](../../../apps/processes.mts)** | Vite server and npm process management |
| **[`packages/api/apps/git.mts`](../../../apps/git.mts)** | Git integration, version control |
| **[`packages/api/apps/utils.mts`](../../../apps/utils.mts)** | Utility functions (package name validation) |

### Templates

| File | Purpose |
|------|---------|
| **[`packages/api/apps/templates/react-typescript/`](../../../apps/templates/react-typescript/)** | React+Vite+Tailwind template |
| **[`packages/api/apps/templates/react-typescript/package.json`](../../../apps/templates/react-typescript/package.json)** | Template dependencies |
| **[`packages/api/apps/templates/react-typescript/src/App.tsx`](../../../apps/templates/react-typescript/src/App.tsx)** | Default App component |

### Related Code

| File | Purpose |
|------|---------|
| **[`packages/api/ai/generate.mts`](../../../ai/generate.mts)** | AI app generation |
| **[`packages/api/ai/plan-parser.mts`](../../../ai/plan-parser.mts)** | Parse AI responses into file plans |
| **[`packages/api/db/schema.mts`](../../../db/schema.mts)** | Database schema for apps |
| **[`packages/api/exec.mts`](../../../exec.mts)** | Process execution utilities |

## Next Steps

### Related Topics

Now that you understand the App Builder, you might want to explore:

- **Session Management**: How Srcbooks (not Apps) are managed
- **WebSocket Protocol**: How file updates are broadcast to clients
- **AI Integration**: How prompts become code changes
- **Database Layer**: How apps are persisted with Drizzle ORM

### Further Reading

- [Vite Documentation](https://vitejs.dev/) - Understanding the dev server
- [simple-git](https://github.com/steveukx/git-js) - Git library used by Srcbook
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM for apps table
- [React](https://react.dev/) - Frontend framework for apps

### Contributing

Found an error or want to improve this educational Srcbook?

1. The source for this Srcbook is at `packages/api/srcbook/examples/internals/app-builder.src.md`
2. Submit a PR with your improvements
3. Help make Srcbook's documentation even better!

## Summary

In this Srcbook, we covered:

**Architecture**
- The difference between Srcbooks (notebooks) and Apps (full projects)
- App directory structure and file organization
- The lifecycle from creation to preview

**Core Components**
- `app.mts`: App CRUD operations and AI generation
- `disk.mts`: File system operations and scaffolding
- `processes.mts`: Vite server and npm process management
- `git.mts`: Version control integration

**Key Concepts**
- Template-based scaffolding with customization
- Non-blocking npm install for responsiveness
- WebSocket broadcasts for real-time updates
- Git integration for version history and time travel

**Implementation Details**
- Process tracking with Map-based registry
- File change broadcasting via WebSocket
- AI plan parsing and application
- Package name sanitization

You now understand how Srcbook creates and manages full React applications. This knowledge is essential for extending the app builder, debugging app creation issues, or contributing to Srcbook's core functionality.

Happy building!
