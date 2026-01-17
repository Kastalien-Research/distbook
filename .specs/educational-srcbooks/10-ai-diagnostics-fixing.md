# AI Diagnostics Fixing - Implementation Specification

**Version:** 1.0
**Date:** 2026-01-14
**Status:** Implementation-Ready
**Output:** `packages/api/srcbook/examples/internals/ai-diagnostics-fixing.src.md`
**Dependencies:** Code Generation Srcbook, TypeScript Diagnostics Srcbook

---

## 1. Overview

This specification defines the implementation of an educational Srcbook that explains how Srcbook uses AI to automatically fix TypeScript errors and warnings.

### Learning Objectives

1. Understand the diagnostics-to-AI pipeline
2. Learn how context is provided to the AI model
3. Comprehend the fix application process
4. Know how to improve fix quality

---

## 2. File Structure

### 2.1 Srcbook Metadata

```markdown
<!-- srcbook:{"language":"typescript"} -->
```

### 2.2 Required Sections

| Section | Type | Purpose |
|---------|------|---------|
| Title | Title Cell | "AI Diagnostics Fixing - Automated Error Resolution" |
| package.json | Package Cell | AI SDK and Zod dependencies |
| Introduction | Markdown | Context and objectives |
| Key Concepts | Markdown | Fix pipeline diagram |
| Simple Demo | Code | Basic error fixing |
| Explanation | Markdown | Prompt engineering for fixes |
| Advanced Demo | Code | Full fix system |
| Deep Dive | Markdown | Srcbook's implementation |
| Interactive Exercise | Code | Build fix ranking system |
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

**What is AI Diagnostics Fixing?**
- Automatic resolution of TypeScript errors using AI
- Combines tsserver diagnostics with AI code understanding
- Provides one-click fixes for type errors, missing imports, etc.
- Uses specialized prompts optimized for error correction

**Why does it matter?**
- Understanding enables improving fix quality
- Necessary for building intelligent error handling
- Foundation for AI-assisted development workflows

### 3.3 Key Concepts - Fix Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Fix Pipeline                           │
│                                                              │
│  1. Detect Errors                                            │
│     ┌───────────────────────────────────────────────────┐   │
│     │ tsserver emits semanticDiag/syntaxDiag events     │   │
│     │ Errors collected per cell with positions          │   │
│     └────────────────────┬──────────────────────────────┘   │
│                          ▼                                   │
│  2. User Requests Fix                                        │
│     ┌───────────────────────────────────────────────────┐   │
│     │ UI shows "Fix with AI" button on error hover      │   │
│     │ Click triggers fix request for specific cell      │   │
│     └────────────────────┬──────────────────────────────┘   │
│                          ▼                                   │
│  3. Build Context                                            │
│     ┌───────────────────────────────────────────────────┐   │
│     │ Gather: cell code + diagnostics + session context │   │
│     │ Include: other cells for import resolution        │   │
│     └────────────────────┬──────────────────────────────┘   │
│                          ▼                                   │
│  4. AI Generation                                            │
│     ┌───────────────────────────────────────────────────┐   │
│     │ System: fix-cell-diagnostics.txt prompt           │   │
│     │ User: code + formatted diagnostic messages        │   │
│     │ Output: fixed code (code only, no markdown)       │   │
│     └────────────────────┬──────────────────────────────┘   │
│                          ▼                                   │
│  5. Apply Fix                                                │
│     ┌───────────────────────────────────────────────────┐   │
│     │ Replace cell source with AI-generated code        │   │
│     │ Trigger tsserver update → new diagnostics         │   │
│     │ Verify errors resolved                            │   │
│     └───────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Simple Demo

**Filename:** `simple-fix.ts`

```typescript
// Demonstrate the error fixing process

interface Diagnostic {
  line: number;
  column: number;
  code: number;
  message: string;
  category: 'error' | 'warning' | 'suggestion';
}

// Sample code with errors
const codeWithErrors = `
interface User {
  id: string;
  name: string;
  age: number;
}

function greetUser(user: User) {
  // Error 1: Property 'nam' does not exist
  console.log("Hello, " + user.nam);

  // Error 2: Type 'string' is not assignable to type 'number'
  const doubleAge: number = user.age + " years";

  // Error 3: Missing return statement
  return;
}

const user: User = {
  id: "1",
  name: "Alice",
  // Error 4: Property 'age' is missing
};

greetUser(user);
`;

// Diagnostics from tsserver
const diagnostics: Diagnostic[] = [
  {
    line: 10,
    column: 36,
    code: 2551,
    message: "Property 'nam' does not exist on type 'User'. Did you mean 'name'?",
    category: 'error',
  },
  {
    line: 13,
    column: 9,
    code: 2322,
    message: "Type 'string' is not assignable to type 'number'.",
    category: 'error',
  },
  {
    line: 19,
    column: 3,
    code: 2741,
    message: "Property 'age' is missing in type '{ id: string; name: string; }' but required in type 'User'.",
    category: 'error',
  },
];

// Format diagnostics for AI prompt
function formatDiagnostics(diags: Diagnostic[]): string {
  return diags.map(d =>
    `Line ${d.line}, Column ${d.column}: TS${d.code} - ${d.message}`
  ).join('\n');
}

// Build the fix prompt
function buildFixPrompt(code: string, diags: Diagnostic[]): string {
  return `
Fix the following TypeScript code to resolve all errors.

CODE:
\`\`\`typescript
${code}
\`\`\`

ERRORS:
${formatDiagnostics(diags)}

OUTPUT ONLY THE FIXED CODE, NO EXPLANATIONS.
`;
}

// Simulate AI-generated fix
const fixedCode = `
interface User {
  id: string;
  name: string;
  age: number;
}

function greetUser(user: User) {
  // Fixed: Changed 'nam' to 'name'
  console.log("Hello, " + user.name);

  // Fixed: Proper number operation
  const doubleAge: number = user.age * 2;

  return;
}

const user: User = {
  id: "1",
  name: "Alice",
  age: 30, // Fixed: Added missing 'age' property
};

greetUser(user);
`;

// Demo
console.log('=== AI Diagnostics Fixing Demo ===\n');

console.log('📋 Original Code with Errors:');
console.log('─'.repeat(50));
console.log(codeWithErrors);

console.log('\n🔍 Detected Diagnostics:');
diagnostics.forEach(d => {
  console.log(`  ❌ Line ${d.line}: TS${d.code} - ${d.message.slice(0, 60)}...`);
});

console.log('\n📤 Fix Prompt (excerpt):');
console.log('─'.repeat(50));
const prompt = buildFixPrompt(codeWithErrors, diagnostics);
console.log(prompt.slice(0, 500) + '...');

console.log('\n✅ Fixed Code:');
console.log('─'.repeat(50));
console.log(fixedCode);
```

### 3.5 Advanced Demo

**Filename:** `fix-system.ts`

```typescript
// Full diagnostics fixing system

import { z } from 'zod';

// Diagnostic schema
const DiagnosticSchema = z.object({
  start: z.object({
    line: z.number(),
    offset: z.number(),
  }),
  end: z.object({
    line: z.number(),
    offset: z.number(),
  }),
  text: z.string(),
  code: z.number(),
  category: z.enum(['error', 'warning', 'suggestion']),
});

type Diagnostic = z.infer<typeof DiagnosticSchema>;

// Session context for better fixes
interface SessionContext {
  language: 'typescript' | 'javascript';
  otherCells: Array<{
    filename: string;
    source: string;
  }>;
  packages: Record<string, string>;
}

// Fix result
interface FixResult {
  success: boolean;
  fixedCode?: string;
  diagnosticsFixed: number;
  remainingDiagnostics: Diagnostic[];
  confidence: number;
}

// The fix-cell-diagnostics prompt (simplified)
const FIX_PROMPT_TEMPLATE = `
You are a TypeScript expert fixing code errors.

RULES:
1. Fix ALL errors in the code
2. Preserve the original intent and structure
3. Do not add unnecessary changes
4. Output ONLY the fixed code, no explanations
5. Do not wrap in markdown code blocks

CONTEXT:
Language: {language}
Available imports: {imports}
Available packages: {packages}

CODE TO FIX:
{code}

ERRORS TO FIX:
{errors}
`;

class DiagnosticsFixer {
  constructor(private context: SessionContext) {}

  // Build the system prompt
  private buildSystemPrompt(): string {
    return `You are an expert TypeScript developer. Your task is to fix code errors while preserving the original intent. Output only the corrected code.`;
  }

  // Build the user prompt with context
  private buildUserPrompt(code: string, diagnostics: Diagnostic[]): string {
    const imports = this.context.otherCells
      .map(c => `import { ... } from './${c.filename}'`)
      .join('\n');

    const packages = Object.keys(this.context.packages).join(', ');

    const errors = diagnostics
      .map(d => `- Line ${d.start.line}: TS${d.code} - ${d.text}`)
      .join('\n');

    return FIX_PROMPT_TEMPLATE
      .replace('{language}', this.context.language)
      .replace('{imports}', imports || '(none)')
      .replace('{packages}', packages || '(none)')
      .replace('{code}', code)
      .replace('{errors}', errors);
  }

  // Simulate AI call
  private async callAI(systemPrompt: string, userPrompt: string): Promise<string> {
    console.log('🤖 Calling AI for fix...');
    console.log(`   Diagnostics to fix: ${(userPrompt.match(/- Line/g) || []).length}`);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 300));

    // Return mock fixed code
    return `
interface User {
  id: string;
  name: string;
  email: string;
}

function processUser(user: User): string {
  const greeting = \`Hello, \${user.name}!\`;
  console.log(greeting);
  return greeting;
}

const user: User = {
  id: "1",
  name: "Alice",
  email: "alice@example.com"
};

const result = processUser(user);
console.log("Result:", result);
`.trim();
  }

  // Validate the fix resolved errors
  private validateFix(
    originalDiagnostics: Diagnostic[],
    newDiagnostics: Diagnostic[]
  ): { fixed: number; remaining: Diagnostic[] } {
    // Count how many original errors are gone
    const fixed = originalDiagnostics.filter(orig =>
      !newDiagnostics.some(d => d.code === orig.code && d.start.line === orig.start.line)
    ).length;

    return {
      fixed,
      remaining: newDiagnostics.filter(d => d.category === 'error'),
    };
  }

  // Calculate fix confidence
  private calculateConfidence(
    originalCount: number,
    fixedCount: number,
    remainingCount: number
  ): number {
    if (originalCount === 0) return 1;
    if (remainingCount > originalCount) return 0; // Made it worse
    return fixedCount / originalCount;
  }

  // Main fix method
  async fix(code: string, diagnostics: Diagnostic[]): Promise<FixResult> {
    // Filter to only errors (not warnings/suggestions)
    const errors = diagnostics.filter(d => d.category === 'error');

    if (errors.length === 0) {
      return {
        success: true,
        fixedCode: code,
        diagnosticsFixed: 0,
        remainingDiagnostics: [],
        confidence: 1,
      };
    }

    console.log(`\n🔧 Attempting to fix ${errors.length} error(s)...`);

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(code, errors);

    const fixedCode = await this.callAI(systemPrompt, userPrompt);

    // In real implementation, we'd run tsserver on the fixed code
    // to get new diagnostics. Here we simulate success.
    const newDiagnostics: Diagnostic[] = []; // Simulate all fixed

    const validation = this.validateFix(errors, newDiagnostics);
    const confidence = this.calculateConfidence(
      errors.length,
      validation.fixed,
      validation.remaining.length
    );

    return {
      success: validation.remaining.length === 0,
      fixedCode,
      diagnosticsFixed: validation.fixed,
      remainingDiagnostics: validation.remaining,
      confidence,
    };
  }
}

// Demo
async function demo() {
  console.log('=== AI Diagnostics Fixing System Demo ===\n');

  const context: SessionContext = {
    language: 'typescript',
    otherCells: [
      { filename: 'types.ts', source: 'export interface Config { ... }' },
    ],
    packages: {
      typescript: 'latest',
      zod: '^3.23.8',
    },
  };

  const fixer = new DiagnosticsFixer(context);

  // Code with multiple errors
  const brokenCode = `
interface User {
  id: string;
  name: string;
  email: string;
}

function processUser(user: User) {
  // Error: 'nam' doesn't exist
  const greeting = "Hello, " + user.nam;
  console.log(greeting);
  // Error: no return
}

const user: User = {
  id: "1",
  name: "Alice"
  // Error: missing email
};

processUser(user);
`;

  const diagnostics: Diagnostic[] = [
    {
      start: { line: 9, offset: 38 },
      end: { line: 9, offset: 41 },
      text: "Property 'nam' does not exist on type 'User'. Did you mean 'name'?",
      code: 2551,
      category: 'error',
    },
    {
      start: { line: 14, offset: 3 },
      end: { line: 17, offset: 2 },
      text: "Property 'email' is missing in type '{ id: string; name: string; }'",
      code: 2741,
      category: 'error',
    },
  ];

  console.log('📋 Original Code:');
  console.log('─'.repeat(50));
  console.log(brokenCode.trim());

  console.log('\n❌ Detected Errors:');
  diagnostics.forEach(d => {
    console.log(`   Line ${d.start.line}: TS${d.code}`);
    console.log(`   ${d.text}`);
  });

  const result = await fixer.fix(brokenCode, diagnostics);

  console.log('\n\n=== Fix Result ===');
  console.log(`Success: ${result.success ? '✅' : '❌'}`);
  console.log(`Diagnostics Fixed: ${result.diagnosticsFixed}`);
  console.log(`Remaining Errors: ${result.remainingDiagnostics.length}`);
  console.log(`Confidence: ${(result.confidence * 100).toFixed(0)}%`);

  if (result.fixedCode) {
    console.log('\n✅ Fixed Code:');
    console.log('─'.repeat(50));
    console.log(result.fixedCode);
  }
}

demo();
```

### 3.6 Deep Dive Content

**Source File References:**

1. **`packages/api/ai/generate.mts`** - `fixDiagnostics()` function
   - Lines 120-160 (approximate)
   - Builds context from session
   - Calls AI with fix prompt

2. **`packages/api/prompts/fix-cell-diagnostics.txt`** - Fix prompt
   - Specialized for error correction
   - Includes context rules
   - Output format specification

3. **`packages/api/server/http.mts`** - HTTP endpoint
   - POST `/sessions/:id/cells/:cellId/fix`
   - Triggers fix pipeline

**Prompt Engineering Tips:**

1. **Be Specific**: Include exact error codes and messages
2. **Provide Context**: Other cells help with import resolution
3. **Output Format**: Request code-only output to simplify parsing
4. **Preserve Intent**: Emphasize minimal changes
5. **Handle Edge Cases**: Consider partial fixes acceptable

### 3.7 Interactive Exercise

```typescript
// Exercise: Build a Fix Quality Analyzer
//
// Challenge:
// 1. Analyze fix success rates by error type
// 2. Implement fix retry with different strategies
// 3. Track which errors are hardest to fix
// 4. Build a confidence scoring system

interface FixAttempt {
  errorCode: number;
  originalCode: string;
  fixedCode: string;
  success: boolean;
  retries: number;
}

class FixQualityAnalyzer {
  private attempts: FixAttempt[] = [];

  recordAttempt(attempt: FixAttempt): void {
    // TODO: Store attempt for analysis
  }

  getSuccessRateByErrorCode(): Map<number, number> {
    // TODO: Calculate success rate per error code
    throw new Error('Not implemented');
  }

  getHardestErrors(limit: number): Array<{ code: number; successRate: number }> {
    // TODO: Return errors with lowest success rates
    throw new Error('Not implemented');
  }

  suggestRetryStrategy(errorCode: number): 'more-context' | 'simplify' | 'give-up' {
    // TODO: Based on history, suggest retry approach
    throw new Error('Not implemented');
  }
}

// Test your implementation:
// const analyzer = new FixQualityAnalyzer();
// analyzer.recordAttempt({ errorCode: 2322, success: true, ... });
// console.log(analyzer.getSuccessRateByErrorCode());
// console.log(analyzer.getHardestErrors(5));
```

### 3.8 Source References

| File | Purpose |
|------|---------|
| `packages/api/ai/generate.mts` | `fixDiagnostics()` function |
| `packages/api/prompts/fix-cell-diagnostics.txt` | Fix prompt template |
| `packages/api/server/http.mts` | Fix HTTP endpoint |
| `packages/api/server/ws.mts` | Diagnostic event handling |

---

## 4. Acceptance Criteria

- [ ] Fix pipeline clearly explained
- [ ] Prompt engineering documented
- [ ] Code examples demonstrate full flow
- [ ] Confidence scoring explained
- [ ] Exercise is achievable

---

## 5. Implementation Notes

### File Location
```
packages/api/srcbook/examples/internals/ai-diagnostics-fixing.src.md
```

### Validation
- Test with various error types
- Verify fix quality and confidence scoring
