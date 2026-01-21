<!-- srcbook:{"language":"typescript"} -->

# Cell Types and Structure

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

**What are Cell Types?**

Cells are the building blocks of a Srcbook. Each cell has a specific type that determines its behavior, appearance, and how it's executed. Understanding cell types is fundamental to working with Srcbook.

**Why does it matter?**

Understanding cell types is crucial because:
- They define the structure of every Srcbook
- Each type has different validation rules and behaviors
- They determine how content is stored and executed
- They enable type-safe operations throughout the codebase

**Prerequisites**

Before diving into this Srcbook, you should be familiar with:
- TypeScript basics
- Zod schema validation
- The .src.md format (see the "Understanding the Srcmd Format" Srcbook)

**Learning Objectives**

By the end of this Srcbook, you will understand:
- The five core cell types in Srcbook
- How cells are validated using Zod schemas
- Cell metadata and lifecycle
- How to create and manipulate cells programmatically

## Key Concepts

### Architecture Overview

Cells are defined using TypeScript types and Zod schemas for runtime validation:

```
┌─────────────────────────────────────────────┐
│         Cell Type Hierarchy                 │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ TitleCell                            │  │
│  │ - id, type, text                     │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ MarkdownCell                         │  │
│  │ - id, type, text                     │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ PackageJsonCell                      │  │
│  │ - id, type, source, filename, status │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ CodeCell                             │  │
│  │ - id, type, source, language,        │  │
│  │   filename, status                   │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ PlaceholderCell (AI generation)      │  │
│  │ - id, type, text                     │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
         │
         │ Validated by Zod schemas
         ▼
┌─────────────────────────────────────────────┐
│      Runtime Type Safety                    │
│  - Parse incoming data                      │
│  - Validate updates                         │
│  - Ensure type correctness                  │
└─────────────────────────────────────────────┘
```

### Core Concepts

**Concept 1: Cell Identity**

Every cell has a unique `id` generated using `randomid()`. This ID:
- Persists across sessions
- Is used for WebSocket communication
- Enables cell-specific operations (update, delete, execute)
- Never changes once created

**Concept 2: Cell Status**

Code cells and package.json cells have a `status` field:
- `'idle'`: Not currently executing
- `'running'`: Currently executing
- `'failed'`: (package.json only) Installation failed

This status is used to show loading indicators and prevent concurrent execution.

**Concept 3: Type Safety with Zod**

Srcbook uses Zod schemas to validate cells at runtime. This ensures:
- Data from WebSocket messages is valid
- Updates conform to allowed attributes
- Type errors are caught early
- API contracts are enforced

## Simple Demo: Creating Cells

Let's create each type of cell programmatically and see their structure.

###### simple-demo.ts

```typescript
// This demonstrates how to create each type of cell
// We'll use a simple randomid implementation

function randomid(): string {
  return Math.random().toString(36).substring(2, 15);
}

// 1. Title Cell - The notebook's title (one per Srcbook)
const titleCell = {
  id: randomid(),
  type: 'title' as const,
  text: 'My Awesome Srcbook'
};

console.log('Title Cell:');
console.log(JSON.stringify(titleCell, null, 2));

// 2. Markdown Cell - Rich text documentation
const markdownCell = {
  id: randomid(),
  type: 'markdown' as const,
  text: '## Introduction\n\nThis is a **markdown** cell with _formatting_.'
};

console.log('\nMarkdown Cell:');
console.log(JSON.stringify(markdownCell, null, 2));

// 3. Package.json Cell - Dependency management
const packageJsonCell = {
  id: randomid(),
  type: 'package.json' as const,
  source: '{\n  "type": "module",\n  "dependencies": {}\n}',
  filename: 'package.json' as const,
  status: 'idle' as const
};

console.log('\nPackage.json Cell:');
console.log(JSON.stringify(packageJsonCell, null, 2));

// 4. Code Cell - Executable code
const codeCell = {
  id: randomid(),
  type: 'code' as const,
  source: 'console.log("Hello from a code cell!");',
  language: 'typescript' as const,
  filename: 'hello.ts',
  status: 'idle' as const
};

console.log('\nCode Cell:');
console.log(JSON.stringify(codeCell, null, 2));

// 5. Placeholder Cell - Used during AI generation
const placeholderCell = {
  id: randomid(),
  type: 'placeholder' as const,
  text: '<!-- AI will generate content here -->'
};

console.log('\nPlaceholder Cell:');
console.log(JSON.stringify(placeholderCell, null, 2));
```

## Explanation: How It Works

Let's break down what's happening with each cell type:

### Cell Type 1: Title Cell

The title cell is the simplest cell type. It contains:
- `id`: Unique identifier
- `type`: Always `'title'`
- `text`: The title text (max 44 characters when updating)

**Key characteristics:**
- There is exactly ONE title cell per Srcbook
- It's always the first cell
- It's encoded as an H1 heading in .src.md format
- Updates are validated to ensure the title isn't too long

### Cell Type 2: Markdown Cell

Markdown cells contain rich text documentation:
- `id`: Unique identifier
- `type`: Always `'markdown'`
- `text`: Markdown-formatted text

**Key characteristics:**
- Can contain any valid markdown (headings, lists, links, code blocks, etc.)
- Multiple markdown cells can exist in a Srcbook
- They're used for literate programming - explaining code with rich formatting
- Not executable - purely for documentation

### Cell Type 3: Package.json Cell

The package.json cell manages dependencies:
- `id`: Unique identifier
- `type`: Always `'package.json'`
- `source`: The JSON content as a string
- `filename`: Always `'package.json'`
- `status`: `'idle'`, `'running'`, or `'failed'`

**Key characteristics:**
- There is exactly ONE package.json cell per Srcbook
- It's always the second cell (after title)
- When executed, it runs `npm install`
- The status indicates whether installation is in progress or failed

### Cell Type 4: Code Cell

Code cells contain executable JavaScript or TypeScript:
- `id`: Unique identifier
- `type`: Always `'code'`
- `source`: The code as a string
- `language`: Either `'javascript'` or `'typescript'`
- `filename`: The file name (e.g., `'hello.ts'`)
- `status`: `'idle'` or `'running'`

**Key characteristics:**
- Multiple code cells can exist in a Srcbook
- Each has a unique filename
- They're ECMAScript modules (can import/export)
- Executed using Node.js (JavaScript) or tsx (TypeScript)
- The status indicates whether the cell is currently executing

### Cell Type 5: Placeholder Cell

Placeholder cells are temporary markers used during AI generation:
- `id`: Unique identifier
- `type`: Always `'placeholder'`
- `text`: Placeholder text

**Key characteristics:**
- Not visible in the final Srcbook
- Used to mark where AI should insert generated cells
- Replaced with actual cells after generation
- Encoded as plain text in .src.md format

**Key Takeaways:**

- Each cell type has a specific purpose and structure
- IDs are unique and persistent
- Status fields track execution state
- Type safety is enforced through TypeScript and Zod

## Advanced Demo: Zod Schema Validation

Now let's look at how Srcbook validates cells using Zod schemas.

###### advanced-demo.ts

```typescript
// This demonstrates Zod schema validation for cells
// We'll create schemas similar to those in packages/shared/src/schemas/cells.mts

import { z } from 'zod';

// Define the schemas for each cell type
const TitleCellSchema = z.object({
  id: z.string(),
  type: z.literal('title'),
  text: z.string(),
});

const MarkdownCellSchema = z.object({
  id: z.string(),
  type: z.literal('markdown'),
  text: z.string(),
});

const PackageJsonCellSchema = z.object({
  id: z.string(),
  type: z.literal('package.json'),
  source: z.string(),
  filename: z.literal('package.json'),
  status: z.enum(['idle', 'running', 'failed']),
});

const CodeCellSchema = z.object({
  id: z.string(),
  type: z.literal('code'),
  source: z.string(),
  language: z.enum(['javascript', 'typescript']),
  filename: z.string(),
  status: z.enum(['idle', 'running']),
});

const PlaceholderCellSchema = z.object({
  id: z.string(),
  type: z.literal('placeholder'),
  text: z.string(),
});

// Union schema for any cell type
const CellSchema = z.union([
  TitleCellSchema,
  MarkdownCellSchema,
  PackageJsonCellSchema,
  CodeCellSchema,
]);

// Update schemas - only certain fields can be updated
const TitleCellUpdateAttrsSchema = z.object({
  text: z.string().max(44, 'Title must be 44 characters or fewer'),
});

const CodeCellUpdateAttrsSchema = z.object({
  source: z.string(),
  // Note: filename is NOT allowed here - renaming has a separate operation
});

// Example: Validate a valid cell
console.log('=== Validating a valid code cell ===');
const validCell = {
  id: 'abc123',
  type: 'code',
  source: 'console.log("Hello");',
  language: 'typescript',
  filename: 'hello.ts',
  status: 'idle'
};

try {
  const parsed = CodeCellSchema.parse(validCell);
  console.log('✅ Valid cell:', parsed);
} catch (error) {
  console.log('❌ Invalid cell:', error);
}

// Example: Validate an invalid cell (wrong status)
console.log('\n=== Validating an invalid cell ===');
const invalidCell = {
  id: 'abc123',
  type: 'code',
  source: 'console.log("Hello");',
  language: 'typescript',
  filename: 'hello.ts',
  status: 'failed' // Code cells can't have 'failed' status!
};

try {
  const parsed = CodeCellSchema.parse(invalidCell);
  console.log('✅ Valid cell:', parsed);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log('❌ Invalid cell:');
    error.errors.forEach(err => {
      console.log(`  - ${err.path.join('.')}: ${err.message}`);
    });
  }
}

// Example: Validate a title update
console.log('\n=== Validating a title update ===');
const validUpdate = { text: 'New Title' };
const invalidUpdate = { text: 'This title is way too long and exceeds the maximum allowed length of 44 characters' };

try {
  TitleCellUpdateAttrsSchema.parse(validUpdate);
  console.log('✅ Valid update:', validUpdate);
} catch (error) {
  console.log('❌ Invalid update');
}

try {
  TitleCellUpdateAttrsSchema.parse(invalidUpdate);
  console.log('✅ Valid update:', invalidUpdate);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log('❌ Invalid update:');
    error.errors.forEach(err => {
      console.log(`  - ${err.path.join('.')}: ${err.message}`);
    });
  }
}
```

## Deep Dive: Implementation Details

### How Srcbook Implements This

In the actual Srcbook codebase, cell types are implemented across several files:

- **`packages/shared/src/schemas/cells.mts`**: Zod schemas for validation
  - All cell schemas (Title, Markdown, Code, PackageJson, Placeholder)
  - Update attribute schemas (what fields can be updated)
  - Metadata schema for .src.md files

- **`packages/shared/src/types/cells.mts`**: TypeScript types
  - Type definitions inferred from Zod schemas
  - Ensures type safety across the codebase
  - Used in API, WebSocket messages, and UI components

- **`packages/api/session.mts`**: Cell operations
  - `addCell()`: Insert a new cell at a specific index
  - `updateCell()`: Update cell attributes with validation
  - `deleteCell()`: Remove a cell from the session
  - `renameCell()`: Rename a code cell's filename

### Architecture Details

**Type Safety Flow:**

```
User Action (UI)
       ↓
WebSocket Message
       ↓
Zod Schema Validation
       ↓
TypeScript Type Checking
       ↓
Session Update
       ↓
Disk Write
       ↓
WebSocket Broadcast
       ↓
UI Update
```

**Cell Lifecycle:**

1. **Creation**: Cell is created with a unique ID
2. **Validation**: Zod schema validates the structure
3. **Storage**: Cell is added to session.cells array
4. **Persistence**: Cell is written to disk (README.md and/or src/ files)
5. **Execution**: (Code cells only) Cell is executed via Node.js/tsx
6. **Updates**: Cell attributes are updated and re-validated
7. **Deletion**: Cell is removed from session and disk

### Edge Cases and Special Considerations

**Edge Case 1: Title Length Validation**

Title cells have a maximum length of 44 characters when updating. This is enforced by the Zod schema to ensure titles fit in the UI. However, when creating a new Srcbook, longer titles are allowed initially.

**Edge Case 2: Filename Uniqueness**

Code cell filenames must be unique within a Srcbook. The session management code checks for duplicates before allowing renames or new cells.

**Edge Case 3: Package.json Status**

The package.json cell is the only cell that can have a `'failed'` status. This happens when `npm install` fails. Code cells only have `'idle'` or `'running'` status.

**Edge Case 4: Placeholder Cells in Sessions**

Placeholder cells are temporary and should never exist in a persisted session. They're only used during AI generation and are immediately replaced with real cells.

### Performance Considerations

- Cell validation is fast because Zod schemas are compiled
- Cell updates are debounced in the UI to avoid excessive WebSocket messages
- Large code cells (>1MB) may cause performance issues during encoding/decoding
- The cells array is kept in memory for fast access

### Common Gotchas

⚠️ **Gotcha 1**: Mutating cells directly

Never mutate cells directly! Always create a new cell object when updating:
```typescript
// ❌ Wrong
cell.source = 'new code';

// ✅ Correct
const updatedCell = { ...cell, source: 'new code' };
```

⚠️ **Gotcha 2**: Forgetting to validate updates

Always validate cell updates using the appropriate schema before applying them. Otherwise, invalid data can corrupt the session.

⚠️ **Gotcha 3**: Assuming cell order

Don't assume cells are in a specific order. Always search by ID or type, not by array index.

## Interactive Exercise: Try It Yourself

Now it's your turn! Try creating and validating your own cells.

###### exercise.ts

```typescript
// Exercise: Create a mini Srcbook with validation
//
// Challenge:
// 1. Create a function that builds a complete Srcbook (title, package.json, markdown, code)
// 2. Validate each cell using Zod schemas
// 3. Handle validation errors gracefully
//
// Hints:
// - Use the schemas from the advanced demo
// - Remember to generate unique IDs
// - Check that there's exactly one title and one package.json

import { z } from 'zod';

// TODO: Copy the schemas from the advanced demo
// TODO: Implement a createSrcbook() function
// TODO: Validate the cells

console.log('Create your validated Srcbook here!');
```

## Source Code References

Want to see how this is actually implemented in Srcbook? Check out these files:

### Primary Implementation

- **[`packages/shared/src/schemas/cells.mts`](../../../../shared/src/schemas/cells.mts)**: Cell schemas
  - All Zod schemas for cell types
  - Update attribute schemas
  - Validation rules

- **[`packages/shared/src/types/cells.mts`](../../../../shared/src/types/cells.mts)**: Cell types
  - TypeScript type definitions
  - Inferred from Zod schemas
  - Used throughout the codebase

### Related Code

- **[`packages/api/session.mts`](../../../session.mts)**: Session management
  - Cell CRUD operations
  - Validation and error handling
  - Disk persistence

- **[`packages/shared/src/schemas/websockets.mts`](../../../../shared/src/schemas/websockets.mts)**: WebSocket schemas
  - Message payloads for cell operations
  - Event schemas

### Tests

- **[`packages/api/test/session.test.mts`](../../../test/session.test.mts)**: Session tests
  - Cell creation and updates
  - Validation edge cases

## Next Steps

### Related Topics

Now that you understand cell types, you might want to explore:

- **Session Management**: How cells are organized into sessions and persisted
- **Cell Execution System**: How code cells are executed
- **WebSocket Protocol**: How cell updates are communicated in real-time

### Further Reading

- [Zod Documentation](https://zod.dev/) - Understanding schema validation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) - Type system fundamentals
- [Literate Programming](https://en.wikipedia.org/wiki/Literate_programming) - The philosophy behind mixing code and docs

### Contributing

Found an error or want to improve this educational Srcbook?

1. The source for this Srcbook is at `packages/api/srcbook/examples/internals/cell-types.src.md`
2. Submit a PR with your improvements
3. Help make Srcbook's documentation even better!

## Summary

In this Srcbook, we covered:

✅ The five core cell types (Title, Markdown, PackageJson, Code, Placeholder)
✅ Cell structure and metadata (id, type, status, etc.)
✅ Zod schema validation for type safety
✅ Cell lifecycle and operations
✅ Common edge cases and gotchas

You now understand how cells are structured, validated, and managed in Srcbook. This knowledge is essential for working with sessions, WebSocket messages, and the execution system.

Happy coding! 🚀

