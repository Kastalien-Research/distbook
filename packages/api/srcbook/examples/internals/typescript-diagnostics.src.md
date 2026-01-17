<!-- srcbook:{"language":"typescript"} -->

# TypeScript Diagnostics - Real-Time Error Checking

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

**What are TypeScript Diagnostics?**

TypeScript diagnostics are the real-time error and warning messages from the TypeScript compiler that appear in your code editor. They come in three categories:

- **Semantic Diagnostics**: Type errors - when types don't match (e.g., assigning a string to a number)
- **Syntax Diagnostics**: Parse errors - when the code structure is invalid (e.g., missing semicolons, unbalanced brackets)
- **Suggestion Diagnostics**: Improvements - hints about potential issues (e.g., unused variables)

These diagnostics are delivered asynchronously via tsserver events after you request them with the `geterr` command, then displayed inline in the code editor as squiggly underlines.

**Why does it matter?**

Understanding the diagnostics system helps you:
- Build diagnostic-aware features (custom error handling, AI-assisted fixes)
- Debug type checking issues in Srcbook
- Understand how errors flow from tsserver to the UI
- Contribute to the diagnostics pipeline

**Prerequisites**

Before diving in, you should be familiar with:
- TypeScript Server basics (see the TypeScript Server Srcbook)
- Basic TypeScript type system concepts
- Event-driven programming

**Learning Objectives**

By the end of this Srcbook, you will:
1. Understand the three diagnostic types (semantic, syntax, suggestion)
2. Learn how diagnostics flow from tsserver to the UI
3. Comprehend position mapping between tsserver and the editor
4. Know how to interpret and format diagnostic messages

## Key Concepts

### Diagnostics Flow

```
+-------------------------------------------------------------+
|                    Diagnostics Flow                          |
|                                                              |
|  1. Code Change                                              |
|     +------------------+                                     |
|     | User edits cell  |                                     |
|     +--------+---------+                                     |
|              v                                               |
|  2. File Update                                              |
|     +---------------------------------------------+          |
|     | tsserver.updateContent(file, newContent)   |          |
|     +--------+------------------------------------+          |
|              v                                               |
|  3. Request Diagnostics                                      |
|     +---------------------------------------------+          |
|     | tsserver.geterr({ files: [file], delay: 0 })|          |
|     +--------+------------------------------------+          |
|              v                                               |
|  4. Async Events (3 types)                                   |
|     +---------------------------------------------+          |
|     | syntaxDiag  -> Parse errors (missing ;, etc)|          |
|     | semanticDiag -> Type errors (type mismatch) |          |
|     | suggestionDiag -> Improvements (unused vars)|          |
|     +--------+------------------------------------+          |
|              v                                               |
|  5. Broadcast to Client                                      |
|     +---------------------------------------------+          |
|     | wss.broadcast("session:id",                |          |
|     |   "tsserver:cell:diagnostics",             |          |
|     |   { cellId, diagnostics })                 |          |
|     +--------+------------------------------------+          |
|              v                                               |
|  6. Display in Editor                                        |
|     +---------------------------------------------+          |
|     | CodeMirror decorations show squiggly lines |          |
|     +---------------------------------------------+          |
|                                                              |
+-------------------------------------------------------------+
```

### Diagnostic Event Order

When you call `geterr`, tsserver responds with events in this order:

1. **syntaxDiag** - Parse errors (fast, AST-level analysis)
2. **semanticDiag** - Type errors (slower, requires full type checking)
3. **suggestionDiag** - Suggestions (optional improvements)

This ordering matters because syntax errors are quick to compute and often block meaningful semantic analysis.

### Diagnostic Structure

Each diagnostic contains:
- **start/end**: Position in the source code (1-based line and offset)
- **text**: The error message
- **code**: TypeScript error code (e.g., 2322 for type mismatch)
- **category**: "error", "warning", or "suggestion"

## Simple Demo: Parsing Diagnostic Events

This demo shows the structure of diagnostic events and how to parse them.

###### simple-diagnostics.ts

```typescript
// Demonstrate diagnostic event structure and parsing

import { z } from 'zod';

// Diagnostic schema (based on packages/shared/src/schemas/tsserver.mts)
const DiagnosticLocationSchema = z.object({
  line: z.number(),    // 1-based line number
  offset: z.number(),  // 1-based column (character offset from start of line)
});

const DiagnosticSchema = z.object({
  start: DiagnosticLocationSchema,
  end: DiagnosticLocationSchema,
  text: z.string(),           // Error message
  code: z.number(),           // TypeScript error code
  category: z.string(),       // "error" | "warning" | "suggestion"
  relatedInformation: z.array(z.object({
    span: z.object({
      start: DiagnosticLocationSchema,
      end: DiagnosticLocationSchema,
      file: z.string(),
    }),
    message: z.string(),
  })).optional(),
});

type Diagnostic = z.infer<typeof DiagnosticSchema>;

// ============================================
// Example Diagnostic Events from tsserver
// ============================================

// Semantic diagnostics - Type errors
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

// Syntax diagnostics - Parse errors
const syntaxDiagnostics: Diagnostic[] = [
  {
    start: { line: 5, offset: 1 },
    end: { line: 5, offset: 2 },
    text: "';' expected.",
    code: 1005,
    category: "error",
  },
];

// Suggestion diagnostics - Improvements
const suggestionDiagnostics: Diagnostic[] = [
  {
    start: { line: 4, offset: 7 },
    end: { line: 4, offset: 12 },
    text: "'value' is declared but its value is never read.",
    code: 6133,
    category: "suggestion",
  },
];

// ============================================
// Formatting Functions
// ============================================

// Format a diagnostic for display
function formatDiagnostic(d: Diagnostic): string {
  const icon = d.category === 'error' ? '!' :
               d.category === 'warning' ? '?' : '*';
  const location = `${d.start.line}:${d.start.offset}`;
  return `${icon} [${location}] TS${d.code}: ${d.text}`;
}

// Format related information (for errors that reference other locations)
function formatRelated(d: Diagnostic): string[] {
  if (!d.relatedInformation?.length) return [];
  return d.relatedInformation.map(info => {
    const loc = `${info.span.start.line}:${info.span.start.offset}`;
    return `    -> ${info.span.file}:${loc} - ${info.message}`;
  });
}

// ============================================
// Display All Diagnostics
// ============================================

console.log('=== TypeScript Diagnostics Demo ===\n');

console.log('Semantic Diagnostics (Type Errors):');
console.log('-'.repeat(40));
semanticDiagnostics.forEach(d => {
  console.log(formatDiagnostic(d));
  formatRelated(d).forEach(r => console.log(r));
});

console.log('\nSyntax Diagnostics (Parse Errors):');
console.log('-'.repeat(40));
syntaxDiagnostics.forEach(d => {
  console.log(formatDiagnostic(d));
});

console.log('\nSuggestion Diagnostics (Improvements):');
console.log('-'.repeat(40));
suggestionDiagnostics.forEach(d => {
  console.log(formatDiagnostic(d));
});

// ============================================
// Schema Validation
// ============================================

console.log('\n\n=== Schema Validation ===');
const allDiagnostics = [...semanticDiagnostics, ...syntaxDiagnostics, ...suggestionDiagnostics];
allDiagnostics.forEach((d, i) => {
  const result = DiagnosticSchema.safeParse(d);
  console.log(`Diagnostic ${i + 1}: ${result.success ? 'Valid' : 'Invalid'}`);
});

// ============================================
// Error Code Reference
// ============================================

console.log('\n=== Common Error Codes ===');
const errorCodes: Record<number, string> = {
  1005: "Syntax: ';' expected",
  2304: "Cannot find name 'X'",
  2322: "Type 'X' is not assignable to type 'Y'",
  2339: "Property 'X' does not exist on type 'Y'",
  2551: "Property 'X' does not exist. Did you mean 'Y'?",
  2741: "Property 'X' is missing in type",
  6133: "'X' is declared but never read",
  7006: "Parameter 'X' implicitly has an 'any' type",
};

Object.entries(errorCodes).forEach(([code, desc]) => {
  console.log(`  TS${code}: ${desc}`);
});
```

## Position Mapping

TypeScript uses **1-based line and offset** (character position from start of line).
CodeMirror uses **0-based absolute position** (characters from start of document).

Converting between these systems is essential for displaying diagnostics in the correct location.

### Conversion Functions

```typescript
// Map tsserver position to CodeMirror absolute position
function tsToCodeMirror(code: string, line: number, offset: number): number {
  const lines = code.split('\n');
  let position = 0;

  // Add length of all complete lines before this one
  for (let i = 0; i < line - 1; i++) {
    position += lines[i].length + 1; // +1 for newline character
  }

  // Add offset within the current line (convert 1-based to 0-based)
  position += offset - 1;

  return position;
}

// Map CodeMirror absolute position to tsserver position
function codeEditorToTs(code: string, position: number): { line: number; offset: number } {
  const lines = code.split('\n');
  let remaining = position;
  let lineNum = 1;

  for (const line of lines) {
    if (remaining <= line.length) {
      // We're on this line
      return { line: lineNum, offset: remaining + 1 }; // Convert to 1-based
    }
    remaining -= line.length + 1; // +1 for newline
    lineNum++;
  }

  // Past end of file
  return { line: lineNum, offset: 1 };
}
```

### Why Position Mapping Matters

When tsserver reports an error at `line: 3, offset: 14`, the editor needs to know exactly which character to underline. Getting this wrong means squiggly lines appear in the wrong place, confusing users.

## Advanced Demo: Complete Diagnostics System

This demo simulates a complete diagnostics collection system similar to Srcbook's implementation.

###### diagnostics-system.ts

```typescript
// Full diagnostics system with position mapping and categorization

import { EventEmitter } from 'events';

// ============================================
// Type Definitions
// ============================================

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

// ============================================
// Position Mapper Class
// ============================================

class PositionMapper {
  private lineStarts: number[] = [];

  constructor(private code: string) {
    // Pre-compute line start positions for fast lookups
    this.lineStarts = [0];
    for (let i = 0; i < code.length; i++) {
      if (code[i] === '\n') {
        this.lineStarts.push(i + 1);
      }
    }
  }

  // Convert tsserver position (1-based) to absolute position (0-based)
  toAbsolute(pos: Position): number {
    const lineIndex = pos.line - 1;
    if (lineIndex < 0 || lineIndex >= this.lineStarts.length) {
      return 0;
    }
    return this.lineStarts[lineIndex] + pos.offset - 1;
  }

  // Convert absolute position to tsserver position
  toLineOffset(absolute: number): Position {
    // Binary search for the line
    let low = 0;
    let high = this.lineStarts.length - 1;

    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      if (this.lineStarts[mid] <= absolute) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return {
      line: low + 1,
      offset: absolute - this.lineStarts[low] + 1,
    };
  }

  // Get the text at a diagnostic range
  getRange(start: Position, end: Position): string {
    const startAbs = this.toAbsolute(start);
    const endAbs = this.toAbsolute(end);
    return this.code.slice(startAbs, endAbs);
  }

  // Get the full line containing a position
  getLine(lineNumber: number): string {
    const lineIndex = lineNumber - 1;
    const start = this.lineStarts[lineIndex] ?? 0;
    const end = this.lineStarts[lineIndex + 1] ?? this.code.length;
    return this.code.slice(start, end).replace(/\n$/, '');
  }
}

// ============================================
// Diagnostics Collector (like ws.mts handlers)
// ============================================

class DiagnosticsCollector extends EventEmitter {
  private cellDiagnostics: Map<string, CellDiagnostics> = new Map();
  private pendingCells: Set<string> = new Set();

  // Called when tsserver emits syntaxDiag event
  handleSyntaxDiag(cellId: string, diagnostics: Diagnostic[]): void {
    this.ensureCell(cellId);
    this.cellDiagnostics.get(cellId)!.syntaxDiag = diagnostics;
    console.log(`[SyntaxDiag] Received ${diagnostics.length} syntax diagnostics for ${cellId}`);
  }

  // Called when tsserver emits semanticDiag event
  handleSemanticDiag(cellId: string, diagnostics: Diagnostic[]): void {
    this.ensureCell(cellId);
    this.cellDiagnostics.get(cellId)!.semanticDiag = diagnostics;
    console.log(`[SemanticDiag] Received ${diagnostics.length} semantic diagnostics for ${cellId}`);

    // Emit combined diagnostics when semantic arrives (it's the last critical one)
    this.maybeEmit(cellId);
  }

  // Called when tsserver emits suggestionDiag event
  handleSuggestionDiag(cellId: string, diagnostics: Diagnostic[]): void {
    this.ensureCell(cellId);
    this.cellDiagnostics.get(cellId)!.suggestionDiag = diagnostics;
    console.log(`[SuggestionDiag] Received ${diagnostics.length} suggestion diagnostics for ${cellId}`);
  }

  // Start collecting diagnostics for a cell
  startCollection(cellId: string): void {
    this.pendingCells.add(cellId);
    this.cellDiagnostics.set(cellId, {
      cellId,
      semanticDiag: [],
      syntaxDiag: [],
      suggestionDiag: [],
    });
    console.log(`[Collector] Started collection for ${cellId}`);
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

  // Emit when semantic diagnostics received (primary error source)
  private maybeEmit(cellId: string): void {
    if (this.pendingCells.has(cellId)) {
      const diags = this.cellDiagnostics.get(cellId)!;
      const all = [...diags.semanticDiag, ...diags.syntaxDiag];

      console.log(`\n[Broadcast] Emitting ${all.length} diagnostics for ${cellId}`);
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

  // Get counts by category
  getCounts(cellId: string): { errors: number; warnings: number; suggestions: number } {
    const diags = this.getDiagnostics(cellId);
    return {
      errors: diags.filter(d => d.category === 'error').length,
      warnings: diags.filter(d => d.category === 'warning').length,
      suggestions: diags.filter(d => d.category === 'suggestion').length,
    };
  }
}

// ============================================
// Demo
// ============================================

const collector = new DiagnosticsCollector();

// Listen for diagnostic events (like the WebSocket broadcast)
collector.on('diagnostics', (cellId, diagnostics) => {
  console.log(`\n[Client] Cell ${cellId} received ${diagnostics.length} diagnostic(s):`);
  diagnostics.forEach(d => {
    const icon = d.category === 'error' ? '!' : '?';
    console.log(`  ${icon} Line ${d.start.line}: ${d.text}`);
  });
});

// Simulate receiving diagnostics from tsserver
console.log('=== Simulating tsserver Diagnostic Events ===\n');

const cellId = 'cell-001';
collector.startCollection(cellId);

// 1. Syntax diagnostics arrive first (fast)
collector.handleSyntaxDiag(cellId, [
  {
    start: { line: 3, offset: 1 },
    end: { line: 3, offset: 2 },
    text: "';' expected.",
    code: 1005,
    category: 'error',
  },
]);

// 2. Semantic diagnostics arrive next (triggers broadcast)
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

// 3. Suggestions arrive last (optional)
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
const counts = collector.getCounts(cellId);
console.log(`Total: ${collector.getDiagnostics(cellId).length}`);
console.log(`  Errors: ${counts.errors}`);
console.log(`  Warnings: ${counts.warnings}`);
console.log(`  Suggestions: ${counts.suggestions}`);

// ============================================
// Position Mapping Demo
// ============================================

console.log('\n=== Position Mapping Demo ===');

const code = `interface User {
  name: string;
  age: number;
}

const user = { name: "test" };
`;

const mapper = new PositionMapper(code);

// Convert line 3, offset 3 ("age") to absolute position
const position = { line: 3, offset: 3 };
const absolute = mapper.toAbsolute(position);
console.log(`\ntsserver position: line ${position.line}, offset ${position.offset}`);
console.log(`Absolute position: ${absolute}`);
console.log(`Text at position: "${code.slice(absolute, absolute + 3)}"`);

// Convert absolute back to line/offset
const converted = mapper.toLineOffset(absolute);
console.log(`Converted back: line ${converted.line}, offset ${converted.offset}`);

// Get a diagnostic range
const rangeStart = { line: 2, offset: 3 };
const rangeEnd = { line: 2, offset: 7 };
console.log(`\nRange at ${rangeStart.line}:${rangeStart.offset} to ${rangeEnd.line}:${rangeEnd.offset}:`);
console.log(`  "${mapper.getRange(rangeStart, rangeEnd)}"`);

// Get a full line
console.log(`\nFull line 2: "${mapper.getLine(2)}"`);
```

## Deep Dive: Srcbook's Implementation

Let's examine how Srcbook actually implements diagnostics collection.

### Source File Overview

| File | Purpose |
|------|---------|
| `packages/api/server/ws.mts` | WebSocket handlers for diagnostic events |
| `packages/api/tsserver/utils.mts` | Diagnostic normalization |
| `packages/shared/src/schemas/tsserver.mts` | Type definitions and Zod schemas |
| `packages/web/src/components/cells/util.ts` | Client-side position mapping |

### Diagnostic Event Handlers (ws.mts)

The WebSocket server listens for tsserver events and broadcasts them to clients:

```typescript
// From packages/api/server/ws.mts (lines ~618-643)

tsserver.onSemanticDiag(async (event) => {
  const eventBody = event.body;
  if (!eventBody) return;

  // Get current session state
  const session = await findSession(sessionId);

  // Map file path back to cell ID
  const filename = filenameFromPath(eventBody.file);
  const cell = cells.find((c) => c.filename === filename);

  if (!cell) return;

  // Broadcast normalized diagnostics to all clients
  wss.broadcast(`session:${session.id}`, 'tsserver:cell:diagnostics', {
    cellId: cell.id,
    diagnostics: eventBody.diagnostics.map(normalizeDiagnostic),
  });
});
```

### Diagnostic Normalization (utils.mts)

Different TypeScript versions return diagnostics in different formats:

```typescript
// From packages/api/tsserver/utils.mts

export function normalizeDiagnostic(
  diagnostic: Diagnostic | DiagnosticWithLinePosition,
): TsServerDiagnosticType {
  if (isDiagnosticWithLinePosition(diagnostic)) {
    // Newer format with startLocation/endLocation
    return {
      code: diagnostic.code,
      category: diagnostic.category,
      text: diagnostic.message,
      start: diagnostic.startLocation,
      end: diagnostic.endLocation,
    };
  } else {
    // Standard format with start/end
    return {
      code: diagnostic.code || 1000, // Fallback for missing code
      category: diagnostic.category,
      text: diagnostic.text,
      start: diagnostic.start,
      end: diagnostic.end,
    };
  }
}
```

### Type Definitions (tsserver.mts)

The shared package defines Zod schemas for validation:

```typescript
// From packages/shared/src/schemas/tsserver.mts

export const TsServerLocationSchema = z.object({
  line: z.number(),
  offset: z.number(),
});

export const TsServerDiagnosticSchema = z.object({
  code: z.number(),
  category: z.string(),
  text: z.string(),
  start: TsServerLocationSchema,
  end: TsServerLocationSchema,
});
```

### Request Flow

When a user edits a cell:

1. **Client** sends `cell:updated` via WebSocket
2. **Server** updates the file in tsserver: `tsserver.open({ file, fileContent })`
3. **Server** requests diagnostics: `tsserver.geterr({ files: [file], delay: 0 })`
4. **tsserver** emits events asynchronously: `syntaxDiag`, `semanticDiag`, `suggestionDiag`
5. **Server** normalizes and broadcasts: `wss.broadcast('tsserver:cell:diagnostics', ...)`
6. **Client** renders squiggly underlines in CodeMirror

## Interactive Exercise: Build an Error Summary Generator

Build a diagnostic analyzer that collects diagnostics from multiple cells and generates reports.

###### exercise.ts

```typescript
// Exercise: Build a Diagnostic Summary Generator
//
// Challenge:
// 1. Collect diagnostics from multiple cells
// 2. Group errors by error code
// 3. Generate a summary report
// 4. Track error trends over time (bonus)

interface Diagnostic {
  start: { line: number; offset: number };
  end: { line: number; offset: number };
  text: string;
  code: number;
  category: 'error' | 'warning' | 'suggestion';
}

interface CellDiagnostics {
  cellId: string;
  diagnostics: Diagnostic[];
}

interface DiagnosticSummary {
  totalErrors: number;
  totalWarnings: number;
  totalSuggestions: number;
  errorsByCode: Map<number, { count: number; message: string }>;
  cellsWithErrors: string[];
  mostCommonError: { code: number; count: number } | null;
}

class DiagnosticAnalyzer {
  private snapshots: Map<string, Diagnostic[]>[] = [];
  private currentSnapshot: Map<string, Diagnostic[]> = new Map();

  // Add diagnostics for a cell
  addCellDiagnostics(cellId: string, diagnostics: Diagnostic[]): void {
    this.currentSnapshot.set(cellId, diagnostics);
  }

  // Clear diagnostics for a cell
  clearCellDiagnostics(cellId: string): void {
    this.currentSnapshot.delete(cellId);
  }

  // Take a snapshot (for trend tracking)
  takeSnapshot(): void {
    this.snapshots.push(new Map(this.currentSnapshot));
  }

  // Analyze current diagnostics
  analyze(): DiagnosticSummary {
    const allDiagnostics: Diagnostic[] = [];
    const cellsWithErrors: string[] = [];

    for (const [cellId, diags] of this.currentSnapshot) {
      allDiagnostics.push(...diags);
      if (diags.some(d => d.category === 'error')) {
        cellsWithErrors.push(cellId);
      }
    }

    const errorsByCode = new Map<number, { count: number; message: string }>();

    for (const diag of allDiagnostics) {
      if (diag.category === 'error') {
        const existing = errorsByCode.get(diag.code);
        if (existing) {
          existing.count++;
        } else {
          errorsByCode.set(diag.code, { count: 1, message: diag.text });
        }
      }
    }

    // Find most common error
    let mostCommonError: { code: number; count: number } | null = null;
    for (const [code, data] of errorsByCode) {
      if (!mostCommonError || data.count > mostCommonError.count) {
        mostCommonError = { code, count: data.count };
      }
    }

    return {
      totalErrors: allDiagnostics.filter(d => d.category === 'error').length,
      totalWarnings: allDiagnostics.filter(d => d.category === 'warning').length,
      totalSuggestions: allDiagnostics.filter(d => d.category === 'suggestion').length,
      errorsByCode,
      cellsWithErrors,
      mostCommonError,
    };
  }

  // Get trend compared to last snapshot
  getTrend(): { improving: boolean; delta: number } | null {
    if (this.snapshots.length === 0) {
      return null;
    }

    const previousSnapshot = this.snapshots[this.snapshots.length - 1];
    let previousErrors = 0;
    for (const diags of previousSnapshot.values()) {
      previousErrors += diags.filter(d => d.category === 'error').length;
    }

    let currentErrors = 0;
    for (const diags of this.currentSnapshot.values()) {
      currentErrors += diags.filter(d => d.category === 'error').length;
    }

    const delta = currentErrors - previousErrors;
    return {
      improving: delta < 0,
      delta,
    };
  }

  // Generate a formatted report
  generateReport(): string {
    const summary = this.analyze();
    const trend = this.getTrend();

    let report = '';
    report += '='.repeat(50) + '\n';
    report += '  DIAGNOSTIC SUMMARY REPORT\n';
    report += '='.repeat(50) + '\n\n';

    report += 'OVERVIEW\n';
    report += '-'.repeat(30) + '\n';
    report += `  Errors:      ${summary.totalErrors}\n`;
    report += `  Warnings:    ${summary.totalWarnings}\n`;
    report += `  Suggestions: ${summary.totalSuggestions}\n`;
    report += `  Cells with errors: ${summary.cellsWithErrors.length}\n`;

    if (trend) {
      const direction = trend.improving ? 'DOWN' : 'UP';
      const icon = trend.improving ? 'v' : '^';
      report += `\n  Trend: ${icon} ${Math.abs(trend.delta)} errors ${direction} from last snapshot\n`;
    }

    if (summary.errorsByCode.size > 0) {
      report += '\nERRORS BY CODE\n';
      report += '-'.repeat(30) + '\n';

      const sorted = Array.from(summary.errorsByCode.entries())
        .sort((a, b) => b[1].count - a[1].count);

      for (const [code, data] of sorted) {
        report += `  TS${code}: ${data.count}x\n`;
        report += `    "${data.message.slice(0, 50)}${data.message.length > 50 ? '...' : ''}"\n`;
      }
    }

    if (summary.mostCommonError) {
      report += '\nMOST COMMON ERROR\n';
      report += '-'.repeat(30) + '\n';
      report += `  TS${summary.mostCommonError.code} (${summary.mostCommonError.count} occurrences)\n`;
    }

    report += '\n' + '='.repeat(50) + '\n';

    return report;
  }
}

// ============================================
// Test Your Implementation
// ============================================

console.log('=== Diagnostic Analyzer Test ===\n');

const analyzer = new DiagnosticAnalyzer();

// Simulate diagnostics from multiple cells
analyzer.addCellDiagnostics('cell-001', [
  {
    start: { line: 3, offset: 1 },
    end: { line: 3, offset: 10 },
    text: "Type 'string' is not assignable to type 'number'.",
    code: 2322,
    category: 'error',
  },
  {
    start: { line: 7, offset: 5 },
    end: { line: 7, offset: 8 },
    text: "'foo' is declared but its value is never read.",
    code: 6133,
    category: 'suggestion',
  },
]);

analyzer.addCellDiagnostics('cell-002', [
  {
    start: { line: 2, offset: 1 },
    end: { line: 2, offset: 5 },
    text: "Cannot find name 'test'.",
    code: 2304,
    category: 'error',
  },
  {
    start: { line: 5, offset: 1 },
    end: { line: 5, offset: 15 },
    text: "Type 'string' is not assignable to type 'number'.",
    code: 2322,
    category: 'error',
  },
]);

analyzer.addCellDiagnostics('cell-003', [
  {
    start: { line: 1, offset: 7 },
    end: { line: 1, offset: 12 },
    text: "'value' is declared but its value is never read.",
    code: 6133,
    category: 'suggestion',
  },
]);

// Take a snapshot
analyzer.takeSnapshot();

// Simulate fixing some errors
analyzer.addCellDiagnostics('cell-001', [
  {
    start: { line: 7, offset: 5 },
    end: { line: 7, offset: 8 },
    text: "'foo' is declared but its value is never read.",
    code: 6133,
    category: 'suggestion',
  },
]);

// Generate report
console.log(analyzer.generateReport());

// Check the trend
const trend = analyzer.getTrend();
if (trend) {
  console.log(`\nTrend Analysis: ${trend.improving ? 'Improving!' : 'Getting worse...'}`);
  console.log(`  Delta: ${trend.delta > 0 ? '+' : ''}${trend.delta} errors`);
}
```

## Source Code References

Want to explore the actual implementation? Here are the key source files:

### Primary Files

| File | Purpose |
|------|---------|
| [`packages/api/server/ws.mts`](../../../server/ws.mts) | Diagnostic event handlers (lines ~607-680) |
| [`packages/api/tsserver/utils.mts`](../../../tsserver/utils.mts) | Diagnostic normalization function |
| [`packages/shared/src/schemas/tsserver.mts`](../../../../shared/src/schemas/tsserver.mts) | Zod schemas for type safety |

### Key Functions to Study

**In `ws.mts`:**
- `createTsServer()` - Sets up diagnostic event listeners
- `requestAllDiagnostics()` - Requests diagnostics for all cells
- `tsserver.onSemanticDiag()` - Handler for semantic errors
- `tsserver.onSuggestionDiag()` - Handler for suggestions

**In `utils.mts`:**
- `normalizeDiagnostic()` - Standardizes different diagnostic formats
- `isDiagnosticWithLinePosition()` - Type guard for format detection

**In `tsserver.mts` (schemas):**
- `TsServerDiagnosticSchema` - Zod schema for validation
- `TsServerLocationSchema` - Position schema

## Next Steps

### Related Topics

Now that you understand diagnostics, explore:

- **TypeScript Server Srcbook**: Learn how tsserver is spawned and managed
- **Autocompletion**: How completions are requested and displayed
- **Cell Execution**: How code runs after type checking passes
- **WebSocket Protocol**: How diagnostics are broadcast to clients

### Further Reading

- [TypeScript Error Codes](https://github.com/microsoft/TypeScript/blob/main/src/compiler/diagnosticMessages.json) - Complete list of error codes
- [TypeScript Server Protocol](https://github.com/microsoft/TypeScript/blob/main/src/server/protocol.ts) - Official protocol reference
- [CodeMirror Decorations](https://codemirror.net/docs/ref/#view.Decoration) - How squiggly lines are rendered

### Contributing Ideas

Consider improvements like:
- Error quick fixes (suggest code changes)
- Error grouping and categorization
- Historical error tracking
- AI-powered error explanations

## Summary

In this Srcbook, we covered:

- **What are diagnostics**: Error/warning/suggestion messages from TypeScript
- **Three types**: Semantic (types), Syntax (parsing), Suggestion (improvements)
- **Event flow**: geterr -> async events -> broadcast -> UI
- **Position mapping**: Converting between 1-based tsserver and 0-based editor positions
- **Normalization**: Handling different diagnostic formats

Key takeaways:

1. **Diagnostics are async** - `geterr` triggers events, not direct responses
2. **Order matters** - Syntax diagnostics arrive before semantic
3. **Position mapping is critical** - Wrong positions mean wrong underlines
4. **Normalization handles versions** - Different TypeScript versions, same interface

You now understand how Srcbook collects and displays TypeScript diagnostics. This knowledge is essential for building diagnostic-aware features, debugging type checking issues, or contributing to the diagnostics pipeline.
