<!-- srcbook:{"language":"typescript"} -->

# TypeScript Autocomplete - Intelligent Code Completion

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

**What is TypeScript Autocomplete?**

TypeScript autocomplete provides intelligent code suggestions as you type. When you type `user.` and see a dropdown of properties like `name`, `age`, and `email`, that is autocomplete in action.

This feature is powered by `tsserver`, which analyzes your code in real-time and returns contextually relevant suggestions based on:

- **Type information**: Properties and methods available on a type
- **Scope**: Variables and functions in the current scope
- **Imports**: Available exports from modules
- **Keywords**: TypeScript/JavaScript language keywords

**Related feature**: Hover/QuickInfo shows type information when you hover over identifiers, using the same underlying infrastructure.

**Why does it matter?**

Understanding the autocomplete system helps you:
- Debug completion issues (why suggestions are missing or wrong)
- Build custom completion providers or filters
- Extend the editor with domain-specific suggestions
- Contribute to the TypeScript integration layer

**Prerequisites**

Before diving in, you should be familiar with:
- TypeScript Server basics (see the TypeScript Server Srcbook)
- TypeScript Diagnostics (see the TypeScript Diagnostics Srcbook)
- Basic understanding of language server protocols

**Learning Objectives**

By the end of this Srcbook, you will:
1. Understand how completions are requested and received
2. Learn the completion entry structure (name, kind, details)
3. Comprehend hover/quickinfo functionality
4. Know how to build custom completion providers

## Key Concepts

### Completions Request/Response Flow

```
+-------------------------------------------------------------------+
|                    Completions Request Flow                        |
|                                                                    |
|  1. User Types                                                     |
|     +-------------------+                                          |
|     | "user." triggers  |                                          |
|     | completion popup  |                                          |
|     +--------+----------+                                          |
|              v                                                     |
|  2. Position Mapping                                               |
|     +------------------------------------------+                   |
|     | mapCMLocationToTsServer(code, cursorPos) |                   |
|     | CodeMirror (0-based) -> tsserver (1-based)|                  |
|     +--------+---------------------------------+                   |
|              v                                                     |
|  3. WebSocket Request                                              |
|     +------------------------------------------+                   |
|     | channel.push(                            |                   |
|     |   'tsserver:cell:completions:request',   |                   |
|     |   { cellId, location: { line, offset } } |                   |
|     | )                                        |                   |
|     +--------+---------------------------------+                   |
|              v                                                     |
|  4. tsserver Command                                               |
|     +------------------------------------------+                   |
|     | tsserver.completions({                   |                   |
|     |   file: cellPath,                        |                   |
|     |   line: location.line,                   |                   |
|     |   offset: location.offset                |                   |
|     | })                                       |                   |
|     +--------+---------------------------------+                   |
|              v                                                     |
|  5. Response Processing                                            |
|     +------------------------------------------+                   |
|     | Filter by prefix, sort by relevance      |                   |
|     | Map entries to CodeMirror format         |                   |
|     +--------+---------------------------------+                   |
|              v                                                     |
|  6. WebSocket Response                                             |
|     +------------------------------------------+                   |
|     | 'tsserver:cell:completions:response'     |                   |
|     | { entries: CompletionEntry[] }           |                   |
|     +--------+---------------------------------+                   |
|              v                                                     |
|  7. Display in Editor                                              |
|     +------------------------------------------+                   |
|     | CodeMirror autocomplete dropdown         |                   |
|     | with icons per completion kind           |                   |
|     +------------------------------------------+                   |
|                                                                    |
+-------------------------------------------------------------------+
```

### Completion Entry Structure

Each completion suggestion from tsserver contains:

- **name**: The text to insert (e.g., "name", "toString")
- **kind**: The type of completion (property, method, function, class, etc.)
- **kindModifiers**: Additional modifiers (optional, deprecated, etc.)
- **sortText**: Used for ordering suggestions
- **insertText**: Alternative text to insert (for snippets)

### QuickInfo (Hover) Flow

When you hover over an identifier:

1. Editor detects hover position
2. Position mapped to tsserver coordinates
3. `quickinfo` command sent to tsserver
4. Response includes: displayString, documentation, tags
5. Tooltip rendered with formatted content

## Simple Demo: Understanding Completion Entries

This demo shows the structure of completion entries and how to format them for display.

###### simple-completions.ts

```typescript
// Demonstrate completion entry structure and formatting

import { z } from 'zod';

// ============================================
// Completion Entry Schema (based on tsserver)
// ============================================

const CompletionEntrySchema = z.object({
  name: z.string(),              // The completion text
  kind: z.string(),              // Type of completion
  kindModifiers: z.string().optional(),  // Additional modifiers
  sortText: z.string().optional(),       // Sorting key
  insertText: z.string().optional(),     // Alternative insert text
  replacementSpan: z.object({
    start: z.object({ line: z.number(), offset: z.number() }),
    end: z.object({ line: z.number(), offset: z.number() }),
  }).optional(),
  hasAction: z.boolean().optional(),     // Has additional action (like auto-import)
  source: z.string().optional(),         // Source module for imports
  isRecommended: z.boolean().optional(), // Recommended completion
  isFromUncheckedFile: z.boolean().optional(),
});

type CompletionEntry = z.infer<typeof CompletionEntrySchema>;

// ============================================
// Completion Kind Icons
// ============================================

const kindIcons: Record<string, string> = {
  property: '{}',      // Property of an object
  method: '()',        // Method that can be called
  function: 'fn',      // Standalone function
  class: 'C',          // Class definition
  interface: 'I',      // Interface definition
  type: 'T',           // Type alias
  variable: '$',       // Variable
  const: '#',          // Constant
  keyword: 'kw',       // Language keyword
  module: 'M',         // Module/namespace
  enum: 'E',           // Enum
  'enum member': 'em', // Enum member
  parameter: 'p',      // Function parameter
  alias: 'A',          // Type alias
  'local variable': '$', // Local variable
};

function getKindIcon(kind: string): string {
  return kindIcons[kind] || '?';
}

// ============================================
// Sample Completions for "user."
// ============================================

// Simulate typing "user." where user has type:
// interface User { name: string; age: number; greet(): void }

const userCompletions: CompletionEntry[] = [
  {
    name: 'name',
    kind: 'property',
    kindModifiers: '',
    sortText: '0',
  },
  {
    name: 'age',
    kind: 'property',
    kindModifiers: '',
    sortText: '1',
  },
  {
    name: 'greet',
    kind: 'method',
    kindModifiers: '',
    sortText: '2',
  },
  // Inherited from Object prototype
  {
    name: 'toString',
    kind: 'method',
    kindModifiers: '',
    sortText: '10',
  },
  {
    name: 'hasOwnProperty',
    kind: 'method',
    kindModifiers: '',
    sortText: '11',
  },
];

// ============================================
// Sample Completions for Various Contexts
// ============================================

// Top-level scope completions
const scopeCompletions: CompletionEntry[] = [
  { name: 'console', kind: 'module', sortText: '0' },
  { name: 'process', kind: 'module', sortText: '1' },
  { name: 'Buffer', kind: 'class', sortText: '2' },
  { name: 'Promise', kind: 'class', sortText: '3' },
  { name: 'Array', kind: 'class', sortText: '4' },
  { name: 'const', kind: 'keyword', sortText: '99' },
  { name: 'let', kind: 'keyword', sortText: '99' },
  { name: 'function', kind: 'keyword', sortText: '99' },
  { name: 'interface', kind: 'keyword', sortText: '99' },
  { name: 'type', kind: 'keyword', sortText: '99' },
];

// Import completions
const importCompletions: CompletionEntry[] = [
  { name: 'fs', kind: 'module', source: 'node:fs', sortText: '0' },
  { name: 'path', kind: 'module', source: 'node:path', sortText: '1' },
  { name: 'EventEmitter', kind: 'class', source: 'node:events', sortText: '2', hasAction: true },
];

// ============================================
// Formatting Functions
// ============================================

function formatCompletion(entry: CompletionEntry): string {
  const icon = getKindIcon(entry.kind);
  const modifiers = entry.kindModifiers ? ` (${entry.kindModifiers})` : '';
  const source = entry.source ? ` from "${entry.source}"` : '';
  const action = entry.hasAction ? ' +' : '';

  return `[${icon}] ${entry.name}${modifiers}${source}${action}`;
}

function formatCompletionList(entries: CompletionEntry[], prefix: string = ''): void {
  // Filter by prefix if provided
  const filtered = prefix
    ? entries.filter(e => e.name.toLowerCase().startsWith(prefix.toLowerCase()))
    : entries;

  // Sort by sortText
  const sorted = [...filtered].sort((a, b) =>
    (a.sortText || '99').localeCompare(b.sortText || '99')
  );

  sorted.forEach(entry => {
    console.log('  ' + formatCompletion(entry));
  });
}

// ============================================
// Demo Output
// ============================================

console.log('=== TypeScript Completion Entries Demo ===\n');

console.log('Completions for "user." (User interface with name, age, greet):');
console.log('-'.repeat(50));
formatCompletionList(userCompletions);

console.log('\nCompletions for scope (top-level identifiers):');
console.log('-'.repeat(50));
formatCompletionList(scopeCompletions);

console.log('\nCompletions for import (available modules):');
console.log('-'.repeat(50));
formatCompletionList(importCompletions);

console.log('\nFiltered completions (prefix "to"):');
console.log('-'.repeat(50));
formatCompletionList(userCompletions, 'to');

// ============================================
// Completion Kind Reference
// ============================================

console.log('\n=== Completion Kind Reference ===\n');

const allKinds = [
  { kind: 'property', example: 'user.name' },
  { kind: 'method', example: 'array.push()' },
  { kind: 'function', example: 'parseInt()' },
  { kind: 'class', example: 'new MyClass()' },
  { kind: 'interface', example: 'implements IFoo' },
  { kind: 'type', example: 'type Foo = ...' },
  { kind: 'variable', example: 'let x = ...' },
  { kind: 'const', example: 'const PI = 3.14' },
  { kind: 'keyword', example: 'const, let, if' },
  { kind: 'module', example: 'import fs from "fs"' },
  { kind: 'enum', example: 'enum Color { ... }' },
  { kind: 'enum member', example: 'Color.Red' },
];

allKinds.forEach(({ kind, example }) => {
  console.log(`  [${getKindIcon(kind)}] ${kind.padEnd(15)} e.g., ${example}`);
});

// ============================================
// Schema Validation
// ============================================

console.log('\n=== Schema Validation ===\n');

const allEntries = [...userCompletions, ...scopeCompletions, ...importCompletions];
let valid = 0;
let invalid = 0;

allEntries.forEach(entry => {
  const result = CompletionEntrySchema.safeParse(entry);
  if (result.success) {
    valid++;
  } else {
    invalid++;
    console.log(`Invalid entry "${entry.name}":`, result.error.issues);
  }
});

console.log(`Validated ${allEntries.length} entries: ${valid} valid, ${invalid} invalid`);
```

## Understanding Completion Entries

### Completion Entry Fields

When tsserver returns completion entries, each entry contains:

**Required Fields:**
- `name`: The identifier to complete (e.g., "map", "filter", "toString")
- `kind`: What type of identifier this is

**Common Kinds:**
| Kind | Description | Example |
|------|-------------|---------|
| `property` | Object property | `user.name` |
| `method` | Callable method | `array.push` |
| `function` | Standalone function | `parseInt` |
| `class` | Class constructor | `new Date` |
| `interface` | Interface type | `implements Iterable` |
| `type` | Type alias | `type UserId = string` |
| `variable` | Mutable variable | `let count` |
| `const` | Constant | `const PI` |
| `keyword` | Language keyword | `async`, `await` |
| `module` | Module/namespace | `fs`, `path` |

**Optional Fields:**
- `kindModifiers`: Comma-separated modifiers like "optional", "deprecated"
- `sortText`: Determines ordering (lexicographic sort)
- `insertText`: Alternative text to insert (for snippets)
- `hasAction`: Indicates additional action needed (like auto-import)
- `source`: Source module for auto-import completions

### Position Mapping

The editor (CodeMirror) uses 0-based absolute positions, but tsserver uses 1-based line and offset:

```typescript
// CodeMirror: absolute position from document start
const cmPosition = 42; // Character 42 in document

// tsserver: 1-based line and offset
const tsPosition = { line: 3, offset: 14 }; // Line 3, column 14
```

Srcbook's `mapCMLocationToTsServer` function handles this conversion.

## Advanced Demo: Full Completion Provider

This demo simulates a complete completion provider similar to Srcbook's implementation.

###### completion-provider.ts

```typescript
// Full CompletionProvider simulation with quickinfo support

import { EventEmitter } from 'events';

// ============================================
// Type Definitions
// ============================================

interface Position {
  line: number;   // 1-based
  offset: number; // 1-based
}

interface CompletionEntry {
  name: string;
  kind: string;
  kindModifiers?: string;
  sortText?: string;
  insertText?: string;
  source?: string;
  hasAction?: boolean;
}

interface CompletionResult {
  entries: CompletionEntry[];
  isGlobalCompletion: boolean;
  isMemberCompletion: boolean;
  isNewIdentifierLocation: boolean;
}

interface QuickInfoResult {
  displayString: string;
  documentation: string | DocumentationPart[];
  tags: JsDocTag[];
  kind: string;
  kindModifiers: string;
}

interface DocumentationPart {
  kind: string;
  text: string;
}

interface JsDocTag {
  name: string;
  text?: string;
}

// ============================================
// Mock Data Store
// ============================================

const mockCompletions: Record<string, CompletionEntry[]> = {
  'Array.': [
    { name: 'length', kind: 'property', sortText: '0' },
    { name: 'push', kind: 'method', sortText: '1' },
    { name: 'pop', kind: 'method', sortText: '2' },
    { name: 'map', kind: 'method', sortText: '3' },
    { name: 'filter', kind: 'method', sortText: '4' },
    { name: 'reduce', kind: 'method', sortText: '5' },
    { name: 'find', kind: 'method', sortText: '6' },
    { name: 'forEach', kind: 'method', sortText: '7' },
    { name: 'some', kind: 'method', sortText: '8' },
    { name: 'every', kind: 'method', sortText: '9' },
    { name: 'slice', kind: 'method', sortText: '10' },
    { name: 'splice', kind: 'method', sortText: '11' },
    { name: 'concat', kind: 'method', sortText: '12' },
    { name: 'join', kind: 'method', sortText: '13' },
  ],
  'console.': [
    { name: 'log', kind: 'method', sortText: '0' },
    { name: 'error', kind: 'method', sortText: '1' },
    { name: 'warn', kind: 'method', sortText: '2' },
    { name: 'info', kind: 'method', sortText: '3' },
    { name: 'debug', kind: 'method', sortText: '4' },
    { name: 'table', kind: 'method', sortText: '5' },
    { name: 'time', kind: 'method', sortText: '6' },
    { name: 'timeEnd', kind: 'method', sortText: '7' },
    { name: 'trace', kind: 'method', sortText: '8' },
    { name: 'assert', kind: 'method', sortText: '9' },
    { name: 'clear', kind: 'method', sortText: '10' },
    { name: 'count', kind: 'method', sortText: '11' },
    { name: 'group', kind: 'method', sortText: '12' },
    { name: 'groupEnd', kind: 'method', sortText: '13' },
  ],
  'String.': [
    { name: 'length', kind: 'property', sortText: '0' },
    { name: 'charAt', kind: 'method', sortText: '1' },
    { name: 'charCodeAt', kind: 'method', sortText: '2' },
    { name: 'concat', kind: 'method', sortText: '3' },
    { name: 'includes', kind: 'method', sortText: '4' },
    { name: 'indexOf', kind: 'method', sortText: '5' },
    { name: 'slice', kind: 'method', sortText: '6' },
    { name: 'split', kind: 'method', sortText: '7' },
    { name: 'substring', kind: 'method', sortText: '8' },
    { name: 'toLowerCase', kind: 'method', sortText: '9' },
    { name: 'toUpperCase', kind: 'method', sortText: '10' },
    { name: 'trim', kind: 'method', sortText: '11' },
    { name: 'replace', kind: 'method', sortText: '12' },
    { name: 'match', kind: 'method', sortText: '13' },
  ],
};

const mockQuickInfo: Record<string, QuickInfoResult> = {
  'map': {
    displayString: '(method) Array<T>.map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[]',
    documentation: 'Calls a defined callback function on each element of an array, and returns an array that contains the results.',
    tags: [
      { name: 'param', text: 'callbackfn - A function that accepts up to three arguments.' },
      { name: 'param', text: 'thisArg - An object to which the this keyword can refer.' },
      { name: 'returns', text: 'A new array with each element being the result of the callback function.' },
      { name: 'example', text: '[1, 2, 3].map(x => x * 2) // [2, 4, 6]' },
    ],
    kind: 'method',
    kindModifiers: '',
  },
  'filter': {
    displayString: '(method) Array<T>.filter(predicate: (value: T, index: number, array: T[]) => boolean, thisArg?: any): T[]',
    documentation: 'Returns the elements of an array that meet the condition specified in a callback function.',
    tags: [
      { name: 'param', text: 'predicate - A function that tests each element.' },
      { name: 'returns', text: 'A new array containing all elements that pass the test.' },
    ],
    kind: 'method',
    kindModifiers: '',
  },
  'reduce': {
    displayString: '(method) Array<T>.reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U',
    documentation: 'Calls the specified callback function for all the elements in an array. The return value of the callback function is the accumulated result.',
    tags: [
      { name: 'param', text: 'callbackfn - A function that accepts up to four arguments.' },
      { name: 'param', text: 'initialValue - The initial value of the accumulator.' },
      { name: 'returns', text: 'The accumulated result.' },
      { name: 'example', text: '[1, 2, 3].reduce((acc, x) => acc + x, 0) // 6' },
    ],
    kind: 'method',
    kindModifiers: '',
  },
  'console': {
    displayString: 'const console: Console',
    documentation: 'The global console object for logging to stdout/stderr.',
    tags: [],
    kind: 'const',
    kindModifiers: '',
  },
  'log': {
    displayString: '(method) Console.log(...data: any[]): void',
    documentation: 'Prints to stdout with newline. Multiple arguments can be passed.',
    tags: [
      { name: 'param', text: 'data - Values to print' },
    ],
    kind: 'method',
    kindModifiers: '',
  },
};

// ============================================
// Completion Provider Class
// ============================================

class CompletionProvider extends EventEmitter {
  private seq = 0;

  // Get completions for a position in code
  getCompletions(code: string, position: Position, prefix: string): CompletionResult {
    console.log(`[CompletionProvider] Getting completions at line ${position.line}, offset ${position.offset}`);

    // Find what we're completing
    const lines = code.split('\n');
    const currentLine = lines[position.line - 1] || '';
    const textBeforeCursor = currentLine.slice(0, position.offset);

    // Detect member completion (after a dot)
    const memberMatch = textBeforeCursor.match(/(\w+)\.\s*(\w*)$/);

    let entries: CompletionEntry[] = [];
    let isMemberCompletion = false;

    if (memberMatch) {
      const objectName = memberMatch[1];
      const partialMember = memberMatch[2] || '';
      isMemberCompletion = true;

      // Look up completions for this object type
      const key = `${objectName}.`;
      entries = mockCompletions[key] || [];

      // Filter by partial member name
      if (partialMember) {
        entries = entries.filter(e =>
          e.name.toLowerCase().startsWith(partialMember.toLowerCase())
        );
      }

      console.log(`  -> Member completion for "${objectName}.", prefix="${partialMember}"`);
    } else {
      // Global completion
      entries = [
        { name: 'console', kind: 'const', sortText: '0' },
        { name: 'Array', kind: 'class', sortText: '1' },
        { name: 'String', kind: 'class', sortText: '2' },
        { name: 'Number', kind: 'class', sortText: '3' },
        { name: 'Object', kind: 'class', sortText: '4' },
        { name: 'Promise', kind: 'class', sortText: '5' },
        { name: 'Math', kind: 'const', sortText: '6' },
        { name: 'JSON', kind: 'const', sortText: '7' },
        { name: 'const', kind: 'keyword', sortText: '99' },
        { name: 'let', kind: 'keyword', sortText: '99' },
        { name: 'function', kind: 'keyword', sortText: '99' },
        { name: 'async', kind: 'keyword', sortText: '99' },
        { name: 'await', kind: 'keyword', sortText: '99' },
        { name: 'if', kind: 'keyword', sortText: '99' },
        { name: 'for', kind: 'keyword', sortText: '99' },
        { name: 'while', kind: 'keyword', sortText: '99' },
        { name: 'return', kind: 'keyword', sortText: '99' },
      ];

      // Filter by prefix
      if (prefix) {
        entries = entries.filter(e =>
          e.name.toLowerCase().startsWith(prefix.toLowerCase())
        );
      }

      console.log(`  -> Global completion, prefix="${prefix}"`);
    }

    console.log(`  -> Found ${entries.length} completions`);

    return {
      entries,
      isGlobalCompletion: !isMemberCompletion,
      isMemberCompletion,
      isNewIdentifierLocation: false,
    };
  }

  // Get quickinfo (hover) for an identifier
  getQuickInfo(identifier: string): QuickInfoResult | null {
    console.log(`[CompletionProvider] Getting quickinfo for "${identifier}"`);

    const info = mockQuickInfo[identifier];
    if (info) {
      console.log(`  -> Found quickinfo: ${info.displayString.slice(0, 50)}...`);
      return info;
    }

    console.log(`  -> No quickinfo found`);
    return null;
  }

  // Format completions for display
  formatCompletions(result: CompletionResult): void {
    const { entries, isMemberCompletion, isGlobalCompletion } = result;

    const context = isMemberCompletion ? 'Member' : isGlobalCompletion ? 'Global' : 'Other';
    console.log(`\n${context} Completions (${entries.length} items):`);
    console.log('-'.repeat(50));

    // Sort by sortText
    const sorted = [...entries].sort((a, b) =>
      (a.sortText || '99').localeCompare(b.sortText || '99')
    );

    sorted.forEach(entry => {
      const icon = this.getKindIcon(entry.kind);
      const modifiers = entry.kindModifiers ? ` [${entry.kindModifiers}]` : '';
      console.log(`  [${icon}] ${entry.name}${modifiers}`);
    });
  }

  // Format quickinfo for display
  formatQuickInfo(info: QuickInfoResult): void {
    console.log('\nQuickInfo:');
    console.log('-'.repeat(50));
    console.log(`  ${info.displayString}`);

    if (info.documentation) {
      console.log('\n  Documentation:');
      if (typeof info.documentation === 'string') {
        console.log(`    ${info.documentation}`);
      } else {
        info.documentation.forEach(part => {
          console.log(`    [${part.kind}] ${part.text}`);
        });
      }
    }

    if (info.tags.length > 0) {
      console.log('\n  Tags:');
      info.tags.forEach(tag => {
        const text = tag.text ? ` ${tag.text}` : '';
        console.log(`    @${tag.name}${text}`);
      });
    }
  }

  private getKindIcon(kind: string): string {
    const icons: Record<string, string> = {
      property: '{}',
      method: '()',
      function: 'fn',
      class: 'C',
      interface: 'I',
      type: 'T',
      variable: '$',
      const: '#',
      keyword: 'kw',
      module: 'M',
    };
    return icons[kind] || '?';
  }
}

// ============================================
// Demo
// ============================================

console.log('='.repeat(60));
console.log('Completion Provider Demo');
console.log('='.repeat(60));

const provider = new CompletionProvider();

// Demo 1: Member completion for Array
console.log('\n--- Demo 1: Array method completions ---');
const code1 = `
const numbers = [1, 2, 3];
numbers.ma
`.trim();

console.log('Code:');
code1.split('\n').forEach((line, i) => console.log(`  ${i + 1}: ${line}`));

const result1 = provider.getCompletions(code1, { line: 2, offset: 11 }, '');
provider.formatCompletions(result1);

// Demo 2: Console completions
console.log('\n--- Demo 2: Console method completions ---');
const code2 = `console.`;

console.log('Code:');
console.log(`  1: ${code2}`);

const result2 = provider.getCompletions(code2, { line: 1, offset: 9 }, '');
provider.formatCompletions(result2);

// Demo 3: Global completions with prefix
console.log('\n--- Demo 3: Global completions with prefix "co" ---');
const code3 = `co`;

console.log('Code:');
console.log(`  1: ${code3}`);

const result3 = provider.getCompletions(code3, { line: 1, offset: 3 }, 'co');
provider.formatCompletions(result3);

// Demo 4: QuickInfo for map method
console.log('\n--- Demo 4: QuickInfo for "map" method ---');
const mapInfo = provider.getQuickInfo('map');
if (mapInfo) {
  provider.formatQuickInfo(mapInfo);
}

// Demo 5: QuickInfo for reduce method
console.log('\n--- Demo 5: QuickInfo for "reduce" method ---');
const reduceInfo = provider.getQuickInfo('reduce');
if (reduceInfo) {
  provider.formatQuickInfo(reduceInfo);
}

console.log('\n' + '='.repeat(60));
console.log('Demo Complete');
console.log('='.repeat(60));
```

## Deep Dive: Srcbook's Implementation

Let's examine how Srcbook actually implements completions and quickinfo.

### Source File Overview

| File | Purpose |
|------|---------|
| `packages/api/server/ws.mts` | WebSocket handlers for completion/quickinfo requests |
| `packages/web/src/components/cells/get-completions.ts` | Client-side completion source |
| `packages/web/src/components/cells/hover.ts` | Hover/quickinfo provider |
| `packages/web/src/components/cells/util.ts` | Position mapping utilities |

### Client-Side Completion Source

From `packages/web/src/components/cells/get-completions.ts`:

```typescript
export function getCompletions(
  context: CompletionContext,
  cell: CodeCellType,
  channel: SessionChannel,
): Promise<CompletionResult | null> {
  return new Promise((resolve) => {
    // Only for TypeScript cells
    if (cell.language !== 'typescript') {
      resolve(null);
      return;
    }

    // Check if we should show completions
    const word = context.matchBefore(/\w*/);
    if (word?.from == word?.to && !context.explicit) {
      resolve(null);
      return;
    }

    // Listen for response
    function callback({ response }) {
      channel.off('tsserver:cell:completions:response', callback);
      if (response === null) return;

      const options = response.entries.map((entry) => ({
        label: entry.name,
        type: entry.kind,
        info: entry.kindModifiers,
      }));

      resolve({
        from: word?.from ?? pos,
        options: options,
      });
    }

    channel.on('tsserver:cell:completions:response', callback);
    channel.push('tsserver:cell:completions:request', {
      cellId: cell.id,
      request: {
        location: mapCMLocationToTsServer(cell.source, pos),
      },
    });
  });
}
```

**Key points:**
1. Checks if TypeScript cell
2. Determines if completions should trigger
3. Registers callback for response
4. Sends request with mapped position
5. Formats response for CodeMirror

### Server-Side Handler

From `packages/api/server/ws.mts`:

```typescript
async function getCompletions(wss, socket, session, payload) {
  const { cellId, request } = payload;
  const cell = cells.find((c) => c.id === cellId);

  // Get tsserver for this session
  const tsserver = tsservers.get(session.id);

  // Send completions request to tsserver
  const tsserverResponse = await tsserver.completions({
    file: cellPath,
    line: payload.request.location.line,
    offset: payload.request.location.offset,
  });

  // Broadcast response to client
  wss.broadcast(`session:${session.id}`, 'tsserver:cell:completions:response', {
    response: entries ? { entries } : null,
  });
}
```

### Position Mapping Utilities

From `packages/web/src/components/cells/util.ts`:

```typescript
// Convert CodeMirror position (0-based absolute) to tsserver (1-based line/offset)
export function mapCMLocationToTsServer(
  code: string,
  cmPosition: number,
): { line: number; offset: number } {
  const lines = code.split('\n');
  let remainingPosition = cmPosition;
  let lineIndex = 0;

  while (lineIndex < lines.length && remainingPosition > (lines[lineIndex]?.length ?? 0)) {
    remainingPosition -= (lines[lineIndex]?.length ?? 0) + 1; // +1 for newline
    lineIndex++;
  }

  return {
    line: lineIndex + 1,     // Convert to 1-based
    offset: remainingPosition, // Already 0-based, which tsserver expects
  };
}

// Convert tsserver position to CodeMirror position
export function mapTsServerLocationToCM(code: string, line: number, offset: number): number {
  const lines = code.split('\n');
  const startOffset =
    lines.slice(0, line - 1).reduce((sum, line) => sum + line.length + 1, 0) + offset - 1;
  return Math.min(code.length - 1, startOffset);
}
```

### Hover/QuickInfo Implementation

From `packages/web/src/components/cells/hover.ts`:

```typescript
export function tsHover(cell: CodeCellType, channel: SessionChannel, theme: ThemeType): Extension {
  return hoverTooltip(async (view, pos) => {
    if (cell.language !== 'typescript') {
      return null;
    }

    // Find word boundaries at hover position
    const { from, to, text } = view.state.doc.lineAt(pos);
    let start = pos;
    let end = pos;

    while (start > from && /\w/.test(text[start - from - 1] ?? '')) start--;
    while (end < to && /\w/.test(text[end - from] ?? '')) end++;

    return {
      pos: start,
      end: end,
      create: () => {
        const tooltipContainer = document.createElement('div');

        function callback({ response }) {
          // Format signature
          const signatureNode = formatCode(response.displayString, theme);
          tooltipContainer.appendChild(signatureNode);

          // Format documentation
          const documentationNode = formatDocumentation(response.documentation);
          if (documentationNode) {
            tooltipContainer.appendChild(documentationNode);
          }

          // Format JSDoc tags
          const tagsNode = formatTags(response.tags);
          if (tagsNode) {
            tooltipContainer.appendChild(tagsNode);
          }
        }

        return {
          dom: tooltipContainer,
          mount() {
            channel.on('tsserver:cell:quickinfo:response', callback);
            channel.push('tsserver:cell:quickinfo:request', {
              cellId: cell.id,
              request: { location: mapCMLocationToTsServer(cell.source, pos) },
            });
          },
          destroy() {
            channel.off('tsserver:cell:quickinfo:response', callback);
          },
        };
      },
    };
  });
}
```

**Key points:**
1. Uses CodeMirror's `hoverTooltip` extension
2. Finds word boundaries at cursor
3. Creates tooltip container
4. Requests quickinfo via WebSocket
5. Formats response (signature, docs, tags)

## Interactive Exercise: Build a Smart Completion Provider

Build an enhanced completion provider with fuzzy matching and usage tracking.

###### exercise.ts

```typescript
// Exercise: Build a Smart Completion Provider
//
// Challenge:
// 1. Implement fuzzy matching (not just prefix)
// 2. Boost recently used completions
// 3. Add type-aware filtering
// 4. Track completion usage statistics

interface CompletionEntry {
  name: string;
  kind: string;
  sortText?: string;
  typeInfo?: string;  // e.g., "string", "number", "() => void"
}

interface UsageStats {
  count: number;
  lastUsed: Date;
}

class SmartCompletionProvider {
  private usageStats: Map<string, UsageStats> = new Map();
  private recentlyUsed: string[] = [];
  private maxRecent = 10;

  // Standard completions database
  private completions: Record<string, CompletionEntry[]> = {
    'Array.': [
      { name: 'map', kind: 'method', typeInfo: '<U>(fn: (v: T) => U) => U[]' },
      { name: 'filter', kind: 'method', typeInfo: '(fn: (v: T) => boolean) => T[]' },
      { name: 'find', kind: 'method', typeInfo: '(fn: (v: T) => boolean) => T | undefined' },
      { name: 'forEach', kind: 'method', typeInfo: '(fn: (v: T) => void) => void' },
      { name: 'reduce', kind: 'method', typeInfo: '<U>(fn: (acc: U, v: T) => U, init: U) => U' },
      { name: 'some', kind: 'method', typeInfo: '(fn: (v: T) => boolean) => boolean' },
      { name: 'every', kind: 'method', typeInfo: '(fn: (v: T) => boolean) => boolean' },
      { name: 'includes', kind: 'method', typeInfo: '(v: T) => boolean' },
      { name: 'indexOf', kind: 'method', typeInfo: '(v: T) => number' },
      { name: 'length', kind: 'property', typeInfo: 'number' },
      { name: 'push', kind: 'method', typeInfo: '(...items: T[]) => number' },
      { name: 'pop', kind: 'method', typeInfo: '() => T | undefined' },
      { name: 'shift', kind: 'method', typeInfo: '() => T | undefined' },
      { name: 'unshift', kind: 'method', typeInfo: '(...items: T[]) => number' },
      { name: 'slice', kind: 'method', typeInfo: '(start?: number, end?: number) => T[]' },
      { name: 'splice', kind: 'method', typeInfo: '(start: number, deleteCount?: number) => T[]' },
      { name: 'concat', kind: 'method', typeInfo: '(...items: T[]) => T[]' },
      { name: 'join', kind: 'method', typeInfo: '(sep?: string) => string' },
      { name: 'reverse', kind: 'method', typeInfo: '() => T[]' },
      { name: 'sort', kind: 'method', typeInfo: '(fn?: (a: T, b: T) => number) => T[]' },
      { name: 'flat', kind: 'method', typeInfo: '(depth?: number) => T[]' },
      { name: 'flatMap', kind: 'method', typeInfo: '<U>(fn: (v: T) => U[]) => U[]' },
    ],
    'String.': [
      { name: 'length', kind: 'property', typeInfo: 'number' },
      { name: 'charAt', kind: 'method', typeInfo: '(pos: number) => string' },
      { name: 'charCodeAt', kind: 'method', typeInfo: '(pos: number) => number' },
      { name: 'concat', kind: 'method', typeInfo: '(...strings: string[]) => string' },
      { name: 'includes', kind: 'method', typeInfo: '(search: string) => boolean' },
      { name: 'endsWith', kind: 'method', typeInfo: '(search: string) => boolean' },
      { name: 'startsWith', kind: 'method', typeInfo: '(search: string) => boolean' },
      { name: 'indexOf', kind: 'method', typeInfo: '(search: string) => number' },
      { name: 'lastIndexOf', kind: 'method', typeInfo: '(search: string) => number' },
      { name: 'match', kind: 'method', typeInfo: '(regexp: RegExp) => RegExpMatchArray | null' },
      { name: 'matchAll', kind: 'method', typeInfo: '(regexp: RegExp) => IterableIterator<RegExpMatchArray>' },
      { name: 'replace', kind: 'method', typeInfo: '(search: string | RegExp, replacement: string) => string' },
      { name: 'replaceAll', kind: 'method', typeInfo: '(search: string | RegExp, replacement: string) => string' },
      { name: 'search', kind: 'method', typeInfo: '(regexp: RegExp) => number' },
      { name: 'slice', kind: 'method', typeInfo: '(start?: number, end?: number) => string' },
      { name: 'split', kind: 'method', typeInfo: '(separator: string | RegExp) => string[]' },
      { name: 'substring', kind: 'method', typeInfo: '(start: number, end?: number) => string' },
      { name: 'toLowerCase', kind: 'method', typeInfo: '() => string' },
      { name: 'toUpperCase', kind: 'method', typeInfo: '() => string' },
      { name: 'trim', kind: 'method', typeInfo: '() => string' },
      { name: 'trimStart', kind: 'method', typeInfo: '() => string' },
      { name: 'trimEnd', kind: 'method', typeInfo: '() => string' },
      { name: 'padStart', kind: 'method', typeInfo: '(length: number, fill?: string) => string' },
      { name: 'padEnd', kind: 'method', typeInfo: '(length: number, fill?: string) => string' },
      { name: 'repeat', kind: 'method', typeInfo: '(count: number) => string' },
    ],
  };

  // TODO: Implement fuzzy matching
  // Should match "mp" to "map", "fltr" to "filter", etc.
  fuzzyMatch(query: string, target: string): { matches: boolean; score: number } {
    // Simple implementation - you can improve this!
    const queryLower = query.toLowerCase();
    const targetLower = target.toLowerCase();

    // Prefix match (highest score)
    if (targetLower.startsWith(queryLower)) {
      return { matches: true, score: 100 - queryLower.length };
    }

    // Contains match (medium score)
    if (targetLower.includes(queryLower)) {
      return { matches: true, score: 50 - queryLower.length };
    }

    // Subsequence match (lower score)
    // e.g., "mp" matches "map" because m...a...p contains m...p
    let queryIdx = 0;
    for (let i = 0; i < targetLower.length && queryIdx < queryLower.length; i++) {
      if (targetLower[i] === queryLower[queryIdx]) {
        queryIdx++;
      }
    }

    if (queryIdx === queryLower.length) {
      return { matches: true, score: 25 - queryLower.length };
    }

    return { matches: false, score: 0 };
  }

  // TODO: Implement usage-boosted completion
  // Recently used completions should appear higher
  getCompletions(objectType: string, query: string): CompletionEntry[] {
    const key = `${objectType}.`;
    const baseCompletions = this.completions[key] || [];

    // Step 1: Filter by fuzzy match
    const matched = baseCompletions
      .map(entry => ({
        entry,
        ...this.fuzzyMatch(query, entry.name),
      }))
      .filter(item => item.matches || query === '');

    // Step 2: Score by recency
    const withRecencyScore = matched.map(item => {
      const recencyIndex = this.recentlyUsed.indexOf(item.entry.name);
      const recencyBoost = recencyIndex >= 0 ? (this.maxRecent - recencyIndex) * 5 : 0;

      const stats = this.usageStats.get(item.entry.name);
      const usageBoost = stats ? Math.min(stats.count * 2, 20) : 0;

      return {
        ...item,
        totalScore: item.score + recencyBoost + usageBoost,
      };
    });

    // Step 3: Sort by total score
    withRecencyScore.sort((a, b) => b.totalScore - a.totalScore);

    return withRecencyScore.map(item => item.entry);
  }

  // TODO: Implement type-aware filtering
  // Only show completions that return the expected type
  getTypeFilteredCompletions(
    objectType: string,
    query: string,
    expectedReturnType?: string
  ): CompletionEntry[] {
    let completions = this.getCompletions(objectType, query);

    if (expectedReturnType) {
      completions = completions.filter(entry => {
        if (!entry.typeInfo) return true;

        // Extract return type from typeInfo
        // e.g., "(fn: (v: T) => boolean) => T[]" -> "T[]"
        const returnMatch = entry.typeInfo.match(/=>\s*([^)]+)$/);
        if (!returnMatch) return true;

        const returnType = returnMatch[1].trim();

        // Simple type matching
        if (expectedReturnType === 'boolean' && returnType === 'boolean') return true;
        if (expectedReturnType === 'number' && returnType === 'number') return true;
        if (expectedReturnType === 'string' && returnType === 'string') return true;
        if (expectedReturnType === 'array' && returnType.includes('[]')) return true;
        if (expectedReturnType === 'void' && returnType === 'void') return true;

        return false;
      });
    }

    return completions;
  }

  // Record that a completion was used
  recordUsage(name: string): void {
    // Update usage stats
    const existing = this.usageStats.get(name);
    if (existing) {
      existing.count++;
      existing.lastUsed = new Date();
    } else {
      this.usageStats.set(name, { count: 1, lastUsed: new Date() });
    }

    // Update recency list
    const idx = this.recentlyUsed.indexOf(name);
    if (idx >= 0) {
      this.recentlyUsed.splice(idx, 1);
    }
    this.recentlyUsed.unshift(name);
    if (this.recentlyUsed.length > this.maxRecent) {
      this.recentlyUsed.pop();
    }
  }

  // Get usage statistics
  getStats(): { name: string; count: number; lastUsed: Date }[] {
    return Array.from(this.usageStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.count - a.count);
  }

  // Format completions for display
  formatCompletions(entries: CompletionEntry[]): void {
    console.log(`Found ${entries.length} completions:`);
    entries.forEach((entry, i) => {
      const icon = entry.kind === 'method' ? '()' : '{}';
      const type = entry.typeInfo ? ` :: ${entry.typeInfo}` : '';
      console.log(`  ${i + 1}. [${icon}] ${entry.name}${type}`);
    });
  }
}

// ============================================
// Test the Smart Completion Provider
// ============================================

console.log('='.repeat(60));
console.log('Smart Completion Provider Demo');
console.log('='.repeat(60));

const provider = new SmartCompletionProvider();

// Test 1: Basic fuzzy matching
console.log('\n--- Test 1: Fuzzy Matching ---');
console.log('Query: "mp" on Array');
const results1 = provider.getCompletions('Array', 'mp');
provider.formatCompletions(results1.slice(0, 5));

// Test 2: Record some usage
console.log('\n--- Test 2: Recording Usage ---');
provider.recordUsage('map');
provider.recordUsage('filter');
provider.recordUsage('map');
provider.recordUsage('reduce');
provider.recordUsage('map');
console.log('Recorded usage: map (3x), filter (1x), reduce (1x)');

// Test 3: Usage-boosted completions
console.log('\n--- Test 3: Usage-Boosted Completions ---');
console.log('Query: "" (empty) on Array - should boost recently used');
const results3 = provider.getCompletions('Array', '');
provider.formatCompletions(results3.slice(0, 5));

// Test 4: Type-filtered completions
console.log('\n--- Test 4: Type-Filtered Completions ---');
console.log('Query: "" on Array, expected return type: "boolean"');
const results4 = provider.getTypeFilteredCompletions('Array', '', 'boolean');
provider.formatCompletions(results4);

// Test 5: Type-filtered completions for arrays
console.log('\n--- Test 5: Type-Filtered for Array Return ---');
console.log('Query: "" on Array, expected return type: "array"');
const results5 = provider.getTypeFilteredCompletions('Array', '', 'array');
provider.formatCompletions(results5);

// Test 6: Usage statistics
console.log('\n--- Test 6: Usage Statistics ---');
const stats = provider.getStats();
console.log('Top used completions:');
stats.slice(0, 5).forEach((stat, i) => {
  console.log(`  ${i + 1}. ${stat.name}: ${stat.count} uses`);
});

// Test 7: String completions with fuzzy
console.log('\n--- Test 7: String Fuzzy Match ---');
console.log('Query: "lc" on String (should match toLowerCase)');
const results7 = provider.getCompletions('String', 'lc');
provider.formatCompletions(results7.slice(0, 5));

console.log('\n' + '='.repeat(60));
console.log('Demo Complete');
console.log('='.repeat(60));
```

## Source Code References

Want to explore the actual implementation? Here are the key source files:

### Primary Files

| File | Purpose |
|------|---------|
| [`packages/api/server/ws.mts`](../../../server/ws.mts) | WebSocket handlers for completion and quickinfo requests |
| [`packages/web/src/components/cells/get-completions.ts`](../../../../web/src/components/cells/get-completions.ts) | Client-side completion source for CodeMirror |
| [`packages/web/src/components/cells/hover.ts`](../../../../web/src/components/cells/hover.ts) | Hover tooltip provider with quickinfo |
| [`packages/web/src/components/cells/util.ts`](../../../../web/src/components/cells/util.ts) | Position mapping between CodeMirror and tsserver |

### Key Functions to Study

**In `get-completions.ts`:**
- `getCompletions()` - Main completion function for CodeMirror
- Response callback - Maps tsserver entries to CodeMirror format

**In `hover.ts`:**
- `tsHover()` - Creates the hover tooltip extension
- `formatDocumentation()` - Formats JSDoc documentation
- `formatTags()` - Renders JSDoc tags (@param, @returns, etc.)

**In `util.ts`:**
- `mapCMLocationToTsServer()` - Converts CodeMirror position to tsserver
- `mapTsServerLocationToCM()` - Converts tsserver position to CodeMirror

**In `ws.mts`:**
- `getCompletions()` - Server-side handler for completion requests
- Completion response broadcasting via WebSocket

## Next Steps

### Related Topics

Now that you understand autocomplete, explore:

- **TypeScript Diagnostics Srcbook**: Error/warning flow (closely related)
- **TypeScript Server Srcbook**: The underlying tsserver communication
- **WebSocket Protocol Srcbook**: How messages flow between client/server
- **Cell Execution Srcbook**: What happens when you run code

### Further Reading

- [TypeScript Language Service API](https://github.com/microsoft/TypeScript/wiki/Using-the-Language-Service-API) - Official documentation
- [CodeMirror Autocomplete](https://codemirror.net/docs/ref/#autocomplete) - CodeMirror completion system
- [Language Server Protocol - Completion](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_completion) - Standard completion protocol

### Contributing Ideas

Consider improvements like:
- Snippet support with placeholders
- Auto-import suggestions
- AI-powered completion ranking
- Signature help (function parameter hints)
- Go-to-definition support

## Summary

In this Srcbook, we covered:

- **What is autocomplete**: Intelligent code suggestions based on type analysis
- **Request/Response flow**: User types -> position mapping -> WebSocket -> tsserver -> display
- **Completion entries**: Structure with name, kind, sortText, insertText
- **QuickInfo/Hover**: Type information and documentation on hover
- **Position mapping**: Converting between CodeMirror (0-based) and tsserver (1-based)

Key takeaways:

1. **Completions are context-aware** - tsserver analyzes types to suggest relevant items
2. **Position mapping is critical** - Wrong positions mean wrong or missing completions
3. **WebSocket enables real-time** - Async request/response for non-blocking UI
4. **Kind determines display** - Different icons and styling per completion type
5. **QuickInfo complements completions** - Hover shows details without inserting

You now understand how Srcbook provides intelligent TypeScript autocomplete. This knowledge is essential for debugging completion issues, building custom providers, or contributing to the TypeScript integration layer.
