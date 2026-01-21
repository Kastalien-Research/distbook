<!-- srcbook:{"language":"typescript"} -->

# Understanding the Srcmd Format

###### package.json

```json
{
  "type": "module",
  "dependencies": {
    "@types/node": "latest",
    "marked": "^14.1.4",
    "tsx": "latest",
    "typescript": "latest"
  }
}
```

## Introduction

**What is the .src.md format?**

The `.src.md` format is Srcbook's file format for storing notebooks. It's a markdown-based format that encodes all the cells, metadata, and code in a single human-readable file. Think of it as the "source code" for a Srcbook.

**Why does it matter?**

Understanding the srcmd format is crucial because:
- It's how Srcbooks are shared and version controlled
- It enables importing/exporting notebooks
- It's the bridge between the file system and the runtime session
- It allows you to edit Srcbooks in any text editor

**Prerequisites**

Before diving into this Srcbook, you should be familiar with:
- Basic Markdown syntax
- JavaScript/TypeScript modules
- File system concepts

**Learning Objectives**

By the end of this Srcbook, you will understand:
- The structure of a .src.md file
- How cells are encoded and decoded
- The difference between inline and external file references
- How Srcbook maps .src.md files to directory structures

## Key Concepts

### Architecture Overview

The srcmd format sits at the heart of Srcbook's persistence layer:

```
┌─────────────────────────────────────────────┐
│         .src.md File (Markdown)             │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ Metadata Header (JSON comment)       │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ Title Cell (H1)                      │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ Package.json Cell (H6 + code block)  │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ Markdown Cells (paragraphs, etc.)    │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ Code Cells (H6 + code block)         │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
         │                    │
         │ decode()           │ encode()
         ▼                    ▼
┌─────────────────────────────────────────────┐
│      Session Object (In-Memory)             │
│  { id, cells[], language, dir, ... }        │
└─────────────────────────────────────────────┘
         │                    │
         │ writeToDisk()      │ decodeDir()
         ▼                    ▼
┌─────────────────────────────────────────────┐
│    Directory Structure (File System)        │
│                                             │
│  srcbook-id/                                │
│  ├── README.md (external format)            │
│  ├── package.json                           │
│  ├── tsconfig.json (if TypeScript)          │
│  └── src/                                   │
│      ├── file1.ts                           │
│      └── file2.ts                           │
└─────────────────────────────────────────────┘
```

### Core Concepts

**Concept 1: Metadata Header**

Every .src.md file starts with an HTML comment containing JSON metadata:
```markdown
<!-- srcbook:{"language":"typescript"} -->
```

This metadata includes:
- `language`: Either "javascript" or "typescript"
- `tsconfig.json`: (Optional) TypeScript configuration as an object

**Concept 2: Cell Encoding**

Cells are encoded using markdown syntax:
- **Title cells**: H1 headings (`# Title`)
- **Markdown cells**: Regular markdown content
- **Code cells**: H6 heading with filename + code block
- **Package.json**: Special H6 heading + JSON code block

**Concept 3: Inline vs. External**

Code can be stored in two ways:
- **Inline**: Code is embedded directly in the .src.md file (for sharing)
- **External**: Code is referenced as a link to a file (for editing)

## Simple Demo: Parsing a .src.md File

Let's parse a simple .src.md file manually to understand its structure.

###### simple-parse.ts

```typescript
// This demonstrates how to parse a .src.md file
// We'll use the 'marked' library which Srcbook uses internally

import { marked } from 'marked';

// A minimal .src.md file
const srcmdContent = `<!-- srcbook:{"language":"javascript"} -->

# Hello Srcbook

###### package.json

\`\`\`json
{
  "type": "module"
}
\`\`\`

## Introduction

This is a markdown cell explaining the notebook.

###### hello.js

\`\`\`javascript
console.log("Hello, World!");
\`\`\`
`;

// Parse the markdown into tokens
const tokens = marked.lexer(srcmdContent);

console.log('Parsed tokens:');
console.log(JSON.stringify(tokens, null, 2));

// Let's identify the different parts
console.log('\n--- Token Analysis ---');
tokens.forEach((token, index) => {
  if (token.type === 'html' && token.text.includes('srcbook:')) {
    console.log(`Token ${index}: Metadata header`);
  } else if (token.type === 'heading' && token.depth === 1) {
    console.log(`Token ${index}: Title cell - "${token.text}"`);
  } else if (token.type === 'heading' && token.depth === 6) {
    console.log(`Token ${index}: Filename - "${token.text}"`);
  } else if (token.type === 'code') {
    console.log(`Token ${index}: Code block (${token.lang})`);
  } else if (token.type === 'heading' && token.depth === 2) {
    console.log(`Token ${index}: Markdown heading - "${token.text}"`);
  } else if (token.type === 'paragraph') {
    console.log(`Token ${index}: Markdown paragraph`);
  }
});
```

## Explanation: How It Works

Let's break down what's happening in the simple demo:

### Step 1: Lexical Analysis

The `marked.lexer()` function converts the markdown text into an array of tokens. Each token represents a structural element:
- HTML comments (for metadata)
- Headings (H1 for title, H6 for filenames, H2-H5 for markdown)
- Code blocks (for code cells)
- Paragraphs (for markdown content)

### Step 2: Token Grouping

Srcbook groups tokens by their function:
1. **Metadata**: HTML comment with `srcbook:` prefix
2. **Title**: The first H1 heading
3. **Filename + Code**: H6 heading followed by a code block
4. **Markdown**: Everything else (paragraphs, headings, lists, etc.)

### Step 3: Validation

Before converting tokens to cells, Srcbook validates:
- There must be exactly one H1 (title)
- Every H6 must be followed by a code block or link
- There must be exactly one package.json
- Filenames must be valid

**Key Takeaways:**

- The .src.md format is just structured markdown
- Parsing happens in stages: lexing → grouping → validation → conversion
- The format is designed to be human-readable and git-friendly

## Advanced Demo: Encoding and Decoding

Now let's look at how Srcbook actually encodes and decodes .src.md files using the real implementation.

###### advanced-demo.ts

```typescript
// This demonstrates the actual encode/decode functions from Srcbook
// Note: We're simulating the behavior since we can't import internal modules directly

import { randomid } from '@srcbook/shared';

// Simulating the cell types
type TitleCell = { id: string; type: 'title'; text: string };
type MarkdownCell = { id: string; type: 'markdown'; text: string };
type CodeCell = {
  id: string;
  type: 'code';
  source: string;
  language: 'javascript' | 'typescript';
  filename: string;
  status: 'idle' | 'running';
};
type PackageJsonCell = {
  id: string;
  type: 'package.json';
  source: string;
  filename: 'package.json';
  status: 'idle' | 'running' | 'failed';
};

type Cell = TitleCell | MarkdownCell | CodeCell | PackageJsonCell;

// Simplified encoding function (based on packages/api/srcmd/encoding.mts)
function encodeToSrcmd(cells: Cell[], language: 'javascript' | 'typescript', inline: boolean): string {
  const parts: string[] = [];

  // 1. Add metadata header
  parts.push(`<!-- srcbook:{"language":"${language}"} -->`);

  for (const cell of cells) {
    switch (cell.type) {
      case 'title':
        // Title cells are encoded as H1
        parts.push(`# ${cell.text}`);
        break;

      case 'markdown':
        // Markdown cells are just their text
        parts.push(cell.text.trim());
        break;

      case 'package.json':
      case 'code':
        // Code cells are H6 + code block (inline) or H6 + link (external)
        if (inline) {
          const lang = cell.type === 'package.json' ? 'json' : cell.language;
          parts.push(`###### ${cell.filename}\n\n\`\`\`${lang}\n${cell.source}\n\`\`\``);
        } else {
          const filepath = cell.type === 'package.json'
            ? './package.json'
            : `./src/${cell.filename}`;
          parts.push(`###### ${cell.filename}\n\n[${cell.filename}](${filepath})`);
        }
        break;
    }
  }

  // End with exactly one newline
  return parts.join('\n\n').trimEnd() + '\n';
}

// Example: Create a simple Srcbook and encode it
const cells: Cell[] = [
  {
    id: randomid(),
    type: 'title',
    text: 'My First Srcbook'
  },
  {
    id: randomid(),
    type: 'package.json',
    source: '{\n  "type": "module"\n}',
    filename: 'package.json',
    status: 'idle'
  },
  {
    id: randomid(),
    type: 'markdown',
    text: '## Getting Started\n\nThis is my first Srcbook!'
  },
  {
    id: randomid(),
    type: 'code',
    source: 'console.log("Hello, Srcbook!");',
    language: 'javascript',
    filename: 'hello.js',
    status: 'idle'
  }
];

console.log('=== INLINE FORMAT (for sharing) ===\n');
const inlineFormat = encodeToSrcmd(cells, 'javascript', true);
console.log(inlineFormat);

console.log('\n=== EXTERNAL FORMAT (for editing) ===\n');
const externalFormat = encodeToSrcmd(cells, 'javascript', false);
console.log(externalFormat);
```

## Deep Dive: Implementation Details

### How Srcbook Implements This

In the actual Srcbook codebase, the srcmd format is implemented across several files:

- **`packages/api/srcmd/encoding.mts`**: Converts cells to .src.md format
  - `encode()`: Main encoding function
  - `encodeMetadata()`: Creates the metadata header
  - `encodeCodeCell()`: Handles code cell encoding (inline vs external)

- **`packages/api/srcmd/decoding.mts`**: Parses .src.md files into cells
  - `decode()`: Main decoding function for complete files
  - `decodeCells()`: Decodes partial content (used for AI generation)
  - `groupTokens()`: Groups markdown tokens by function
  - `validateTokenGroups()`: Ensures the structure is valid

- **`packages/api/srcmd.mts`**: High-level API
  - `decodeDir()`: Reads a directory and creates a session
  - Combines README.md parsing with file system reads

### Architecture Details

**The Two-Phase Approach:**

1. **Inline Format** (`.src.md` file):
   - All code is embedded in the markdown
   - Used for sharing, importing, exporting
   - Single file contains everything
   - Example: `getting-started.src.md`

2. **External Format** (directory structure):
   - Code is in separate files
   - Used for editing and execution
   - Better for version control of individual files
   - Example: `~/.srcbook/srcbooks/{id}/`

**The Conversion Flow:**

```
User imports .src.md
       ↓
decode() parses markdown
       ↓
Session created in memory
       ↓
writeToDisk() creates directory
       ↓
README.md (external format) + src/ files
       ↓
User edits files
       ↓
Changes sync to session
       ↓
exportSrcmdText() creates inline .src.md
       ↓
User shares .src.md file
```

### Edge Cases and Special Considerations

**Edge Case 1: TypeScript Configuration**

When encoding TypeScript Srcbooks, the tsconfig.json is stored in the metadata header as an object, but in the session it's stored as a string. The encoding/decoding handles this conversion.

**Edge Case 2: Placeholder Cells**

Placeholder cells are used when AI generates content. They're temporary markers that get replaced with actual cells. They're encoded as plain text in the .src.md format.

**Edge Case 3: Linked Code Cells**

When a code cell is external (not inline), it's encoded as a markdown link:
```markdown
###### hello.js

[hello.js](./src/hello.js)
```

The decoder recognizes this pattern and reads the actual file content from disk.

### Performance Considerations

- Parsing is done synchronously using the `marked` library
- File I/O is asynchronous and batched when possible
- Large Srcbooks with many cells are still fast because markdown parsing is efficient
- The external format allows for lazy loading of code cells

### Common Gotchas

⚠️ **Gotcha 1**: Forgetting the metadata header

Every .src.md file MUST start with the metadata comment. Without it, decoding will fail.

⚠️ **Gotcha 2**: Multiple H1 headings

There can only be ONE H1 heading (the title). Additional H1s will cause validation errors.

⚠️ **Gotcha 3**: H6 without code block

Every H6 heading (filename) must be immediately followed by either a code block or a link. Otherwise, validation fails.

## Interactive Exercise: Try It Yourself

Now it's your turn! Try creating your own .src.md content and see how it would be parsed.

###### exercise.ts

```typescript
// Exercise: Create a .src.md file for a simple calculator Srcbook
//
// Challenge:
// 1. Create cells for a calculator that can add and multiply
// 2. Include a title, package.json, markdown explanation, and code cells
// 3. Encode it in both inline and external formats
//
// Hints:
// - Start with the metadata header
// - Remember the title must be H1
// - Code cells need H6 + code block
// - Use the encodeToSrcmd function from the advanced demo

// TODO: Implement your solution here
// Copy the encodeToSrcmd function from above and create your calculator Srcbook

console.log('Create your calculator Srcbook here!');
```

## Source Code References

Want to see how this is actually implemented in Srcbook? Check out these files:

### Primary Implementation

- **[`packages/api/srcmd/encoding.mts`](../../../srcmd/encoding.mts)**: Main encoding logic
  - `encode()` function converts cells to .src.md format
  - Handles inline vs external encoding
  - Manages metadata header creation

- **[`packages/api/srcmd/decoding.mts`](../../../srcmd/decoding.mts)**: Main decoding logic
  - `decode()` function parses complete .src.md files
  - `decodeCells()` for partial content (AI generation)
  - Token grouping and validation

- **[`packages/api/srcmd.mts`](../../../srcmd.mts)**: High-level API
  - `decodeDir()` reads from file system
  - Combines README.md parsing with file reads

### Related Code

- **[`packages/api/srcbook/index.mts`](../../index.mts)**: Srcbook creation and management
  - `importSrcbookFromSrcmdFile()` imports .src.md files
  - `importSrcbookFromSrcmdText()` imports from text
  - `writeToDisk()` writes sessions to file system

- **[`packages/shared/src/schemas/cells.mts`](../../../../shared/src/schemas/cells.mts)**: Cell schemas
  - Zod schemas for all cell types
  - Validation rules

### Tests

- **[`packages/api/test/srcmd.test.mts`](../../../test/srcmd.test.mts)**: Comprehensive tests
  - Encoding/decoding round-trip tests
  - Error case validation
  - Edge case handling

## Next Steps

### Related Topics

Now that you understand the srcmd format, you might want to explore:

- **Cell Types and Structure**: Deep dive into the different cell types and their schemas
- **Session Management**: How .src.md files become runtime sessions
- **File System Mapping**: How directories are structured and managed

### Further Reading

- [Markdown Specification](https://spec.commonmark.org/) - Understanding the markdown syntax
- [Marked Library](https://marked.js.org/) - The markdown parser Srcbook uses
- [Literate Programming](https://en.wikipedia.org/wiki/Literate_programming) - The philosophy behind mixing code and documentation

### Contributing

Found an error or want to improve this educational Srcbook?

1. The source for this Srcbook is at `packages/api/srcbook/examples/internals/srcmd-format.src.md`
2. Submit a PR with your improvements
3. Help make Srcbook's documentation even better!

## Summary

In this Srcbook, we covered:

✅ The structure of .src.md files (metadata header, cells, encoding)
✅ How markdown tokens are parsed and grouped into cells
✅ The difference between inline and external formats
✅ How encoding and decoding work in Srcbook
✅ Common edge cases and gotchas to avoid

You now understand how Srcbook's file format works and can read, write, and debug .src.md files. This knowledge is fundamental to understanding how Srcbooks are stored, shared, and executed.

Happy coding! 🚀

