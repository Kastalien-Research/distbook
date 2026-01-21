<!-- srcbook:{"language":"typescript"} -->

# Session Management

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "@types/node": "latest",
    "tsx": "latest",
    "typescript": "latest"
  }
}
```

## Introduction

**What is a Session?**

A session is the runtime representation of a Srcbook. When you open a .src.md file or create a new Srcbook, Srcbook creates a session object that holds all the cells, metadata, and state in memory. Think of it as the "live" version of your notebook.

**Why does it matter?**

Understanding sessions is crucial because:
- Sessions bridge the gap between files on disk and the running application
- They manage the lifecycle of your Srcbook from creation to deletion
- They handle real-time updates and synchronization
- They're the central data structure for all Srcbook operations

**Prerequisites**

Before diving into this Srcbook, you should be familiar with:
- The .src.md format (see "Understanding the Srcmd Format")
- Cell types and structure (see "Cell Types and Structure")
- Basic file system operations
- TypeScript and async/await

**Learning Objectives**

By the end of this Srcbook, you will understand:
- What a session is and how it's structured
- How sessions are created from .src.md files
- The directory structure of a session on disk
- How sessions are loaded, updated, and persisted
- The session lifecycle from creation to deletion

## Key Concepts

### Architecture Overview

Sessions sit at the heart of Srcbook's architecture, connecting files, memory, and the UI:

```
┌─────────────────────────────────────────────┐
│         File System                         │
│                                             │
│  ~/.srcbook/srcbooks/{id}/                  │
│  ├── README.md (external .src.md)           │
│  ├── package.json                           │
│  ├── tsconfig.json (if TypeScript)          │
│  └── src/                                   │
│      ├── file1.ts                           │
│      └── file2.ts                           │
└─────────────────────────────────────────────┘
         │                    │
         │ decodeDir()        │ writeToDisk()
         ▼                    ▼
┌─────────────────────────────────────────────┐
│      Session (In-Memory)                    │
│                                             │
│  {                                          │
│    id: string,                              │
│    dir: string,                             │
│    cells: CellType[],                       │
│    language: 'javascript' | 'typescript',   │
│    'tsconfig.json'?: string,                │
│    openedAt: number                         │
│  }                                          │
└─────────────────────────────────────────────┘
         │                    │
         │ WebSocket          │ HTTP API
         ▼                    ▼
┌─────────────────────────────────────────────┐
│         UI (React)                          │
│  - Display cells                            │
│  - Execute code                             │
│  - Real-time updates                        │
└─────────────────────────────────────────────┘
```

### Core Concepts

**Concept 1: Session Structure**

A session has the following properties:
- `id`: Unique identifier (usually a random ID or directory basename)
- `dir`: Absolute path to the session's directory on disk
- `cells`: Array of all cells in the Srcbook
- `language`: Either `'javascript'` or `'typescript'`
- `tsconfig.json`: (Optional) TypeScript configuration as a string
- `openedAt`: Timestamp of when the session was last opened

**Concept 2: Session Registry**

Srcbook maintains an in-memory registry of all active sessions:
```typescript
const sessions: Record<string, SessionType> = {};
```

This registry:
- Maps session IDs to session objects
- Persists across requests (but not server restarts)
- Enables fast lookups without disk I/O
- Is loaded from disk on server boot

**Concept 3: Session Lifecycle**

1. **Creation**: Session is created from a .src.md file or from scratch
2. **Loading**: Session is loaded into the registry
3. **Active**: Session is being used (cells executed, updated, etc.)
4. **Persistence**: Changes are written to disk
5. **Closing**: Session remains in registry but is inactive
6. **Deletion**: Session is removed from registry and disk

## Simple Demo: Creating a Session

Let's simulate how Srcbook creates a session from a .src.md file.

###### simple-demo.ts

```typescript
// This demonstrates the basic session creation process
// We'll simulate the key steps without using internal modules

// Step 1: Define the session type
type SessionType = {
  id: string;
  dir: string;
  cells: any[]; // Simplified for demo
  language: 'javascript' | 'typescript';
  'tsconfig.json'?: string;
  openedAt: number;
};

// Step 2: Simulate the session registry
const sessions: Record<string, SessionType> = {};

// Step 3: Create a session
function createSession(srcbookDir: string, cells: any[], language: 'javascript' | 'typescript'): SessionType {
  // Extract the ID from the directory path (last segment)
  const id = srcbookDir.split('/').pop() || 'unknown';
  
  // Check if session already exists
  if (sessions[id]) {
    console.log(`Session ${id} already exists, updating openedAt`);
    sessions[id].openedAt = Date.now();
    return sessions[id];
  }
  
  // Create new session
  const session: SessionType = {
    id,
    dir: srcbookDir,
    cells,
    language,
    openedAt: Date.now()
  };
  
  // Add to registry
  sessions[id] = session;
  
  console.log(`Created session ${id}`);
  return session;
}

// Step 4: Demo - Create a few sessions
const session1 = createSession(
  '/Users/me/.srcbook/srcbooks/abc123',
  [
    { id: '1', type: 'title', text: 'My Srcbook' },
    { id: '2', type: 'package.json', source: '{}', filename: 'package.json', status: 'idle' }
  ],
  'javascript'
);

const session2 = createSession(
  '/Users/me/.srcbook/srcbooks/def456',
  [
    { id: '3', type: 'title', text: 'TypeScript Srcbook' },
    { id: '4', type: 'package.json', source: '{}', filename: 'package.json', status: 'idle' }
  ],
  'typescript'
);

// Step 5: List all sessions
console.log('\nActive sessions:');
Object.values(sessions).forEach(session => {
  console.log(`- ${session.id}: ${session.cells[0].text} (${session.language})`);
});

// Step 6: Find a session by ID
function findSession(id: string): SessionType | undefined {
  return sessions[id];
}

const found = findSession('abc123');
console.log('\nFound session:', found?.id, found?.cells[0].text);
```

## Explanation: How It Works

Let's break down the session creation process:

### Step 1: Directory Structure

When a session is created, Srcbook sets up a specific directory structure:

```
~/.srcbook/srcbooks/{session-id}/
├── README.md          # External format .src.md file
├── package.json       # Dependencies
├── tsconfig.json      # TypeScript config (if applicable)
├── env.d.ts          # Environment type declarations
└── src/              # Code cells
    ├── file1.js
    └── file2.js
```

The `session-id` is typically a random ID generated by `randomid()`.

### Step 2: Decoding from Disk

When opening an existing Srcbook, the process is:

1. **Read README.md**: Parse the external format .src.md file
2. **Read code files**: Load the actual source code from `src/` directory
3. **Merge data**: Combine README structure with file contents
4. **Create session**: Build the in-memory session object
5. **Register**: Add to the sessions registry

### Step 3: Session Registry

The session registry is a simple object that maps IDs to sessions:
- Fast O(1) lookups
- Persists in memory during server lifetime
- Reloaded from disk on server restart
- Enables multiple sessions to be open simultaneously

### Step 4: Persistence

When a session is updated, changes are written to disk:
- **README.md**: Updated with new cell structure
- **Code files**: Individual files updated in `src/` directory
- **package.json**: Updated if dependencies change
- **tsconfig.json**: Updated if TypeScript config changes

**Key Takeaways:**

- Sessions are the runtime representation of Srcbooks
- They bridge files on disk with the in-memory application state
- The session registry enables fast access to all active Srcbooks
- Changes are persisted to disk to ensure durability

## Advanced Demo: Session Lifecycle

Now let's look at the complete session lifecycle with more realistic operations.

###### advanced-demo.ts

```typescript
// This demonstrates the full session lifecycle
// Based on packages/api/session.mts

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Simplified types
type CellType = {
  id: string;
  type: string;
  [key: string]: any;
};

type SessionType = {
  id: string;
  dir: string;
  cells: CellType[];
  language: 'javascript' | 'typescript';
  'tsconfig.json'?: string;
  openedAt: number;
};

// Session registry
const sessions: Record<string, SessionType> = {};

// 1. CREATE SESSION from directory
async function createSession(srcbookDir: string): Promise<SessionType> {
  const id = path.basename(srcbookDir);

  // Check if already exists
  const existing = sessions[id];
  if (existing) {
    existing.openedAt = Date.now();
    return existing;
  }

  // In real implementation, this would call decodeDir()
  // For demo, we'll create a minimal session
  const session: SessionType = {
    id,
    dir: srcbookDir,
    cells: [
      { id: '1', type: 'title', text: 'Demo Srcbook' },
      { id: '2', type: 'package.json', source: '{"type":"module"}', filename: 'package.json', status: 'idle' }
    ],
    language: 'javascript',
    openedAt: Date.now()
  };

  sessions[id] = session;
  console.log(`✅ Created session: ${id}`);
  return session;
}

// 2. FIND SESSION by ID
async function findSession(id: string): Promise<SessionType> {
  const session = sessions[id];
  if (!session) {
    throw new Error(`Session with id ${id} not found`);
  }
  return session;
}

// 3. UPDATE SESSION
async function updateSession(
  session: SessionType,
  updates: Partial<SessionType>,
  flush: boolean = true
): Promise<SessionType> {
  const updatedSession = { ...session, ...updates };
  sessions[session.id] = updatedSession;

  if (flush) {
    // In real implementation, this would call writeToDisk()
    console.log(`💾 Persisted session ${session.id} to disk`);
  }

  return updatedSession;
}

// 4. ADD CELL to session
async function addCell(
  session: SessionType,
  cell: CellType,
  index: number
): Promise<void> {
  // Insert cell at specified index
  const cells = [...session.cells];
  cells.splice(index, 0, cell);

  await updateSession(session, { cells });
  console.log(`➕ Added cell ${cell.id} at index ${index}`);
}

// 5. DELETE CELL from session
async function deleteCell(
  session: SessionType,
  cellId: string
): Promise<void> {
  const cells = session.cells.filter(c => c.id !== cellId);
  await updateSession(session, { cells });
  console.log(`🗑️  Deleted cell ${cellId}`);
}

// 6. EXPORT SESSION to .src.md text
function exportSrcmdText(session: SessionType): string {
  // In real implementation, this would call encode()
  // For demo, we'll create a simple representation
  let srcmd = `<!-- srcbook:{"language":"${session.language}"} -->\n\n`;

  session.cells.forEach(cell => {
    if (cell.type === 'title') {
      srcmd += `# ${cell.text}\n\n`;
    } else if (cell.type === 'markdown') {
      srcmd += `${cell.text}\n\n`;
    } else if (cell.type === 'code' || cell.type === 'package.json') {
      srcmd += `###### ${cell.filename}\n\n\`\`\`${cell.language || 'json'}\n${cell.source}\n\`\`\`\n\n`;
    }
  });

  return srcmd.trim() + '\n';
}

// 7. DELETE SESSION
async function deleteSession(sessionId: string): Promise<void> {
  delete sessions[sessionId];
  // In real implementation, this would also delete the directory
  console.log(`🗑️  Deleted session ${sessionId}`);
}

// Demo: Run through the lifecycle
async function demo() {
  console.log('=== SESSION LIFECYCLE DEMO ===\n');

  // Create a session
  const session = await createSession('/tmp/srcbooks/demo123');

  // Add a markdown cell
  await addCell(session, {
    id: '3',
    type: 'markdown',
    text: '## Introduction\n\nThis is a demo.'
  }, 2);

  // Add a code cell
  await addCell(session, {
    id: '4',
    type: 'code',
    source: 'console.log("Hello!");',
    language: 'javascript',
    filename: 'hello.js',
    status: 'idle'
  }, 3);

  // Update the session
  await updateSession(session, { openedAt: Date.now() });

  // Export to .src.md
  console.log('\n📄 Exported .src.md:\n');
  console.log(exportSrcmdText(session));

  // Delete a cell
  await deleteCell(session, '3');

  // List all sessions
  console.log('\n📋 Active sessions:');
  Object.keys(sessions).forEach(id => {
    console.log(`  - ${id}`);
  });

  // Clean up
  await deleteSession('demo123');
}

// Run the demo
demo().catch(console.error);
```

## Deep Dive: Implementation Details

### How Srcbook Implements This

In the actual Srcbook codebase, session management is implemented across several files:

- **`packages/api/session.mts`**: Core session management
  - `createSession()`: Creates a session from a directory
  - `findSession()`: Looks up a session by ID
  - `updateSession()`: Updates session state and persists to disk
  - `addCell()`, `updateCell()`, `deleteCell()`: Cell operations
  - `exportSrcmdText()`: Exports session to .src.md format
  - `load()`: Loads all sessions from disk on boot

- **`packages/api/types.mts`**: Session type definition
  - `SessionType`: The TypeScript type for sessions
  - Used throughout the API and WebSocket handlers

- **`packages/api/srcbook/index.mts`**: Srcbook creation and import
  - `createSrcbook()`: Creates a new Srcbook from scratch
  - `importSrcbookFromSrcmdFile()`: Imports from a .src.md file
  - `importSrcbookFromSrcmdText()`: Imports from .src.md text
  - `writeToDisk()`: Persists session to file system

### Architecture Details

**Session Loading on Boot:**

When the Srcbook server starts, it:
1. Reads all directories in `~/.srcbook/srcbooks/`
2. For each directory, calls `createSession()`
3. Loads the session into the registry
4. Handles errors gracefully (skips invalid sessions)

This ensures all previously opened Srcbooks are available immediately.

**Session Persistence Strategy:**

Srcbook uses a dual-format approach:
- **In-memory**: Fast access, real-time updates
- **On-disk**: Durable storage, survives restarts

Changes are written to disk immediately (not batched) to ensure durability.

**Session Isolation:**

Each session has its own:
- Directory on disk
- Set of processes (for code execution)
- WebSocket topic (for real-time updates)
- TypeScript server instance (if TypeScript)

This ensures sessions don't interfere with each other.

### Edge Cases and Special Considerations

**Edge Case 1: Session Already Exists**

When creating a session for a directory that's already loaded, Srcbook:
- Returns the existing session
- Updates the `openedAt` timestamp
- Does NOT reload from disk (uses cached version)

**Edge Case 2: Invalid Srcbook Directory**

If a directory contains an invalid .src.md file:
- `createSession()` throws an error
- The session is NOT added to the registry
- The error is logged but doesn't crash the server

**Edge Case 3: Server Restart**

When the server restarts:
- All in-memory sessions are lost
- Sessions are reloaded from disk on boot
- Running processes are NOT restored (they're killed)
- WebSocket connections are re-established

**Edge Case 4: Concurrent Updates**

Multiple clients can update the same session:
- Updates are serialized (not truly concurrent)
- Last write wins (no conflict resolution)
- All clients receive updates via WebSocket

### Performance Considerations

- Session lookups are O(1) using the registry object
- Disk writes are async and don't block the event loop
- Large Srcbooks (100+ cells) may have slower load times
- The registry is kept in memory, so it scales with the number of open Srcbooks

### Common Gotchas

⚠️ **Gotcha 1**: Assuming sessions persist across restarts

Sessions are reloaded from disk on restart, but running state (executing cells, processes) is NOT restored.

⚠️ **Gotcha 2**: Modifying session directly

Always use `updateSession()` to modify sessions. Direct mutation won't persist to disk.

⚠️ **Gotcha 3**: Forgetting to flush

The `updateSession()` function has a `flush` parameter. If set to `false`, changes won't be written to disk immediately.

## Interactive Exercise: Try It Yourself

Now it's your turn! Try implementing session operations.

###### exercise.ts

```typescript
// Exercise: Implement session search and filtering
//
// Challenge:
// 1. Implement a function to find all JavaScript sessions
// 2. Implement a function to find sessions by title
// 3. Implement a function to find recently opened sessions (last 24 hours)
//
// Hints:
// - Use the sessions registry
// - Filter by session.language
// - Search in session.cells for title cells
// - Compare session.openedAt with current time

// TODO: Implement your solution here

console.log('Implement session search functions here!');
```

## Source Code References

Want to see how this is actually implemented in Srcbook? Check out these files:

### Primary Implementation

- **[`packages/api/session.mts`](../../../session.mts)**: Session management
  - All session CRUD operations
  - Cell operations (add, update, delete)
  - Export and persistence

- **[`packages/api/types.mts`](../../../types.mts)**: Type definitions
  - `SessionType` definition
  - Used throughout the codebase

- **[`packages/api/srcbook/index.mts`](../../index.mts)**: Srcbook operations
  - Creating new Srcbooks
  - Importing from .src.md files
  - Writing to disk

### Related Code

- **[`packages/api/server/http.mts`](../../../server/http.mts)**: HTTP API
  - Session endpoints (create, get, list, delete)
  - Handles session-related HTTP requests

- **[`packages/api/server/ws.mts`](../../../server/ws.mts)**: WebSocket handlers
  - Real-time session updates
  - Cell execution and updates

- **[`packages/api/constants.mts`](../../../constants.mts)**: Configuration
  - `SRCBOOKS_DIR`: Where sessions are stored

### Tests

- **[`packages/api/test/session.test.mts`](../../../test/session.test.mts)**: Session tests
  - Session creation and updates
  - Cell operations
  - Edge cases

## Next Steps

### Related Topics

Now that you understand session management, you might want to explore:

- **Cell Execution System**: How code cells are executed within a session
- **WebSocket Protocol**: How session updates are communicated in real-time
- **Process Management**: How running processes are tracked per session

### Further Reading

- [Node.js File System API](https://nodejs.org/api/fs.html) - Understanding file operations
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) - Type system
- [Event Loop](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/) - Understanding async operations

### Contributing

Found an error or want to improve this educational Srcbook?

1. The source for this Srcbook is at `packages/api/srcbook/examples/internals/session-management.src.md`
2. Submit a PR with your improvements
3. Help make Srcbook's documentation even better!

## Summary

In this Srcbook, we covered:

✅ What sessions are and how they're structured
✅ The session registry and lifecycle
✅ Creating sessions from .src.md files and directories
✅ Session operations (create, find, update, delete)
✅ Persistence strategy and directory structure
✅ Common edge cases and gotchas

You now understand how Srcbook manages sessions, from creation to deletion. This knowledge is essential for understanding how Srcbooks are executed, updated, and persisted.

Happy coding! 🚀

