<!-- srcbook:{"language":"typescript"} -->

# AI Diagnostics Fixing - Automated Error Resolution

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

**What is AI Diagnostics Fixing?**

AI Diagnostics Fixing is Srcbook's feature that uses AI to automatically repair TypeScript errors in your code cells. When the TypeScript compiler detects errors (the red squiggly underlines), you can ask the AI to fix them automatically.

**How it Works**

The system follows a three-stage pipeline:

1. **Detect**: TypeScript server reports diagnostics (errors, warnings, suggestions)
2. **Request**: User clicks "Fix with AI" button on a cell with errors
3. **Fix**: AI receives the code + diagnostics + context, generates corrected code

**Why does it matter?**

Understanding the diagnostics-to-AI pipeline enables you to:

- Debug when fixes don't work as expected
- Improve fix quality through better prompts
- Build custom fix strategies for specific error types
- Contribute to the fix pipeline implementation

**Prerequisites**

Before diving in, you should be familiar with:

- TypeScript Diagnostics (see TypeScript Diagnostics Srcbook)
- Code Generation basics (see Code Generation Srcbook)
- AI integration patterns in Srcbook

**Learning Objectives**

By the end of this Srcbook, you will:

1. Understand the diagnostics-to-AI pipeline
2. Learn how context is provided to the AI model
3. Comprehend the fix application process
4. Know how to improve fix quality

---

## Key Concepts - Fix Pipeline

The fix pipeline transforms TypeScript errors into working code through AI assistance:

```
+-------------------------------------------------------------+
|                    AI Fix Pipeline                           |
|                                                              |
|  1. Detect Errors                                            |
|     +-------------------------------------------------------+|
|     | tsserver emits diagnostics (syntaxDiag, semanticDiag) ||
|     | Errors displayed as red underlines in editor          ||
|     +-------------------------------------------------------+|
|              |                                               |
|              v                                               |
|  2. User Requests Fix                                        |
|     +-------------------------------------------------------+|
|     | User clicks "Fix with AI" button on cell              ||
|     | WebSocket event: ai:fix_diagnostics sent              ||
|     +-------------------------------------------------------+|
|              |                                               |
|              v                                               |
|  3. Build Context                                            |
|     +-------------------------------------------------------+|
|     | Collect: cell code + diagnostics + full session       ||
|     | Encode session to srcmd format for context            ||
|     +-------------------------------------------------------+|
|              |                                               |
|              v                                               |
|  4. AI Generation                                            |
|     +-------------------------------------------------------+|
|     | System prompt: fix-cell-diagnostics.txt               ||
|     | User prompt: srcbook + cell + diagnostics             ||
|     | AI returns: fixed code only (no markdown)             ||
|     +-------------------------------------------------------+|
|              |                                               |
|              v                                               |
|  5. Apply Fix                                                |
|     +-------------------------------------------------------+|
|     | Replace cell source with AI output                    ||
|     | Request new diagnostics to verify fix                 ||
|     | Broadcast update to all connected clients             ||
|     +-------------------------------------------------------+|
|                                                              |
+-------------------------------------------------------------+
```

### Key Design Decisions

1. **Full Session Context**: The entire srcbook is passed to the AI, so it understands imports and dependencies between cells.

2. **Raw Code Output**: The AI is instructed to return only code, no markdown or explanations, making parsing trivial.

3. **Error Code Specificity**: Diagnostic codes (like TS2322) help the AI understand exactly what type of error to fix.

4. **Iterative Fixing**: The UI allows users to retry if the first fix doesn't resolve all errors.

---

## Simple Demo - Basic Error Fixing

This demo shows the core concepts of formatting diagnostics for AI and generating fixes.

###### simple-fix.ts

```typescript
// Demonstrate basic diagnostic fixing concepts

// =============================================================================
// Diagnostic Types (simplified from packages/shared)
// =============================================================================

interface Diagnostic {
  start: { line: number; offset: number };
  end: { line: number; offset: number };
  text: string;
  code: number;
  category: 'error' | 'warning' | 'suggestion';
}

// =============================================================================
// Sample Code with Multiple Errors
// =============================================================================

// This code has several intentional errors that AI would fix
const codeWithErrors = `
interface User {
  name: string;
  email: string;
  age: number;
}

function createUser(data: Partial<User>): User {
  return {
    nam: data.name,          // Error: typo in property name
    email: data.email,
    age: "25",               // Error: string assigned to number
  };                         // Error: missing required property 'name'
}

const user = createUser({ name: "Alice" });
console.log(user.fullName); // Error: property doesn't exist
`;

// Corresponding diagnostics that tsserver would emit
const diagnostics: Diagnostic[] = [
  {
    start: { line: 9, offset: 5 },
    end: { line: 9, offset: 8 },
    text: "Object literal may only specify known properties, but 'nam' does not exist in type 'User'. Did you mean to write 'name'?",
    code: 2561,
    category: 'error',
  },
  {
    start: { line: 11, offset: 10 },
    end: { line: 11, offset: 14 },
    text: "Type 'string' is not assignable to type 'number'.",
    code: 2322,
    category: 'error',
  },
  {
    start: { line: 8, offset: 10 },
    end: { line: 12, offset: 4 },
    text: "Property 'name' is missing in type '{ nam: string | undefined; email: string | undefined; age: string; }' but required in type 'User'.",
    code: 2741,
    category: 'error',
  },
  {
    start: { line: 16, offset: 18 },
    end: { line: 16, offset: 26 },
    text: "Property 'fullName' does not exist on type 'User'.",
    code: 2339,
    category: 'error',
  },
];

// =============================================================================
// Format Diagnostics for AI Prompt
// =============================================================================

function formatDiagnosticsForPrompt(diags: Diagnostic[]): string {
  return diags.map(d => {
    const location = `Line ${d.start.line}, Column ${d.start.offset}`;
    return `TS${d.code} at ${location}: ${d.text}`;
  }).join('\n');
}

// =============================================================================
// Expected Fixed Code (what AI would generate)
// =============================================================================

const fixedCode = `
interface User {
  name: string;
  email: string;
  age: number;
}

function createUser(data: Partial<User>): User {
  return {
    name: data.name ?? '',      // Fixed: correct property name
    email: data.email ?? '',
    age: data.age ?? 0,         // Fixed: proper number type
  };
}

const user = createUser({ name: "Alice" });
console.log(user.name);         // Fixed: use existing property
`;

// =============================================================================
// Demo Output
// =============================================================================

console.log('=== AI Diagnostics Fixing Demo ===\n');

console.log('Original Code with Errors:');
console.log('-'.repeat(50));
console.log(codeWithErrors);

console.log('\nDetected Diagnostics:');
console.log('-'.repeat(50));
console.log(formatDiagnosticsForPrompt(diagnostics));

console.log('\n\nFixed Code (AI-generated):');
console.log('-'.repeat(50));
console.log(fixedCode);

// Count errors fixed
console.log('\n=== Summary ===');
console.log(`Errors detected: ${diagnostics.length}`);
console.log(`Errors fixed: ${diagnostics.length}`);
console.log(`Fix success rate: 100%`);

// =============================================================================
// Error Code Reference
// =============================================================================

console.log('\n=== Common Error Codes for Fixing ===');
const errorCodeDescriptions: Record<number, string> = {
  2304: "Cannot find name 'X' - Missing import or declaration",
  2322: "Type 'X' not assignable to 'Y' - Type mismatch",
  2339: "Property 'X' does not exist - Typo or missing property",
  2345: "Argument type mismatch - Wrong function argument",
  2551: "Did you mean 'Y'? - Typo with suggestion",
  2561: "Object literal unknown property - Typo in object key",
  2741: "Property missing in type - Incomplete object",
  7006: "Parameter implicitly has 'any' type - Missing type annotation",
};

Object.entries(errorCodeDescriptions).forEach(([code, desc]) => {
  console.log(`  TS${code}: ${desc}`);
});
```

---

## Prompt Engineering for Fixes

The AI fix system uses carefully crafted prompts to ensure reliable code output.

### System Prompt Design

The fix system prompt (`packages/api/prompts/fix-cell-diagnostics.txt`) includes:

1. **Role Definition**: "You are tasked with suggesting a TypeScript diagnostics fix"
2. **Context Explanation**: Describes what a Srcbook is and how cells work
3. **Input Format**: Explains the three delimited sections (srcbook, cell, diagnostics)
4. **Output Format**: Critical - "ONLY RETURN THE CODE. NO PREAMBLE, NO BACKTICKS"

### Why Raw Code Output?

Unlike cell generation (which uses markdown), diagnostic fixes return raw code because:

1. **Simpler Parsing**: No need to extract from markdown blocks
2. **Direct Replacement**: Output directly replaces cell source
3. **Fewer Errors**: Less chance of formatting issues
4. **Faster Processing**: No parsing step needed

### User Prompt Structure

The user prompt has three clearly delimited sections:

```
==== BEGIN SRCBOOK ====
{full srcbook encoded as markdown}
==== END SRCBOOK ====

==== BEGIN CODE CELL ====
{the specific cell code to fix}
==== END CODE CELL ====

==== BEGIN DIAGNOSTICS ====
{formatted diagnostic messages}
==== END DIAGNOSTICS ====
```

---

## Advanced Demo - Full Fix System

This demo implements a complete diagnostics fixing system with validation and confidence scoring.

###### fix-system.ts

```typescript
// Complete diagnostics fixing system (mirrors packages/api implementation)

import { z } from 'zod';

// =============================================================================
// Type Definitions
// =============================================================================

interface Diagnostic {
  start: { line: number; offset: number };
  end: { line: number; offset: number };
  text: string;
  code: number;
  category: 'error' | 'warning' | 'suggestion';
}

interface Cell {
  id: string;
  filename: string;
  source: string;
  language: 'typescript' | 'javascript';
}

interface SessionContext {
  language: 'typescript' | 'javascript';
  otherCells: Cell[];
  packages: Record<string, string>;
}

interface FixResult {
  success: boolean;
  fixedCode?: string;
  errorsRemaining?: number;
  confidence: number;
  attemptNumber: number;
}

// =============================================================================
// Fix Prompt Template (from packages/api/prompts/fix-cell-diagnostics.txt)
// =============================================================================

const FIX_PROMPT_TEMPLATE = `
You are tasked with suggesting a TypeScript diagnostics fix to a code block (or "cell") in a Srcbook.

A Srcbook is a TypeScript notebook which follows a markdown-compatible format.

The user is already working on an existing Srcbook, and the TypeScript linter has flagged an issue in one of the cells.

You will be given:
 * the entire Srcbook as useful context, surrounded with "==== BEGIN SRCBOOK ====" and "==== END SRCBOOK ====".
 * the specific code cell that needs to be fixed, surrounded with "==== BEGIN CODE CELL ====" and "==== END CODE CELL ====".
 * the diagnostics output from tsserver, surrounded with "==== BEGIN DIAGNOSTICS ====" and "==== END DIAGNOSTICS ====".

Your job is to fix the issues and suggest new code for the cell. Your response will be fed to a diffing algorithm against the original cell code, so you *have* to replace all of the code in the cell.
ONLY RETURN THE CODE. NO PREAMBLE, NO BACKTICKS, NO MARKDOWN, NO SUFFIX, ONLY THE TYPESCRIPT CODE.
`.trim();

// =============================================================================
// DiagnosticsFixer Class
// =============================================================================

class DiagnosticsFixer {
  private attemptHistory: Map<string, FixResult[]> = new Map();

  constructor(private context: SessionContext) {}

  // Build the system prompt (consistent across all fix requests)
  buildSystemPrompt(): string {
    return FIX_PROMPT_TEMPLATE;
  }

  // Build the user prompt with all context
  buildUserPrompt(cellCode: string, diagnostics: Diagnostic[]): string {
    // Encode session context as srcbook format
    const srcbookContent = this.encodeSessionContext();

    // Format diagnostics for the prompt
    const diagnosticsText = diagnostics
      .map(d => `TS${d.code} (${d.category}) at line ${d.start.line}: ${d.text}`)
      .join('\n');

    return `==== BEGIN SRCBOOK ====
${srcbookContent}
==== END SRCBOOK ====

==== BEGIN CODE CELL ====
${cellCode}
==== END CODE CELL ====

==== BEGIN DIAGNOSTICS ====
${diagnosticsText}
==== END DIAGNOSTICS ====`;
  }

  // Encode session context similar to packages/api/srcmd.mts encode()
  private encodeSessionContext(): string {
    let content = `# Srcbook Session\n\n`;
    content += `Language: ${this.context.language}\n\n`;

    if (Object.keys(this.context.packages).length > 0) {
      content += `## Packages\n`;
      content += Object.entries(this.context.packages)
        .map(([name, version]) => `- ${name}@${version}`)
        .join('\n');
      content += '\n\n';
    }

    content += `## Cells\n\n`;
    for (const cell of this.context.otherCells) {
      content += `### ${cell.filename}\n\`\`\`${cell.language}\n${cell.source}\n\`\`\`\n\n`;
    }

    return content;
  }

  // Simulate AI call (in production, uses Vercel AI SDK)
  private async callAI(systemPrompt: string, userPrompt: string): Promise<string> {
    console.log('Calling AI for fix...');
    console.log(`  System prompt: ${systemPrompt.length} chars`);
    console.log(`  User prompt: ${userPrompt.length} chars`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Return simulated fix (in production, this is actual AI response)
    return this.simulateAIFix(userPrompt);
  }

  // Simulate what the AI would return
  private simulateAIFix(userPrompt: string): string {
    // This is a simplified simulation
    // Real AI would analyze the diagnostics and generate appropriate fixes

    // Extract the cell code from the prompt
    const cellMatch = userPrompt.match(/==== BEGIN CODE CELL ====\n([\s\S]*?)\n==== END CODE CELL ====/);
    if (!cellMatch) return '';

    let code = cellMatch[1];

    // Apply common fix patterns based on detected errors
    if (userPrompt.includes('TS2322')) {
      // Type mismatch - look for common patterns
      code = code.replace(/: "(\d+)"/g, ': $1');  // "25" -> 25
      code = code.replace(/= "(\d+)"/g, '= $1');
    }

    if (userPrompt.includes('TS2551') || userPrompt.includes('TS2561')) {
      // Typo suggestions - common fixes
      code = code.replace(/\bnam\b/g, 'name');
      code = code.replace(/\bemal\b/g, 'email');
    }

    if (userPrompt.includes('TS2339')) {
      // Property doesn't exist - use similar property
      code = code.replace(/\.fullName/g, '.name');
    }

    return code;
  }

  // Validate the fix by comparing diagnostics before and after
  async validateFix(originalDiagnostics: Diagnostic[], fixedCode: string): Promise<{
    valid: boolean;
    errorsRemaining: number;
    errorsFixed: number;
  }> {
    // In production, this would:
    // 1. Update the file in tsserver
    // 2. Request new diagnostics
    // 3. Compare before/after

    // For demo, simulate that fix resolved most errors
    const errorsRemaining = Math.max(0, originalDiagnostics.length - 3);

    return {
      valid: errorsRemaining === 0,
      errorsRemaining,
      errorsFixed: originalDiagnostics.length - errorsRemaining,
    };
  }

  // Calculate confidence score based on fix history and error types
  calculateConfidence(
    diagnostics: Diagnostic[],
    errorsFixed: number,
    attemptNumber: number
  ): number {
    // Base confidence from success rate
    let confidence = errorsFixed / diagnostics.length;

    // Adjust based on error types (some are easier to fix)
    const easyErrors = [2551, 2561, 2322, 2339]; // typos, type mismatches
    const hardErrors = [2304, 7006, 2345];        // missing imports, any types

    const easyCount = diagnostics.filter(d => easyErrors.includes(d.code)).length;
    const hardCount = diagnostics.filter(d => hardErrors.includes(d.code)).length;

    confidence += (easyCount * 0.05);  // Boost for easy errors
    confidence -= (hardCount * 0.1);   // Penalty for hard errors

    // Reduce confidence on retry attempts
    confidence -= (attemptNumber - 1) * 0.15;

    // Clamp to valid range
    return Math.max(0, Math.min(1, confidence));
  }

  // Main fix method
  async fix(cellId: string, cellCode: string, diagnostics: Diagnostic[]): Promise<FixResult> {
    // Get attempt history
    const history = this.attemptHistory.get(cellId) || [];
    const attemptNumber = history.length + 1;

    console.log(`\n=== Fix Attempt ${attemptNumber} for cell ${cellId} ===`);
    console.log(`Errors to fix: ${diagnostics.length}`);

    try {
      // 1. Build prompts
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(cellCode, diagnostics);

      // 2. Call AI
      const fixedCode = await this.callAI(systemPrompt, userPrompt);

      // 3. Validate fix
      const validation = await this.validateFix(diagnostics, fixedCode);
      console.log(`Validation: ${validation.errorsFixed} errors fixed, ${validation.errorsRemaining} remaining`);

      // 4. Calculate confidence
      const confidence = this.calculateConfidence(
        diagnostics,
        validation.errorsFixed,
        attemptNumber
      );
      console.log(`Confidence: ${(confidence * 100).toFixed(0)}%`);

      // 5. Record result
      const result: FixResult = {
        success: validation.valid,
        fixedCode,
        errorsRemaining: validation.errorsRemaining,
        confidence,
        attemptNumber,
      };

      history.push(result);
      this.attemptHistory.set(cellId, history);

      return result;

    } catch (error) {
      const result: FixResult = {
        success: false,
        confidence: 0,
        attemptNumber,
      };
      history.push(result);
      this.attemptHistory.set(cellId, history);
      return result;
    }
  }

  // Get fix statistics for a cell
  getStats(cellId: string): {
    attempts: number;
    successRate: number;
    avgConfidence: number;
  } {
    const history = this.attemptHistory.get(cellId) || [];
    if (history.length === 0) {
      return { attempts: 0, successRate: 0, avgConfidence: 0 };
    }

    const successes = history.filter(r => r.success).length;
    const avgConfidence = history.reduce((sum, r) => sum + r.confidence, 0) / history.length;

    return {
      attempts: history.length,
      successRate: successes / history.length,
      avgConfidence,
    };
  }
}

// =============================================================================
// Demo Execution
// =============================================================================

async function demo() {
  console.log('=== Diagnostics Fixer Demo ===\n');

  // Create session context
  const context: SessionContext = {
    language: 'typescript',
    packages: {
      typescript: 'latest',
      zod: '^3.23.8',
    },
    otherCells: [
      {
        id: 'cell-1',
        filename: 'types.ts',
        source: 'export interface User { name: string; email: string; age: number; }',
        language: 'typescript',
      },
    ],
  };

  // Create fixer
  const fixer = new DiagnosticsFixer(context);

  // Sample cell with errors
  const cellId = 'cell-2';
  const cellCode = `
import { User } from './types.ts';

const user: User = {
  nam: "Alice",
  email: "alice@example.com",
  age: "25",
};

console.log(user.fullName);
`;

  // Sample diagnostics
  const diagnostics: Diagnostic[] = [
    {
      start: { line: 4, offset: 3 },
      end: { line: 4, offset: 6 },
      text: "'nam' does not exist in type 'User'. Did you mean to write 'name'?",
      code: 2561,
      category: 'error',
    },
    {
      start: { line: 6, offset: 8 },
      end: { line: 6, offset: 12 },
      text: "Type 'string' is not assignable to type 'number'.",
      code: 2322,
      category: 'error',
    },
    {
      start: { line: 9, offset: 18 },
      end: { line: 9, offset: 26 },
      text: "Property 'fullName' does not exist on type 'User'.",
      code: 2339,
      category: 'error',
    },
  ];

  // Run fix
  const result = await fixer.fix(cellId, cellCode, diagnostics);

  // Display results
  console.log('\n=== Fix Result ===');
  console.log(`Success: ${result.success}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);
  console.log(`Errors remaining: ${result.errorsRemaining}`);
  console.log(`Attempt: ${result.attemptNumber}`);

  if (result.fixedCode) {
    console.log('\n--- Fixed Code ---');
    console.log(result.fixedCode);
  }

  // Display stats
  const stats = fixer.getStats(cellId);
  console.log('\n=== Cell Stats ===');
  console.log(`Total attempts: ${stats.attempts}`);
  console.log(`Success rate: ${(stats.successRate * 100).toFixed(0)}%`);
  console.log(`Average confidence: ${(stats.avgConfidence * 100).toFixed(0)}%`);
}

demo();
```

---

## Deep Dive - Srcbook's Implementation

Let's examine how Srcbook implements the diagnostic fixing pipeline.

### 1. The fixDiagnostics Function

The core function in `packages/api/ai/generate.mts`:

```typescript
// From packages/api/ai/generate.mts (lines 227-244)

export async function fixDiagnostics(
  session: SessionType,
  cell: CodeCellType,
  diagnostics: string,
): Promise<string> {
  const model = await getModel();

  const systemPrompt = makeFixDiagnosticsSystemPrompt();
  const userPrompt = makeFixDiagnosticsUserPrompt(session, cell, diagnostics);

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
  });

  return result.text;
}
```

Key observations:

- Uses the same `getModel()` as other generation functions
- Returns raw text (no parsing needed)
- Diagnostics are passed as a string (already formatted)

### 2. User Prompt Construction

The user prompt builder in `generate.mts`:

```typescript
// From packages/api/ai/generate.mts (lines 86-109)

const makeFixDiagnosticsUserPrompt = (
  session: SessionType,
  cell: CodeCellType,
  diagnostics: string,
) => {
  const inlineSrcbook = encode(
    { cells: session.cells, language: session.language },
    { inline: true },
  );
  const cellSource = cell.source;
  const prompt = `==== BEGIN SRCBOOK ====
${inlineSrcbook}
==== END SRCBOOK ====

==== BEGIN CODE CELL ====
${cellSource}
==== END CODE CELL ====

==== BEGIN DIAGNOSTICS ====
${diagnostics}
==== END DIAGNOSTICS ====
`;
  return prompt;
};
```

### 3. WebSocket Handler

The WebSocket handler in `packages/api/server/ws.mts`:

```typescript
// From packages/api/server/ws.mts (lines 415-426)

async function handleFixDiagnostics(
  payload: AiFixDiagnosticsPayloadSchema,
  context: SessionsContextType,
) {
  const session = await findSession(context.params.sessionId);
  const cell = findCell(session, payload.cellId) as CodeCellType;

  const result = await fixDiagnostics(session, cell, payload.diagnostics);

  wss.broadcast(`session:${session.id}`, 'ai:generated', {
    cellId: payload.cellId,
    output: result,
  });
}
```

The flow:
1. Find the session and cell
2. Call fixDiagnostics with the cell and diagnostics
3. Broadcast the result to all connected clients

### 4. The Fix Prompt

From `packages/api/prompts/fix-cell-diagnostics.txt`:

```
You are tasked with suggesting a TypeScript diagnostics fix to a code block (or "cell") in a Srcbook.

A Srcbook is a TypeScript notebook which follows a markdown-compatible format.

The user is already working on an existing Srcbook, and the TypeScript linter has flagged an issue in one of the cells.

You will be given:
 * the entire Srcbook as useful context, surrounded with "==== BEGIN SRCBOOK ====" and "==== END SRCBOOK ====".
 * the specific code cell that needs to be fixed, surrounded with "==== BEGIN CODE CELL ====" and "==== END CODE CELL ====".
 * the diagnostics output from tsserver, surrounded with "==== BEGIN DIAGNOSTICS ====" and "==== END DIAGNOSTICS ====".

Your job is to fix the issues and suggest new code for the cell. Your response will be fed to a diffing algorithm against the original cell code, so you *have* to replace all of the code in the cell.
ONLY RETURN THE CODE. NO PREAMBLE, NO BACKTICKS, NO MARKDOWN, NO SUFFIX, ONLY THE TYPESCRIPT CODE.
```

### Prompt Engineering Tips

1. **Be Specific with Error Codes**: Include TS error codes (e.g., TS2322) so the AI knows exactly what type of error to fix.

2. **Provide Context**: The full srcbook context helps the AI understand available imports and types from other cells.

3. **Request Code-Only Output**: Explicitly state no markdown/explanations prevents parsing issues.

4. **Preserve Intent**: The prompt emphasizes fixing errors while maintaining the original code's intent.

5. **Handle Partial Fixes**: Sometimes AI can't fix all errors - the UI should allow retry or manual fixes.

---

## Interactive Exercise - Build Fix Quality Analyzer

Build a system to analyze fix quality and track which error types are hardest to fix automatically.

###### exercise.ts

```typescript
// Exercise: Build a Fix Quality Analyzer
//
// Challenge:
// 1. Track fix attempts and their outcomes
// 2. Calculate success rates by error code
// 3. Identify the "hardest" errors to fix
// 4. Suggest retry strategies based on error patterns

// =============================================================================
// Types (provided)
// =============================================================================

interface FixAttempt {
  cellId: string;
  timestamp: Date;
  errorCodes: number[];
  errorsFixed: number;
  errorsRemaining: number;
  confidence: number;
  fixedCode?: string;
}

interface ErrorCodeStats {
  code: number;
  description: string;
  attempts: number;
  successes: number;
  successRate: number;
}

interface RetryStrategy {
  errorCode: number;
  suggestion: string;
  priority: 'high' | 'medium' | 'low';
}

// =============================================================================
// Error Code Descriptions
// =============================================================================

const ERROR_DESCRIPTIONS: Record<number, string> = {
  2304: "Cannot find name",
  2322: "Type not assignable",
  2339: "Property does not exist",
  2345: "Argument type mismatch",
  2551: "Property typo with suggestion",
  2561: "Unknown property in object literal",
  2741: "Missing property in type",
  7006: "Parameter implicitly has 'any' type",
  1005: "Syntax: ';' expected",
  1109: "Expression expected",
};

// =============================================================================
// Fix Quality Analyzer - Implement This!
// =============================================================================

class FixQualityAnalyzer {
  private attempts: FixAttempt[] = [];

  /**
   * Record a fix attempt
   *
   * TODO: Implement this method
   * - Store the attempt in the attempts array
   * - Validate the attempt has required fields
   */
  recordAttempt(attempt: FixAttempt): void {
    // Implementation placeholder
    //
    // Hints:
    // - Check that errorCodes is not empty
    // - Ensure timestamp is a valid Date
    // - Add to this.attempts

    throw new Error('TODO: Implement recordAttempt()');
  }

  /**
   * Get success rate statistics for each error code
   *
   * TODO: Implement this method
   * - Group attempts by error codes
   * - Calculate success rate for each code
   * - Return sorted by success rate (ascending = hardest first)
   */
  getSuccessRateByErrorCode(): ErrorCodeStats[] {
    // Implementation placeholder
    //
    // Hints:
    // - For each error code in each attempt, track if it was fixed
    // - An error is "fixed" if errorsFixed >= 1 and that code was in errorCodes
    // - Use ERROR_DESCRIPTIONS for descriptions

    throw new Error('TODO: Implement getSuccessRateByErrorCode()');
  }

  /**
   * Get the hardest errors to fix automatically
   *
   * TODO: Implement this method
   * - Find errors with lowest success rates
   * - Return top N hardest errors
   */
  getHardestErrors(limit: number = 5): ErrorCodeStats[] {
    // Implementation placeholder
    //
    // Hints:
    // - Use getSuccessRateByErrorCode()
    // - Filter to those with at least 3 attempts (statistical significance)
    // - Sort by success rate ascending
    // - Return first 'limit' items

    throw new Error('TODO: Implement getHardestErrors()');
  }

  /**
   * Suggest retry strategies for a given error code
   *
   * TODO: Implement this method
   * - Based on historical data, suggest how to approach fixing
   * - Consider success rate and error type
   */
  suggestRetryStrategy(errorCode: number): RetryStrategy {
    // Implementation placeholder
    //
    // Hints:
    // - Get stats for this error code
    // - If success rate < 30%, suggest manual fix
    // - If success rate < 60%, suggest adding more context
    // - If success rate >= 60%, suggest retry with same approach

    throw new Error('TODO: Implement suggestRetryStrategy()');
  }

  /**
   * Get overall analytics summary
   */
  getSummary(): {
    totalAttempts: number;
    overallSuccessRate: number;
    mostCommonErrors: Array<{ code: number; count: number }>;
    averageConfidence: number;
  } {
    if (this.attempts.length === 0) {
      return {
        totalAttempts: 0,
        overallSuccessRate: 0,
        mostCommonErrors: [],
        averageConfidence: 0,
      };
    }

    // Count error occurrences
    const errorCounts = new Map<number, number>();
    for (const attempt of this.attempts) {
      for (const code of attempt.errorCodes) {
        errorCounts.set(code, (errorCounts.get(code) || 0) + 1);
      }
    }

    // Sort by count
    const mostCommon = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));

    // Calculate success rate
    const successes = this.attempts.filter(a => a.errorsRemaining === 0).length;
    const successRate = successes / this.attempts.length;

    // Calculate average confidence
    const avgConfidence = this.attempts.reduce((sum, a) => sum + a.confidence, 0) / this.attempts.length;

    return {
      totalAttempts: this.attempts.length,
      overallSuccessRate: successRate,
      mostCommonErrors: mostCommon,
      averageConfidence: avgConfidence,
    };
  }

  /**
   * Generate a text report
   */
  generateReport(): string {
    const summary = this.getSummary();

    let report = '';
    report += '='.repeat(50) + '\n';
    report += '  FIX QUALITY ANALYSIS REPORT\n';
    report += '='.repeat(50) + '\n\n';

    report += `Total Attempts: ${summary.totalAttempts}\n`;
    report += `Overall Success Rate: ${(summary.overallSuccessRate * 100).toFixed(1)}%\n`;
    report += `Average Confidence: ${(summary.averageConfidence * 100).toFixed(1)}%\n`;

    if (summary.mostCommonErrors.length > 0) {
      report += '\nMost Common Errors:\n';
      for (const { code, count } of summary.mostCommonErrors) {
        const desc = ERROR_DESCRIPTIONS[code] || 'Unknown';
        report += `  TS${code}: ${count}x - ${desc}\n`;
      }
    }

    return report;
  }
}

// =============================================================================
// Test Your Implementation
// =============================================================================

function testAnalyzer() {
  console.log('=== Fix Quality Analyzer Test ===\n');

  const analyzer = new FixQualityAnalyzer();

  // Sample fix attempts
  const sampleAttempts: FixAttempt[] = [
    {
      cellId: 'cell-1',
      timestamp: new Date('2026-01-10'),
      errorCodes: [2322, 2339],
      errorsFixed: 2,
      errorsRemaining: 0,
      confidence: 0.85,
    },
    {
      cellId: 'cell-2',
      timestamp: new Date('2026-01-11'),
      errorCodes: [2304, 7006],
      errorsFixed: 1,
      errorsRemaining: 1,
      confidence: 0.45,
    },
    {
      cellId: 'cell-3',
      timestamp: new Date('2026-01-12'),
      errorCodes: [2322, 2551],
      errorsFixed: 2,
      errorsRemaining: 0,
      confidence: 0.90,
    },
    {
      cellId: 'cell-4',
      timestamp: new Date('2026-01-13'),
      errorCodes: [2304, 2322],
      errorsFixed: 1,
      errorsRemaining: 1,
      confidence: 0.50,
    },
  ];

  try {
    // Test recordAttempt
    console.log('1. Recording attempts...');
    for (const attempt of sampleAttempts) {
      analyzer.recordAttempt(attempt);
    }
    console.log(`   Recorded ${sampleAttempts.length} attempts`);

    // Test getSuccessRateByErrorCode
    console.log('\n2. Success rates by error code:');
    const stats = analyzer.getSuccessRateByErrorCode();
    for (const stat of stats) {
      console.log(`   TS${stat.code}: ${(stat.successRate * 100).toFixed(0)}% (${stat.successes}/${stat.attempts})`);
    }

    // Test getHardestErrors
    console.log('\n3. Hardest errors to fix:');
    const hardest = analyzer.getHardestErrors(3);
    for (const error of hardest) {
      console.log(`   TS${error.code}: ${error.description} - ${(error.successRate * 100).toFixed(0)}% success`);
    }

    // Test suggestRetryStrategy
    console.log('\n4. Retry strategies:');
    for (const code of [2304, 2322, 2339]) {
      const strategy = analyzer.suggestRetryStrategy(code);
      console.log(`   TS${code}: [${strategy.priority}] ${strategy.suggestion}`);
    }

    // Generate report
    console.log('\n5. Full Report:');
    console.log(analyzer.generateReport());

    console.log('All tests passed!');

  } catch (error) {
    console.log(`\nTest incomplete: ${(error as Error).message}`);
    console.log('\nImplement the TODO methods to complete the exercise.');
  }
}

// Run test
// Uncomment after implementing the methods:
// testAnalyzer();

console.log('=== Fix Quality Analyzer Exercise ===\n');
console.log('Implement the following methods in FixQualityAnalyzer:');
console.log('  1. recordAttempt() - Store fix attempts');
console.log('  2. getSuccessRateByErrorCode() - Calculate success rates');
console.log('  3. getHardestErrors() - Find problematic error types');
console.log('  4. suggestRetryStrategy() - Generate fix suggestions');
console.log('\nThen uncomment testAnalyzer() to verify your implementation.');
```

---

## Source References

| File | Purpose |
|------|---------|
| `packages/api/ai/generate.mts` | `fixDiagnostics()` function - core fix logic |
| `packages/api/prompts/fix-cell-diagnostics.txt` | Fix prompt template - AI instructions |
| `packages/api/server/ws.mts` | WebSocket handler for fix requests (lines ~415-426) |
| `packages/api/srcmd.mts` | `encode()` function for session context |
| `packages/shared/src/schemas/tsserver.mts` | Diagnostic type definitions |

### Key Functions to Study

**In `generate.mts`:**
- `fixDiagnostics()` - Main fix function
- `makeFixDiagnosticsSystemPrompt()` - Load system prompt
- `makeFixDiagnosticsUserPrompt()` - Build user prompt with context

**In `ws.mts`:**
- `handleFixDiagnostics()` - WebSocket event handler
- Diagnostic event listeners (`onSemanticDiag`, `onSyntaxDiag`)

**In `srcmd.mts`:**
- `encode()` - Encode session to markdown for context

---

## Next Steps

Now that you understand AI diagnostic fixing, explore these related topics:

1. **TypeScript Diagnostics Srcbook** - Learn how errors are detected
   - File: `packages/api/srcbook/examples/internals/typescript-diagnostics.src.md`

2. **Code Generation Srcbook** - Understand the broader AI generation system
   - File: `packages/api/srcbook/examples/internals/code-generation.src.md`

3. **AI Integration Srcbook** - How Srcbook connects to AI providers
   - File: `packages/api/srcbook/examples/internals/ai-integration.src.md`

4. **WebSocket Protocol Srcbook** - How fixes are broadcast to clients
   - File: `packages/api/srcbook/examples/internals/websocket-protocol.src.md`

---

## Summary

### Key Takeaways

1. **The Fix Pipeline**
   - Detect: tsserver emits diagnostics
   - Request: User triggers fix via UI
   - Generate: AI receives code + diagnostics + context
   - Apply: Fixed code replaces cell source

2. **Context is Critical**
   - Full session encoded in prompt
   - Other cells provide import context
   - Package dependencies included
   - Error codes specify exact issues

3. **Output is Raw Code**
   - No markdown, no explanations
   - Direct replacement of cell source
   - Simpler than cell generation parsing
   - Faster processing

4. **Confidence and Iteration**
   - Not all fixes succeed on first try
   - Some error types are harder than others
   - Track success rates for improvement
   - Allow retry with user guidance

### Fix Pipeline Summary

```
User Clicks "Fix"
       |
       v
+-------------------+
| Collect Context   |
| - Session cells   |
| - Diagnostics     |
| - Error codes     |
+-------------------+
       |
       v
+-------------------+
| Build Prompt      |
| - System: rules   |
| - User: context   |
+-------------------+
       |
       v
+-------------------+
| Call AI Provider  |
| - Via Vercel SDK  |
| - Raw code output |
+-------------------+
       |
       v
+-------------------+
| Apply Fix         |
| - Replace source  |
| - Request diags   |
| - Broadcast       |
+-------------------+
       |
       v
Errors Resolved?
```

You now understand how Srcbook uses AI to fix TypeScript errors automatically. This knowledge enables you to debug fix issues, improve fix quality through prompt engineering, and contribute to the diagnostic fixing pipeline.
