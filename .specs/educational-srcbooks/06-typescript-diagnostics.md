# TypeScript Diagnostics - Implementation Specification

**Version:** 1.0
**Date:** 2026-01-14
**Status:** Implementation-Ready
**Output:** `packages/api/srcbook/examples/internals/typescript-diagnostics.src.md`
**Dependencies:** TypeScript Server Srcbook

---

## 1. Overview

This specification defines the implementation of an educational Srcbook that explains how Srcbook collects and displays TypeScript diagnostics (errors, warnings, suggestions) from tsserver.

### Learning Objectives

1. Understand the different diagnostic types (semantic, syntax, suggestion)
2. Learn how diagnostics flow from tsserver to the UI
3. Comprehend position mapping between tsserver and editor
4. Know how to interpret and format diagnostic messages

---

## 2. File Structure

### 2.1 Srcbook Metadata

```markdown
<!-- srcbook:{"language":"typescript"} -->
```

### 2.2 Required Sections

| Section | Type | Purpose |
|---------|------|---------|
| Title | Title Cell | "TypeScript Diagnostics - Real-Time Error Checking" |
| package.json | Package Cell | TypeScript dependencies |
| Introduction | Markdown | Context and objectives |
| Key Concepts | Markdown | Diagnostic types and flow diagram |
| Simple Demo | Code | Parse diagnostic events |
| Explanation | Markdown | Position mapping |
| Advanced Demo | Code | Full diagnostics system |
| Deep Dive | Markdown | Srcbook's implementation |
| Interactive Exercise | Code | Build error reporter |
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

**What are TypeScript Diagnostics?**
- Real-time error and warning messages from the TypeScript compiler
- Three categories: semantic (type errors), syntax (parse errors), suggestions (improvements)
- Delivered asynchronously via tsserver events
- Displayed inline in the code editor

**Why does it matter?**
- Understanding enables better error handling
- Necessary for building diagnostic-aware features
- Foundation for AI-assisted error fixing

### 3.3 Key Concepts - Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Diagnostics Flow                          │
│                                                              │
│  1. Code Change                                              │
│     ┌─────────────────┐                                     │
│     │ User edits cell │                                     │
│     └────────┬────────┘                                     │
│              ▼                                               │
│  2. File Update                                              │
│     ┌─────────────────────────────────────────────┐        │
│     │ tsserver.updateContent(file, newContent)    │        │
│     └────────┬────────────────────────────────────┘        │
│              ▼                                               │
│  3. Request Diagnostics                                      │
│     ┌─────────────────────────────────────────────┐        │
│     │ tsserver.geterr({ files: [file], delay: 0 }) │        │
│     └────────┬────────────────────────────────────┘        │
│              ▼                                               │
│  4. Async Events (3 types)                                   │
│     ┌─────────────────────────────────────────────┐        │
│     │ syntaxDiag  → Parse errors (missing ;, etc) │        │
│     │ semanticDiag → Type errors (type mismatch)  │        │
│     │ suggestionDiag → Improvements (unused vars) │        │
│     └────────┬────────────────────────────────────┘        │
│              ▼                                               │
│  5. Broadcast to Client                                      │
│     ┌─────────────────────────────────────────────┐        │
│     │ wss.broadcast("session:id",                 │        │
│     │   "tsserver:cell:diagnostics", { cellId, diagnostics })│
│     └────────┬────────────────────────────────────┘        │
│              ▼                                               │
│  6. Display in Editor                                        │
│     ┌─────────────────────────────────────────────┐        │
│     │ CodeMirror decorations show squiggly lines  │        │
│     └─────────────────────────────────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Simple Demo

**Filename:** `simple-diagnostics.ts`

```typescript
// Demonstrate diagnostic event structure and parsing

import { z } from 'zod';

// Diagnostic schema (from packages/shared/src/schemas/tsserver.mts)
const DiagnosticSchema = z.object({
  start: z.object({
    line: z.number(),    // 1-based line
    offset: z.number(),  // 1-based column
  }),
  end: z.object({
    line: z.number(),
    offset: z.number(),
  }),
  text: z.string(),           // Error message
  code: z.number(),           // TypeScript error code
  category: z.string(),       // "error" | "warning" | "suggestion"
  relatedInformation: z.array(z.object({
    span: z.object({
      start: z.object({ line: z.number(), offset: z.number() }),
      end: z.object({ line: z.number(), offset: z.number() }),
      file: z.string(),
    }),
    message: z.string(),
  })).optional(),
});

type Diagnostic = z.infer<typeof DiagnosticSchema>;

// Example diagnostic events from tsserver
const semanticDiagnostics: Diagnostic[] = [
  {
    start: { line: 3, offset: 14 },
    end: { line: 3, offset: 22 },
    text: "Type 'string' is not assignable to type 'number'.",
    code: 2322,
    category: "error",
  },
  {
    start: { line: 7, offset: 13 },
    end: { line: 7, offset: 16 },
    text: "Property 'nam' does not exist on type 'User'. Did you mean 'name'?",
    code: 2551,
    category: "error",
    relatedInformation: [
      {
        span: {
          start: { line: 2, offset: 3 },
          end: { line: 2, offset: 7 },
          file: '/tmp/test.ts',
        },
        message: "'name' is declared here.",
      },
    ],
  },
];

const syntaxDiagnostics: Diagnostic[] = [
  {
    start: { line: 5, offset: 1 },
    end: { line: 5, offset: 2 },
    text: "';' expected.",
    code: 1005,
    category: "error",
  },
];

const suggestionDiagnostics: Diagnostic[] = [
  {
    start: { line: 4, offset: 7 },
    end: { line: 4, offset: 12 },
    text: "'value' is declared but its value is never read.",
    code: 6133,
    category: "suggestion",
  },
];

// Format diagnostic for display
function formatDiagnostic(d: Diagnostic): string {
  const icon = d.category === 'error' ? '❌' :
               d.category === 'warning' ? '⚠️' : '💡';
  const location = `${d.start.line}:${d.start.offset}`;
  return `${icon} [${location}] TS${d.code}: ${d.text}`;
}

// Format related information
function formatRelated(d: Diagnostic): string[] {
  if (!d.relatedInformation?.length) return [];
  return d.relatedInformation.map(info => {
    const loc = `${info.span.start.line}:${info.span.start.offset}`;
    return `    ↳ ${info.span.file}:${loc} - ${info.message}`;
  });
}

// Display all diagnostics
console.log('=== TypeScript Diagnostics Demo ===\n');

console.log('📋 Semantic Diagnostics (Type Errors):');
semanticDiagnostics.forEach(d => {
  console.log(formatDiagnostic(d));
  formatRelated(d).forEach(r => console.log(r));
});

console.log('\n📋 Syntax Diagnostics (Parse Errors):');
syntaxDiagnostics.forEach(d => {
  console.log(formatDiagnostic(d));
});

console.log('\n📋 Suggestion Diagnostics (Improvements):');
suggestionDiagnostics.forEach(d => {
  console.log(formatDiagnostic(d));
});

// Validate with Zod
console.log('\n\n=== Schema Validation ===');
const allDiagnostics = [...semanticDiagnostics, ...syntaxDiagnostics, ...suggestionDiagnostics];
allDiagnostics.forEach((d, i) => {
  const result = DiagnosticSchema.safeParse(d);
  console.log(`Diagnostic ${i + 1}: ${result.success ? '✅ Valid' : '❌ Invalid'}`);
});
```

### 3.5 Position Mapping Section

```markdown
## Position Mapping

TypeScript uses **1-based line and offset** (character position from start of line).
CodeMirror uses **0-based absolute position** (characters from start of document).

### Conversion Functions

```typescript
// Map tsserver position to CodeMirror position
function tsToCodeMirror(code: string, line: number, offset: number): number {
  const lines = code.split('\n');
  let position = 0;

  // Add length of all complete lines
  for (let i = 0; i < line - 1; i++) {
    position += lines[i].length + 1; // +1 for newline
  }

  // Add offset within the line (convert 1-based to 0-based)
  position += offset - 1;

  return position;
}

// Map CodeMirror position to tsserver position
function codeEditorToTs(code: string, position: number): { line: number; offset: number } {
  const lines = code.split('\n');
  let remaining = position;
  let lineNum = 1;

  for (const line of lines) {
    if (remaining <= line.length) {
      return { line: lineNum, offset: remaining + 1 };
    }
    remaining -= line.length + 1;
    lineNum++;
  }

  return { line: lineNum, offset: 1 };
}
```
```

### 3.6 Advanced Demo

**Filename:** `diagnostics-system.ts`

```typescript
// Full diagnostics system with position mapping and categorization

import { EventEmitter } from 'events';

interface Position {
  line: number;   // 1-based
  offset: number; // 1-based
}

interface Diagnostic {
  start: Position;
  end: Position;
  text: string;
  code: number;
  category: 'error' | 'warning' | 'suggestion';
  source?: string;
}

interface CellDiagnostics {
  cellId: string;
  semanticDiag: Diagnostic[];
  syntaxDiag: Diagnostic[];
  suggestionDiag: Diagnostic[];
}

// Position mapping utilities
class PositionMapper {
  constructor(private code: string) {}

  toAbsolute(pos: Position): number {
    const lines = this.code.split('\n');
    let absolute = 0;

    for (let i = 0; i < pos.line - 1; i++) {
      absolute += lines[i].length + 1;
    }

    return absolute + pos.offset - 1;
  }

  toLineOffset(absolute: number): Position {
    const lines = this.code.split('\n');
    let remaining = absolute;
    let lineNum = 1;

    for (const line of lines) {
      if (remaining <= line.length) {
        return { line: lineNum, offset: remaining + 1 };
      }
      remaining -= line.length + 1;
      lineNum++;
    }

    return { line: lineNum, offset: 1 };
  }

  getRange(start: Position, end: Position): string {
    const startAbs = this.toAbsolute(start);
    const endAbs = this.toAbsolute(end);
    return this.code.slice(startAbs, endAbs);
  }
}

// Diagnostics collector (like ws.mts handlers)
class DiagnosticsCollector extends EventEmitter {
  private cellDiagnostics: Map<string, CellDiagnostics> = new Map();
  private pendingCells: Set<string> = new Set();

  // Called when tsserver emits syntaxDiag event
  handleSyntaxDiag(cellId: string, diagnostics: Diagnostic[]): void {
    this.ensureCell(cellId);
    this.cellDiagnostics.get(cellId)!.syntaxDiag = diagnostics;
    console.log(`📝 Received ${diagnostics.length} syntax diagnostics for ${cellId}`);
  }

  // Called when tsserver emits semanticDiag event
  handleSemanticDiag(cellId: string, diagnostics: Diagnostic[]): void {
    this.ensureCell(cellId);
    this.cellDiagnostics.get(cellId)!.semanticDiag = diagnostics;
    console.log(`📝 Received ${diagnostics.length} semantic diagnostics for ${cellId}`);
    this.maybeEmit(cellId);
  }

  // Called when tsserver emits suggestionDiag event
  handleSuggestionDiag(cellId: string, diagnostics: Diagnostic[]): void {
    this.ensureCell(cellId);
    this.cellDiagnostics.get(cellId)!.suggestionDiag = diagnostics;
    console.log(`📝 Received ${diagnostics.length} suggestion diagnostics for ${cellId}`);
  }

  // Start collecting for a cell
  startCollection(cellId: string): void {
    this.pendingCells.add(cellId);
    this.cellDiagnostics.set(cellId, {
      cellId,
      semanticDiag: [],
      syntaxDiag: [],
      suggestionDiag: [],
    });
  }

  private ensureCell(cellId: string): void {
    if (!this.cellDiagnostics.has(cellId)) {
      this.cellDiagnostics.set(cellId, {
        cellId,
        semanticDiag: [],
        syntaxDiag: [],
        suggestionDiag: [],
      });
    }
  }

  // Emit when semantic diagnostics received (primary)
  private maybeEmit(cellId: string): void {
    if (this.pendingCells.has(cellId)) {
      const diags = this.cellDiagnostics.get(cellId)!;
      const all = [...diags.semanticDiag, ...diags.syntaxDiag];

      console.log(`\n📤 Emitting diagnostics for ${cellId}:`);
      this.emit('diagnostics', cellId, all);
      this.pendingCells.delete(cellId);
    }
  }

  // Get all diagnostics for a cell
  getDiagnostics(cellId: string): Diagnostic[] {
    const diags = this.cellDiagnostics.get(cellId);
    if (!diags) return [];
    return [...diags.semanticDiag, ...diags.syntaxDiag, ...diags.suggestionDiag];
  }

  // Get error count
  getErrorCount(cellId: string): number {
    return this.getDiagnostics(cellId).filter(d => d.category === 'error').length;
  }
}

// Demo
const collector = new DiagnosticsCollector();

// Listen for diagnostic events
collector.on('diagnostics', (cellId, diagnostics) => {
  console.log(`\n🔔 Cell ${cellId} has ${diagnostics.length} diagnostic(s):`);
  diagnostics.forEach(d => {
    const icon = d.category === 'error' ? '❌' : '⚠️';
    console.log(`  ${icon} Line ${d.start.line}: ${d.text}`);
  });
});

// Simulate receiving diagnostics from tsserver
console.log('=== Simulating tsserver Diagnostic Events ===\n');

const cellId = 'cell-001';
collector.startCollection(cellId);

// Syntax diagnostics come first
collector.handleSyntaxDiag(cellId, [
  {
    start: { line: 3, offset: 1 },
    end: { line: 3, offset: 2 },
    text: "';' expected.",
    code: 1005,
    category: 'error',
  },
]);

// Then semantic diagnostics
collector.handleSemanticDiag(cellId, [
  {
    start: { line: 5, offset: 7 },
    end: { line: 5, offset: 11 },
    text: "Type 'string' is not assignable to type 'number'.",
    code: 2322,
    category: 'error',
  },
  {
    start: { line: 8, offset: 1 },
    end: { line: 8, offset: 5 },
    text: "Cannot find name 'test'.",
    code: 2304,
    category: 'error',
  },
]);

// Then suggestions
collector.handleSuggestionDiag(cellId, [
  {
    start: { line: 2, offset: 7 },
    end: { line: 2, offset: 12 },
    text: "'value' is declared but its value is never read.",
    code: 6133,
    category: 'suggestion',
  },
]);

// Check final state
console.log('\n=== Final Diagnostics State ===');
console.log(`Total diagnostics: ${collector.getDiagnostics(cellId).length}`);
console.log(`Error count: ${collector.getErrorCount(cellId)}`);

// Position mapping demo
console.log('\n=== Position Mapping Demo ===');
const code = `interface User {
  name: string;
  age: number;
}

const user = { name: "test" };
`;

const mapper = new PositionMapper(code);

// Convert line 3, offset 3 ("age") to absolute position
const absolute = mapper.toAbsolute({ line: 3, offset: 3 });
console.log(`Line 3, offset 3 → absolute position ${absolute}`);
console.log(`Text at position: "${code.slice(absolute, absolute + 3)}"`);

// Convert back
const pos = mapper.toLineOffset(absolute);
console.log(`Absolute ${absolute} → line ${pos.line}, offset ${pos.offset}`);
```

### 3.7 Deep Dive Content

**Source File References:**

1. **`packages/api/server/ws.mts`** - Diagnostic handlers (lines 607-680)
   - `createTsServer()` - Sets up diagnostic event listeners
   - Maps file paths back to cell IDs
   - Broadcasts `tsserver:cell:diagnostics` events

2. **`packages/api/tsserver/utils.mts`** - Diagnostic normalization
   - `normalizeDiagnostics()` - Standardizes diagnostic format
   - Handles different diagnostic sources

3. **`packages/shared/src/schemas/tsserver.mts`** - Type definitions
   - `TsServerDiagnosticSchema` - Zod schema for validation
   - `DiagnosticType` - TypeScript type

4. **`packages/web/src/components/cells/util.ts`** - Client-side utilities
   - `mapTsServerLocationToCM()` - Position conversion
   - `mapCMLocationToTsServer()` - Reverse conversion

**Diagnostic Event Order:**

```
1. syntaxDiag  - Parse errors (fast, AST-level)
2. semanticDiag - Type errors (slower, requires type checking)
3. suggestionDiag - Suggestions (optional improvements)
```

### 3.8 Interactive Exercise

```typescript
// Exercise: Build an Error Summary Generator
//
// Challenge:
// 1. Collect diagnostics from multiple cells
// 2. Group errors by error code
// 3. Generate a summary report
// 4. Track error trends over time

interface DiagnosticSummary {
  totalErrors: number;
  totalWarnings: number;
  errorsByCode: Map<number, { count: number; message: string }>;
  cellsWithErrors: string[];
}

class DiagnosticAnalyzer {
  private history: Map<string, Diagnostic[]>[] = [];

  analyze(cellDiagnostics: Map<string, Diagnostic[]>): DiagnosticSummary {
    // TODO: Implement analysis
    throw new Error('Not implemented');
  }

  getTrend(): { improving: boolean; delta: number } {
    // TODO: Compare current vs previous error count
    throw new Error('Not implemented');
  }

  generateReport(): string {
    // TODO: Format as readable report
    throw new Error('Not implemented');
  }
}

// Test your implementation:
// const analyzer = new DiagnosticAnalyzer();
// analyzer.analyze(cellDiagnostics);
// console.log(analyzer.generateReport());
```

### 3.9 Source References

| File | Purpose |
|------|---------|
| `packages/api/server/ws.mts` | Diagnostic event handlers |
| `packages/api/tsserver/utils.mts` | Diagnostic normalization |
| `packages/shared/src/schemas/tsserver.mts` | Type definitions |
| `packages/web/src/components/cells/util.ts` | Position mapping |

---

## 4. Acceptance Criteria

- [ ] Simple demo shows diagnostic parsing
- [ ] Position mapping clearly explained
- [ ] Advanced demo shows collection system
- [ ] All three diagnostic types covered
- [ ] Exercise is achievable

---

## 5. Implementation Notes

### File Location
```
packages/api/srcbook/examples/internals/typescript-diagnostics.src.md
```

### Validation
- Test with code containing all error types
- Verify position mapping accuracy
