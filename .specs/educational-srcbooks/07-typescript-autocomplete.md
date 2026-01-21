# TypeScript Autocomplete - Implementation Specification

**Version:** 1.0
**Date:** 2026-01-14
**Status:** Implementation-Ready
**Output:** `packages/api/srcbook/examples/internals/typescript-autocomplete.src.md`
**Dependencies:** TypeScript Diagnostics Srcbook

---

## 1. Overview

This specification defines the implementation of an educational Srcbook that explains how Srcbook provides intelligent code completions and hover information using tsserver.

### Learning Objectives

1. Understand how completions are requested and received
2. Learn the completion entry structure (name, kind, details)
3. Comprehend hover/quickinfo functionality
4. Know how to build custom completion providers

---

## 2. File Structure

### 2.1 Srcbook Metadata

```markdown
<!-- srcbook:{"language":"typescript"} -->
```

### 2.2 Required Sections

| Section | Type | Purpose |
|---------|------|---------|
| Title | Title Cell | "TypeScript Autocomplete - Intelligent Code Completion" |
| package.json | Package Cell | TypeScript dependencies |
| Introduction | Markdown | Context and objectives |
| Key Concepts | Markdown | Request/response flow diagram |
| Simple Demo | Code | Basic completions request |
| Explanation | Markdown | Completion entry details |
| Advanced Demo | Code | Full completion provider |
| Deep Dive | Markdown | Srcbook's implementation |
| Interactive Exercise | Code | Build completion filter |
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

**What is TypeScript Autocomplete?**
- Intelligent code completion suggestions based on type information
- Shows available properties, methods, variables at cursor position
- Includes detailed type signatures and documentation
- Powered by tsserver's `completions` and `quickinfo` commands

**Why does it matter?**
- Understanding enables customizing completion behavior
- Necessary for building IDE-like features
- Foundation for code assistance tools

### 3.3 Key Concepts - Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  Completions Flow                            │
│                                                              │
│  1. User Types                                               │
│     ┌─────────────────┐                                     │
│     │ user.           │  (triggers completion)              │
│     └────────┬────────┘                                     │
│              ▼                                               │
│  2. Position Mapping                                         │
│     ┌─────────────────────────────────────────────┐        │
│     │ CodeMirror position → tsserver line:offset  │        │
│     │ (0-based absolute → 1-based line/column)    │        │
│     └────────┬────────────────────────────────────┘        │
│              ▼                                               │
│  3. WebSocket Request                                        │
│     ┌─────────────────────────────────────────────┐        │
│     │ tsserver:cell:completions:request           │        │
│     │ { cellId, location: { line, offset } }      │        │
│     └────────┬────────────────────────────────────┘        │
│              ▼                                               │
│  4. tsserver Command                                         │
│     ┌─────────────────────────────────────────────┐        │
│     │ tsserver.completions(file, line, offset)    │        │
│     └────────┬────────────────────────────────────┘        │
│              ▼                                               │
│  5. Response Processing                                      │
│     ┌─────────────────────────────────────────────┐        │
│     │ Filter by prefix, sort by relevance         │        │
│     └────────┬────────────────────────────────────┘        │
│              ▼                                               │
│  6. WebSocket Response                                       │
│     ┌─────────────────────────────────────────────┐        │
│     │ tsserver:cell:completions:response          │        │
│     │ { cellId, entries: CompletionEntry[] }      │        │
│     └────────┬────────────────────────────────────┘        │
│              ▼                                               │
│  7. Display in Editor                                        │
│     ┌─────────────────────────────────────────────┐        │
│     │ CodeMirror autocomplete widget shows list   │        │
│     └─────────────────────────────────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Simple Demo

**Filename:** `simple-completions.ts`

```typescript
// Demonstrate completion entry structure

import { z } from 'zod';

// Completion entry schema (from packages/shared/src/schemas/tsserver.mts)
const CompletionEntrySchema = z.object({
  name: z.string(),           // The completion text
  kind: z.string(),           // "function", "property", "class", etc.
  kindModifiers: z.string().optional(), // "export", "declare", etc.
  sortText: z.string().optional(),      // Sorting priority
  insertText: z.string().optional(),    // Text to insert (may differ from name)
  replacementSpan: z.object({
    start: z.object({ line: z.number(), offset: z.number() }),
    end: z.object({ line: z.number(), offset: z.number() }),
  }).optional(),
  hasAction: z.boolean().optional(),    // Has additional action (import)
  source: z.string().optional(),        // Module source for auto-import
  isRecommended: z.boolean().optional(), // Is this a recommended completion
});

type CompletionEntry = z.infer<typeof CompletionEntrySchema>;

// Example completions for "user." where user is { name: string, age: number }
const completionEntries: CompletionEntry[] = [
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
  // Inherited from Object
  {
    name: 'toString',
    kind: 'method',
    kindModifiers: '',
    sortText: '11',
  },
  {
    name: 'hasOwnProperty',
    kind: 'method',
    kindModifiers: '',
    sortText: '11',
  },
];

// Format completion for display
function formatCompletion(entry: CompletionEntry): string {
  const icon = getIcon(entry.kind);
  const modifiers = entry.kindModifiers ? ` (${entry.kindModifiers})` : '';
  return `${icon} ${entry.name} : ${entry.kind}${modifiers}`;
}

function getIcon(kind: string): string {
  const icons: Record<string, string> = {
    property: '🔹',
    method: '🔸',
    function: '⚡',
    class: '📦',
    interface: '📋',
    type: '🏷️',
    variable: '📌',
    const: '🔒',
    keyword: '🔑',
    module: '📁',
  };
  return icons[kind] || '•';
}

// Display completions
console.log('=== Completion Entries for "user." ===\n');
completionEntries
  .sort((a, b) => (a.sortText || '').localeCompare(b.sortText || ''))
  .forEach(entry => {
    console.log(formatCompletion(entry));
  });

// Validate schema
console.log('\n=== Schema Validation ===');
completionEntries.forEach((entry, i) => {
  const result = CompletionEntrySchema.safeParse(entry);
  console.log(`Entry ${i + 1} (${entry.name}): ${result.success ? '✅' : '❌'}`);
});

// Completion kinds in TypeScript
console.log('\n=== All Completion Kinds ===');
const kinds = [
  'warning', 'keyword', 'script', 'module', 'class', 'interface',
  'type', 'enum', 'enumMember', 'variable', 'localVariable', 'function',
  'localFunction', 'memberFunction', 'memberGetAccessor', 'memberSetAccessor',
  'memberVariable', 'constructorImplementation', 'callSignature', 'indexSignature',
  'constructSignature', 'parameter', 'typeParameter', 'primitiveType',
  'property', 'method', 'const', 'let', 'alias', 'directory', 'externalModuleName',
];

kinds.forEach(kind => {
  console.log(`  ${getIcon(kind)} ${kind}`);
});
```

### 3.5 QuickInfo/Hover Section

```markdown
## QuickInfo (Hover Information)

When hovering over an identifier, tsserver provides detailed type information:

```typescript
interface QuickInfoResponse {
  kind: string;              // "function", "const", "class", etc.
  kindModifiers: string;     // "export", "declare", etc.
  start: Position;           // Start of identifier
  end: Position;             // End of identifier
  displayString: string;     // Full type signature
  documentation: string | DocPart[];  // JSDoc description
  tags: JSDocTag[];          // @param, @returns, @example, etc.
}

interface DocPart {
  text: string;
  kind: string;  // "text", "parameterName", "lineBreak", etc.
}

interface JSDocTag {
  name: string;  // "param", "returns", "example"
  text?: DocPart[];
}
```
```

### 3.6 Advanced Demo

**Filename:** `completion-provider.ts`

```typescript
// Full completion provider with filtering and formatting

interface Position {
  line: number;
  offset: number;
}

interface CompletionEntry {
  name: string;
  kind: string;
  kindModifiers?: string;
  sortText?: string;
  insertText?: string;
  source?: string;
  hasAction?: boolean;
  isRecommended?: boolean;
}

interface QuickInfo {
  kind: string;
  kindModifiers: string;
  displayString: string;
  documentation?: string | { text: string; kind: string }[];
  tags?: { name: string; text?: { text: string }[] }[];
}

// Simulated tsserver responses
const mockCompletions: Record<string, CompletionEntry[]> = {
  'Array.': [
    { name: 'length', kind: 'property', sortText: '0' },
    { name: 'push', kind: 'method', sortText: '0' },
    { name: 'pop', kind: 'method', sortText: '0' },
    { name: 'map', kind: 'method', sortText: '0' },
    { name: 'filter', kind: 'method', sortText: '0' },
    { name: 'reduce', kind: 'method', sortText: '0' },
    { name: 'forEach', kind: 'method', sortText: '0' },
    { name: 'find', kind: 'method', sortText: '0' },
    { name: 'findIndex', kind: 'method', sortText: '0' },
    { name: 'slice', kind: 'method', sortText: '0' },
    { name: 'splice', kind: 'method', sortText: '0' },
    { name: 'concat', kind: 'method', sortText: '0' },
    { name: 'join', kind: 'method', sortText: '0' },
  ],
  'console.': [
    { name: 'log', kind: 'method', sortText: '0' },
    { name: 'error', kind: 'method', sortText: '0' },
    { name: 'warn', kind: 'method', sortText: '0' },
    { name: 'info', kind: 'method', sortText: '0' },
    { name: 'debug', kind: 'method', sortText: '0' },
    { name: 'table', kind: 'method', sortText: '0' },
    { name: 'time', kind: 'method', sortText: '0' },
    { name: 'timeEnd', kind: 'method', sortText: '0' },
  ],
};

const mockQuickInfo: Record<string, QuickInfo> = {
  'map': {
    kind: 'method',
    kindModifiers: '',
    displayString: '(method) Array<T>.map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[]',
    documentation: [
      { text: 'Calls a defined callback function on each element of an array, and returns an array that contains the results.', kind: 'text' },
    ],
    tags: [
      { name: 'param', text: [{ text: 'callbackfn — A function that accepts up to three arguments.' }] },
      { name: 'param', text: [{ text: 'thisArg — An object to which the this keyword can refer in the callback function.' }] },
    ],
  },
};

class CompletionProvider {
  private completionCache: Map<string, CompletionEntry[]> = new Map();

  async getCompletions(
    code: string,
    position: number,
    prefix: string
  ): Promise<CompletionEntry[]> {
    // Find what we're completing
    const context = this.getCompletionContext(code, position);
    console.log(`📝 Completion context: "${context}"`);

    // Get raw completions (would be from tsserver)
    let entries = mockCompletions[context] || [];

    // Filter by prefix
    if (prefix) {
      entries = entries.filter(e =>
        e.name.toLowerCase().startsWith(prefix.toLowerCase())
      );
    }

    // Sort by relevance
    entries.sort((a, b) => {
      // Exact match first
      if (a.name === prefix) return -1;
      if (b.name === prefix) return 1;
      // Then by sortText
      return (a.sortText || '').localeCompare(b.sortText || '');
    });

    return entries;
  }

  async getQuickInfo(
    identifier: string
  ): Promise<QuickInfo | null> {
    return mockQuickInfo[identifier] || null;
  }

  private getCompletionContext(code: string, position: number): string {
    // Walk backwards to find the trigger
    let start = position - 1;
    while (start >= 0 && /[a-zA-Z0-9_.]/.test(code[start])) {
      start--;
    }
    return code.slice(start + 1, position);
  }

  formatCompletions(entries: CompletionEntry[]): string[] {
    return entries.map(e => {
      const icon = this.getKindIcon(e.kind);
      const modifiers = e.kindModifiers ? ` [${e.kindModifiers}]` : '';
      return `${icon} ${e.name}${modifiers}`;
    });
  }

  formatQuickInfo(info: QuickInfo): string {
    const lines: string[] = [];

    // Type signature
    lines.push(`📋 ${info.displayString}`);
    lines.push('');

    // Documentation
    if (info.documentation) {
      const doc = typeof info.documentation === 'string'
        ? info.documentation
        : info.documentation.map(d => d.text).join('');
      lines.push(`📖 ${doc}`);
      lines.push('');
    }

    // Tags
    if (info.tags?.length) {
      lines.push('🏷️ Tags:');
      info.tags.forEach(tag => {
        const text = tag.text?.map(t => t.text).join('') || '';
        lines.push(`   @${tag.name} ${text}`);
      });
    }

    return lines.join('\n');
  }

  private getKindIcon(kind: string): string {
    const icons: Record<string, string> = {
      property: '🔹',
      method: '🔸',
      function: '⚡',
      class: '📦',
      interface: '📋',
      variable: '📌',
    };
    return icons[kind] || '•';
  }
}

// Demo
async function demo() {
  const provider = new CompletionProvider();

  console.log('=== Completion Provider Demo ===\n');

  // Test Array completions
  console.log('🔍 Completions for "Array.f":');
  const arrayCompletions = await provider.getCompletions('arr.f', 5, 'f');
  provider.formatCompletions(arrayCompletions).forEach(c => console.log(`  ${c}`));

  console.log('\n🔍 Completions for "console.":');
  const consoleCompletions = await provider.getCompletions('console.', 8, '');
  provider.formatCompletions(consoleCompletions).forEach(c => console.log(`  ${c}`));

  console.log('\n🔍 QuickInfo for "map":');
  const quickInfo = await provider.getQuickInfo('map');
  if (quickInfo) {
    console.log(provider.formatQuickInfo(quickInfo));
  }
}

demo();
```

### 3.7 Deep Dive Content

**Source File References:**

1. **`packages/api/server/ws.mts`** - Completion handlers
   - `getCompletions()` handler (line 760-800)
   - `tsserverQuickInfo()` handler
   - WebSocket event routing

2. **`packages/web/src/components/cells/get-completions.ts`** - Client-side
   - CodeMirror completion source
   - Position mapping to tsserver format
   - Response formatting

3. **`packages/web/src/components/cells/hover.ts`** - Hover provider
   - `tsHover()` CodeMirror extension
   - QuickInfo request/response handling
   - Tooltip formatting

4. **`packages/web/src/components/cells/util.ts`** - Position utilities
   - `mapCMLocationToTsServer()` - Convert positions
   - `mapTsServerLocationToCM()` - Reverse conversion

**Implementation Details:**

```typescript
// Simplified from get-completions.ts
async function getCompletions(
  context: CompletionContext
): Promise<CompletionResult | null> {
  const { state, pos } = context;
  const code = state.doc.toString();

  // Convert position
  const tsPos = mapCMLocationToTsServer(code, pos);

  // Request from server via WebSocket
  const response = await requestCompletions(cellId, tsPos);

  // Format for CodeMirror
  return {
    from: pos,
    options: response.entries.map(entry => ({
      label: entry.name,
      type: entry.kind,
      detail: entry.kindModifiers,
    })),
  };
}
```

### 3.8 Interactive Exercise

```typescript
// Exercise: Build a Smart Completion Filter
//
// Challenge:
// 1. Implement fuzzy matching (not just prefix)
// 2. Prioritize recently used completions
// 3. Boost completions that match the expected type
// 4. Add keyboard navigation simulation

interface SmartCompletionOptions {
  fuzzyMatch: boolean;
  boostRecent: boolean;
  typeAware: boolean;
}

class SmartCompletionProvider {
  private recentlyUsed: string[] = [];
  private expectedType: string | null = null;

  async getCompletions(
    entries: CompletionEntry[],
    input: string,
    options: SmartCompletionOptions
  ): Promise<CompletionEntry[]> {
    // TODO: Implement fuzzy matching
    // TODO: Boost recently used
    // TODO: Consider expected type
    throw new Error('Not implemented');
  }

  recordUsage(name: string): void {
    // TODO: Track usage for boosting
  }

  setExpectedType(type: string): void {
    // TODO: Set expected type for context-aware filtering
  }
}

// Test your implementation:
// const provider = new SmartCompletionProvider();
// provider.recordUsage('map');
// provider.setExpectedType('string[]');
// const results = await provider.getCompletions(entries, 'mp', {
//   fuzzyMatch: true,
//   boostRecent: true,
//   typeAware: true,
// });
```

### 3.9 Source References

| File | Purpose |
|------|---------|
| `packages/api/server/ws.mts` | Completion/quickinfo handlers |
| `packages/web/src/components/cells/get-completions.ts` | Client completion source |
| `packages/web/src/components/cells/hover.ts` | Hover information provider |
| `packages/web/src/components/cells/util.ts` | Position mapping utilities |

---

## 4. Acceptance Criteria

- [ ] Completion entry structure explained
- [ ] QuickInfo/hover documented
- [ ] Position mapping demonstrated
- [ ] Code examples execute correctly
- [ ] Exercise is achievable

---

## 5. Implementation Notes

### File Location
```
packages/api/srcbook/examples/internals/typescript-autocomplete.src.md
```

### Validation
- Test completions in various contexts
- Verify hover info displays correctly
