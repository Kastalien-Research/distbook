<!-- srcbook:{"language":"typescript"} -->

# Code Generation - AI-Powered Development

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

This srcbook explores how Srcbook uses AI to generate code cells, entire srcbooks, and applications. Code generation is the core feature that enables AI-assisted development workflows within Srcbook.

### What is Code Generation?

Srcbook's code generation system provides:

- **Cell Generation** - Create new code cells from natural language descriptions
- **Srcbook Generation** - Generate complete tutorial notebooks on any topic
- **App Generation** - Build React applications with AI assistance
- **Cell Editing** - Modify existing code based on instructions
- **Diagnostic Fixes** - Auto-repair code based on TypeScript errors

### Why does it matter?

Understanding code generation enables you to:

1. **Extend AI capabilities** - Add new generation modes or customize prompts
2. **Improve quality** - Fine-tune prompts for better output
3. **Debug issues** - Troubleshoot when generation doesn't work as expected
4. **Build features** - Leverage generation in your own tools

### Learning Objectives

By the end of this srcbook, you will:

1. Understand the different generation modes (cell, srcbook, app)
2. Learn the prompt engineering patterns used
3. Comprehend response parsing and validation
4. Know how to customize generation behavior

---

## Key Concepts - Generation Modes

Srcbook supports four main code generation modes, each with specialized prompts and parsers:

```
+-------------------------------------------------------------+
|                  Code Generation Modes                       |
|                                                              |
|  1. CELL GENERATION                                          |
|     +-------------------------------------------------------+|
|     | Input: Natural language query + session context       ||
|     | Output: One or more code cells                        ||
|     | Prompt: cell-generator-{js|ts}.txt                    ||
|     | Parser: decodeCells() - extracts cell structure       ||
|     +-------------------------------------------------------+|
|                                                              |
|  2. SRCBOOK GENERATION                                       |
|     +-------------------------------------------------------+|
|     | Input: Topic/query description                        ||
|     | Output: Complete srcbook markdown                     ||
|     | Prompt: srcbook-generator.txt                         ||
|     | Parser: Direct markdown output                        ||
|     +-------------------------------------------------------+|
|                                                              |
|  3. APP GENERATION                                           |
|     +-------------------------------------------------------+|
|     | Input: App description + existing files (optional)    ||
|     | Output: XML plan with file changes                    ||
|     | Prompt: app-builder.txt / app-editor.txt              ||
|     | Parser: parsePlan() / streamParsePlan()               ||
|     +-------------------------------------------------------+|
|                                                              |
|  4. CELL EDITING                                             |
|     +-------------------------------------------------------+|
|     | Input: Existing code + edit instructions              ||
|     | Output: Modified code                                 ||
|     | Prompt: code-updater-{js|ts}.txt                      ||
|     | Parser: Direct code output                            ||
|     +-------------------------------------------------------+|
|                                                              |
+-------------------------------------------------------------+
```

### Generation Flow

The typical generation flow follows these steps:

```mermaid
flowchart LR
    A[User Query] --> B[Build Prompt]
    B --> C[Call AI Model]
    C --> D[Parse Response]
    D --> E[Validate Output]
    E --> F[Apply to Session]
```

1. **Build Prompt** - Construct system and user prompts with context
2. **Call AI Model** - Send to configured AI provider via Vercel AI SDK
3. **Parse Response** - Extract structured data from AI output
4. **Validate Output** - Ensure output matches expected format
5. **Apply to Session** - Insert cells or apply changes

---

## Simple Demo - Cell Generation Parsing

Let's explore how Srcbook generates code cells and parses the AI response.

###### simple-generation.ts

```typescript
// Demonstrate code generation prompt structure and parsing
// This mirrors the actual implementation in packages/api/ai/generate.mts

// =============================================================================
// System Prompt Structure
// =============================================================================

// The system prompt provides context about Srcbook's format and expectations
// This is a simplified version of cell-generator-typescript.txt
const systemPrompt = `
You are a TypeScript code generator for Srcbook, an interactive coding notebook.

CONTEXT:
- User is working in a TypeScript srcbook
- Each code cell is a separate file that can import from others
- Dependencies are managed via package.json cell

EXISTING CELLS:
{existingCells}

TASK:
Generate code cells based on the user's request.

OUTPUT FORMAT:
For each cell, use this exact format:

###### filename.ts
\`\`\`typescript
// Your TypeScript code here
\`\`\`

GUIDELINES:
- Write clean, typed TypeScript
- Add helpful comments
- Use ES modules (import/export)
- Handle errors appropriately
- Filenames must be unique
`;

// =============================================================================
// User Prompt Template
// =============================================================================

// The user prompt includes the query and existing session context
function buildUserPrompt(query: string, existingCode: string): string {
  return `==== BEGIN SRCBOOK ====
${existingCode || '(empty session)'}
==== END SRCBOOK ====

==== BEGIN USER REQUEST ====
${query}
==== END USER REQUEST ====`;
}

// =============================================================================
// Response Parser (simplified from srcmd/decoding.mts)
// =============================================================================

interface GeneratedCell {
  filename: string;
  source: string;
  language: 'typescript' | 'javascript';
}

// The actual parser uses the 'marked' library to parse markdown
// This is a simplified regex-based version for demonstration
function parseCellResponse(response: string): GeneratedCell[] {
  const cells: GeneratedCell[] = [];

  // Match the pattern: ###### filename.ts followed by ```typescript code ```
  // This regex captures the filename and code block
  const cellPattern = /######\s+([^\n]+\.(?:ts|js))\s*\n+```(?:typescript|javascript)\s*\n([\s\S]*?)```/g;

  let match;
  while ((match = cellPattern.exec(response)) !== null) {
    const filename = match[1].trim();
    const source = match[2].trim();
    const language = filename.endsWith('.ts') ? 'typescript' : 'javascript';

    cells.push({ filename, source, language });
  }

  return cells;
}

// =============================================================================
// Demo: Parse a Sample AI Response
// =============================================================================

const sampleAIResponse = `
I'll create two cells for you: one for the data types and one for the main logic.

###### types.ts

\`\`\`typescript
// User data types for the application
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
}
\`\`\`

###### user-service.ts

\`\`\`typescript
import { User, CreateUserInput } from './types.ts';

// Simple in-memory user storage
const users: Map<string, User> = new Map();

export function createUser(input: CreateUserInput): User {
  const user: User = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    createdAt: new Date(),
  };

  users.set(user.id, user);
  return user;
}

export function getUser(id: string): User | undefined {
  return users.get(id);
}

export function listUsers(): User[] {
  return Array.from(users.values());
}

// Demo usage
const user = createUser({ name: 'Alice', email: 'alice@example.com' });
console.log('Created user:', user);
\`\`\`
`;

console.log('=== Code Generation Parsing Demo ===\n');

// Parse the AI response
const parsedCells = parseCellResponse(sampleAIResponse);

console.log(`Parsed ${parsedCells.length} cells from AI response:\n`);

parsedCells.forEach((cell, index) => {
  console.log(`Cell ${index + 1}: ${cell.filename}`);
  console.log(`  Language: ${cell.language}`);
  console.log(`  Lines: ${cell.source.split('\n').length}`);
  console.log(`  Preview: ${cell.source.slice(0, 60).replace(/\n/g, ' ')}...`);
  console.log('');
});

// Show the user prompt structure
console.log('=== User Prompt Structure ===');
const userPrompt = buildUserPrompt(
  'Create a user management system with types and CRUD operations',
  '// No existing code yet'
);
console.log(userPrompt.slice(0, 300) + '...\n');
```

---

## Prompt Engineering Patterns

Srcbook uses several prompt engineering patterns to ensure high-quality code generation:

### 1. Context Injection

The entire srcbook context (all existing cells) is included in the prompt so the AI understands:
- Available imports from other cells
- Already defined types and functions
- Package dependencies
- The overall project structure

### 2. Structured Output Format

Each generation type specifies an exact output format:
- **Cell generation**: Markdown with h6 filename + code block
- **App generation**: XML plan with file and command actions
- **Srcbook generation**: Complete .src.md format

### 3. Position Markers

For cell generation, a placeholder marker indicates where new cells should be inserted:

```
==== INTRODUCE CELL HERE ====
```

This helps the AI understand the context before and after the insertion point.

### 4. Few-Shot Examples

The prompts include complete examples of properly formatted output, teaching the AI the expected structure through demonstration.

---

## Advanced Demo - Full Generation Pipeline

This demo shows the complete generation pipeline with validation and error handling.

###### generation-pipeline.ts

```typescript
// Full code generation pipeline (mirrors packages/api/ai/generate.mts)

import { z } from 'zod';

// =============================================================================
// Types and Schemas
// =============================================================================

// Cell validation schema
const GeneratedCellSchema = z.object({
  type: z.literal('code'),
  filename: z.string().min(1),
  source: z.string(),
  language: z.enum(['typescript', 'javascript']),
});

type GeneratedCell = z.infer<typeof GeneratedCellSchema>;

// Generation context includes session state
interface GenerationContext {
  sessionId: string;
  language: 'javascript' | 'typescript';
  existingCells: Array<{
    filename: string;
    source: string;
  }>;
  packages: Record<string, string>;
}

// Generation result with detailed status
interface GenerationResult {
  success: boolean;
  cells?: GeneratedCell[];
  errors?: string[];
  tokensUsed?: number;
}

// =============================================================================
// Prompt Templates (simplified from packages/api/prompts/*.txt)
// =============================================================================

const promptTemplates = {
  cellGenerator: {
    typescript: `You are generating TypeScript code cells for Srcbook.
Each cell is a separate .ts file that can import from other cells.
Use ES modules (import/export) syntax.
Output format: ###### filename.ts followed by \`\`\`typescript code block.`,

    javascript: `You are generating JavaScript code cells for Srcbook.
Each cell is a separate .js file that can import from other cells.
Use ES modules (import/export) syntax.
Output format: ###### filename.js followed by \`\`\`javascript code block.`,
  },

  codeUpdater: {
    typescript: `You are editing existing TypeScript code.
Apply the requested changes while preserving the overall structure.
Output ONLY the modified code, no explanations.`,

    javascript: `You are editing existing JavaScript code.
Apply the requested changes while preserving the overall structure.
Output ONLY the modified code, no explanations.`,
  },
};

// =============================================================================
// Code Generator Class
// =============================================================================

class CodeGenerator {
  constructor(private context: GenerationContext) {}

  // Build the complete system prompt with context
  private buildSystemPrompt(): string {
    const basePrompt = promptTemplates.cellGenerator[this.context.language];

    // Include existing cells for context
    const existingCellsContext = this.context.existingCells
      .map(cell => `File: ${cell.filename}\n${cell.source}`)
      .join('\n\n---\n\n');

    // Include available packages
    const packagesContext = Object.entries(this.context.packages)
      .map(([name, version]) => `- ${name}@${version}`)
      .join('\n');

    return `${basePrompt}

EXISTING CELLS IN SESSION:
${existingCellsContext || '(none)'}

AVAILABLE PACKAGES:
${packagesContext || '(none)'}

RULES:
1. Generate valid ${this.context.language} code
2. Use ES module syntax (import/export)
3. Include type annotations for TypeScript
4. Add helpful comments explaining the code
5. Handle potential errors with try/catch
6. Each filename must be unique`;
  }

  // Build the user prompt with query
  private buildUserPrompt(query: string): string {
    return `Generate code cells for the following request:

${query}

Remember to use the exact output format specified.`;
  }

  // Parse AI response into cell structures
  private parseResponse(response: string): GeneratedCell[] {
    const cells: GeneratedCell[] = [];
    const ext = this.context.language === 'typescript' ? 'ts' : 'js';
    const lang = this.context.language;

    // Pattern: ###### filename followed by code block
    const pattern = new RegExp(
      `######\\s+([^\\n]+\\.${ext})\\s*\\n+\`\`\`${lang}\\s*\\n([\\s\\S]*?)\`\`\``,
      'g'
    );

    let match;
    while ((match = pattern.exec(response)) !== null) {
      const filename = match[1].trim();
      const source = match[2].trim();

      cells.push({
        type: 'code',
        filename,
        source,
        language: lang,
      });
    }

    return cells;
  }

  // Validate parsed cells
  private validateCells(cells: GeneratedCell[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const seenFilenames = new Set<string>();

    for (const cell of cells) {
      // Validate against schema
      const result = GeneratedCellSchema.safeParse(cell);
      if (!result.success) {
        errors.push(`Invalid cell ${cell.filename}: ${result.error.message}`);
        continue;
      }

      // Check for duplicate filenames
      if (seenFilenames.has(cell.filename)) {
        errors.push(`Duplicate filename: ${cell.filename}`);
      }
      seenFilenames.add(cell.filename);

      // Check filename matches language
      const expectedExt = this.context.language === 'typescript' ? '.ts' : '.js';
      if (!cell.filename.endsWith(expectedExt)) {
        errors.push(`Filename ${cell.filename} should end with ${expectedExt}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Simulate AI call (in real code, this uses Vercel AI SDK)
  private async callAI(systemPrompt: string, userPrompt: string): Promise<string> {
    console.log('Calling AI model...');
    console.log(`  System prompt: ${systemPrompt.length} characters`);
    console.log(`  User prompt: ${userPrompt.length} characters`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Return simulated response
    return `
I'll create array utility functions for you.

###### array-utils.ts

\`\`\`typescript
/**
 * Array utility functions
 * Provides common array operations with TypeScript generics
 */

/**
 * Remove duplicate values from an array
 */
export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/**
 * Group array items by a key
 */
export function groupBy<T, K extends keyof T>(
  arr: T[],
  key: K
): Map<T[K], T[]> {
  const map = new Map<T[K], T[]>();

  for (const item of arr) {
    const groupKey = item[key];
    const group = map.get(groupKey) || [];
    group.push(item);
    map.set(groupKey, group);
  }

  return map;
}

/**
 * Split array into chunks of specified size
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) throw new Error('Chunk size must be positive');

  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Demo usage
const numbers = [1, 2, 2, 3, 3, 3, 4];
console.log('Unique:', unique(numbers));

const people = [
  { name: 'Alice', dept: 'Engineering' },
  { name: 'Bob', dept: 'Sales' },
  { name: 'Carol', dept: 'Engineering' },
];
console.log('By department:', groupBy(people, 'dept'));

console.log('Chunked:', chunk([1, 2, 3, 4, 5, 6, 7], 3));
\`\`\`
`;
  }

  // Main generation method
  async generate(query: string): Promise<GenerationResult> {
    try {
      // 1. Build prompts
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(query);

      // 2. Call AI
      const response = await this.callAI(systemPrompt, userPrompt);

      // 3. Parse response
      const cells = this.parseResponse(response);

      if (cells.length === 0) {
        return {
          success: false,
          errors: ['No valid cells found in AI response'],
        };
      }

      // 4. Validate cells
      const validation = this.validateCells(cells);

      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // 5. Return success
      return {
        success: true,
        cells,
        tokensUsed: response.length, // Simplified approximation
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }
}

// =============================================================================
// Demo Execution
// =============================================================================

async function demo() {
  console.log('=== Code Generation Pipeline Demo ===\n');

  // Create generation context
  const context: GenerationContext = {
    sessionId: 'demo-session-123',
    language: 'typescript',
    existingCells: [
      {
        filename: 'types.ts',
        source: 'export interface User { id: string; name: string; }',
      },
    ],
    packages: {
      typescript: 'latest',
      zod: '^3.23.8',
    },
  };

  // Create generator
  const generator = new CodeGenerator(context);

  // Run generation
  const result = await generator.generate('Create array utility functions');

  console.log('\n=== Generation Result ===');
  console.log(`Success: ${result.success}`);
  console.log(`Tokens used: ${result.tokensUsed || 'N/A'}`);

  if (result.cells) {
    console.log(`\nGenerated ${result.cells.length} cell(s):\n`);

    for (const cell of result.cells) {
      console.log(`--- ${cell.filename} ---`);
      console.log(cell.source);
      console.log('');
    }
  }

  if (result.errors && result.errors.length > 0) {
    console.log('\nErrors:');
    result.errors.forEach(err => console.log(`  - ${err}`));
  }
}

demo();
```

---

## Deep Dive - Srcbook's Implementation

Let's examine the key source files that implement code generation in Srcbook.

### 1. packages/api/ai/generate.mts

This is the main generation module with these key functions:

| Function | Purpose |
|----------|---------|
| `generateCells()` | Generate new code cells from a query |
| `generateCellEdit()` | Modify existing cell code |
| `generateSrcbook()` | Create complete srcbook on a topic |
| `generateApp()` | Generate app files |
| `streamEditApp()` | Stream app edits in real-time |
| `fixDiagnostics()` | Auto-fix TypeScript errors |

**Key Pattern - Context Encoding:**

```typescript
// The entire srcbook is encoded into the prompt
const inlineSrcbook = encode(
  { cells: session.cells, language: session.language },
  { inline: true }
);
```

### 2. packages/api/prompts/*.txt

Prompt template files for each generation mode:

| File | Purpose |
|------|---------|
| `cell-generator-typescript.txt` | TypeScript cell generation |
| `cell-generator-javascript.txt` | JavaScript cell generation |
| `code-updater-typescript.txt` | TypeScript cell editing |
| `code-updater-javascript.txt` | JavaScript cell editing |
| `srcbook-generator.txt` | Complete srcbook generation |
| `app-builder.txt` | New app generation |
| `app-editor.txt` | App editing/modification |
| `fix-cell-diagnostics.txt` | Auto-fix TypeScript errors |

### 3. packages/api/srcmd/decoding.mts

The parser that extracts cells from markdown:

| Function | Purpose |
|----------|---------|
| `decode()` | Parse complete .src.md file |
| `decodeCells()` | Parse partial cell content (AI output) |

**Key Pattern - Token Grouping:**

```typescript
// Tokens are grouped by type: title, markdown, filename, code
const groups = groupTokens(tokens);

// Filename + Code pairs become code cells
// Sequential markdown becomes markdown cells
const cells = convertToCells(groups);
```

### 4. packages/api/ai/plan-parser.mts

Parses XML plans for app generation:

| Function | Purpose |
|----------|---------|
| `parsePlan()` | Parse complete XML plan |
| `streamParsePlan()` | Parse streaming XML response |

**XML Plan Format:**

```xml
<plan>
  <planDescription>High-level description</planDescription>
  <action type="file">
    <description>What this change does</description>
    <file filename="./App.tsx">
      <![CDATA[...file contents...]]>
    </file>
  </action>
  <action type="command">
    <description>Install dependencies</description>
    <commandType>npm install</commandType>
    <package>react-query</package>
  </action>
</plan>
```

---

## Interactive Exercise - Build a Test Generator

Build a specialized code generator that creates test files for existing code.

###### test-generator-exercise.ts

```typescript
// Exercise: Build a Test Generator
//
// Challenge:
// 1. Create a generator for test files
// 2. Parse source code to identify functions to test
// 3. Generate test cases with proper assertions
// 4. Support multiple test frameworks

// =============================================================================
// Types (provided)
// =============================================================================

interface TestGeneratorOptions {
  framework: 'jest' | 'vitest' | 'node-test';
  includeTypes: boolean;
  testStyle: 'unit' | 'integration';
}

interface ParsedFunction {
  name: string;
  parameters: Array<{ name: string; type?: string }>;
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
}

interface GeneratedTest {
  filename: string;
  source: string;
  targetFunction: string;
}

// =============================================================================
// Starter Implementation (incomplete)
// =============================================================================

class TestGenerator {
  constructor(private options: TestGeneratorOptions) {}

  /**
   * Build prompt for test generation
   *
   * TODO: Implement this method
   * - Include the test framework in the prompt
   * - Add instructions for test structure
   * - Include the source code to test
   */
  buildPrompt(sourceCode: string, filename: string): string {
    // Hint: The prompt should tell the AI:
    // 1. Which test framework to use
    // 2. The source code to generate tests for
    // 3. Expected test file format

    throw new Error('Not implemented: buildPrompt()');
  }

  /**
   * Parse source code to identify testable functions
   *
   * TODO: Implement this method
   * - Find exported functions
   * - Extract function names and parameters
   * - Identify async functions
   */
  parseFunctions(sourceCode: string): ParsedFunction[] {
    // Hint: Use regex or simple parsing to find:
    // - export function name(params) { }
    // - export const name = (params) => { }
    // - export async function name(params) { }

    throw new Error('Not implemented: parseFunctions()');
  }

  /**
   * Parse AI response into test structures
   *
   * TODO: Implement this method
   * - Extract test file content from response
   * - Validate test structure
   */
  parseTests(response: string): GeneratedTest[] {
    // Hint: Similar to cell parsing, look for:
    // ###### filename.test.ts
    // ```typescript
    // ...test code...
    // ```

    throw new Error('Not implemented: parseTests()');
  }

  /**
   * Validate generated tests
   *
   * TODO: Implement this method
   * - Check for describe/it blocks
   * - Verify imports are present
   * - Ensure assertions exist
   */
  validate(tests: GeneratedTest[]): { valid: boolean; errors: string[] } {
    // Hint: Check for:
    // - describe() or test() blocks
    // - expect() or assert() calls
    // - import statements for the source file

    throw new Error('Not implemented: validate()');
  }

  /**
   * Get framework-specific imports
   */
  getFrameworkImports(): string {
    switch (this.options.framework) {
      case 'jest':
        return "import { describe, it, expect } from '@jest/globals';";
      case 'vitest':
        return "import { describe, it, expect } from 'vitest';";
      case 'node-test':
        return "import { describe, it } from 'node:test';\nimport assert from 'node:assert';";
    }
  }
}

// =============================================================================
// Test Your Implementation
// =============================================================================

// Sample source code to generate tests for
const sampleSourceCode = `
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

export async function fetchData(url: string): Promise<string> {
  const response = await fetch(url);
  return response.text();
}
`;

// Test the implementation
function testGenerator() {
  console.log('=== Test Generator Exercise ===\n');

  const generator = new TestGenerator({
    framework: 'vitest',
    includeTypes: true,
    testStyle: 'unit',
  });

  try {
    // Test 1: Build prompt
    console.log('1. Testing buildPrompt()...');
    const prompt = generator.buildPrompt(sampleSourceCode, 'math-utils.ts');
    console.log('   Prompt generated:', prompt ? 'Yes' : 'No');
    console.log('   Length:', prompt?.length || 0);

    // Test 2: Parse functions
    console.log('\n2. Testing parseFunctions()...');
    const functions = generator.parseFunctions(sampleSourceCode);
    console.log('   Functions found:', functions.length);
    functions.forEach(fn => {
      console.log(`   - ${fn.name}(${fn.parameters.map(p => p.name).join(', ')})`);
    });

    // Test 3: Parse test response
    console.log('\n3. Testing parseTests()...');
    const sampleResponse = `
###### math-utils.test.ts

\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { add, multiply } from './math-utils.ts';

describe('add', () => {
  it('should add two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
});

describe('multiply', () => {
  it('should multiply two numbers', () => {
    expect(multiply(2, 3)).toBe(6);
  });
});
\`\`\`
`;
    const tests = generator.parseTests(sampleResponse);
    console.log('   Tests parsed:', tests.length);

    // Test 4: Validate
    console.log('\n4. Testing validate()...');
    const validation = generator.validate(tests);
    console.log('   Valid:', validation.valid);
    if (validation.errors.length > 0) {
      validation.errors.forEach(err => console.log(`   Error: ${err}`));
    }

    console.log('\nAll tests passed!');
  } catch (error) {
    console.log(`\nTest failed: ${(error as Error).message}`);
    console.log('Implement the missing methods to complete the exercise.');
  }
}

// Run the test
// Uncomment after implementing the methods:
// testGenerator();

console.log('Exercise: Implement the TestGenerator class methods');
console.log('Then uncomment testGenerator() to verify your implementation.\n');

console.log('Hints:');
console.log('- Use regex to parse function signatures');
console.log('- Framework imports vary by test runner');
console.log('- Validation should check for test blocks and assertions');
```

---

## Source References

| File | Purpose |
|------|---------|
| `packages/api/ai/generate.mts` | All generation functions |
| `packages/api/prompts/*.txt` | Prompt templates for each mode |
| `packages/api/srcmd/decoding.mts` | Markdown/cell parsing |
| `packages/api/ai/plan-parser.mts` | XML plan parsing for apps |
| `packages/api/srcmd/encoding.mts` | Srcbook to markdown encoding |

---

## Next Steps

Now that you understand code generation, explore these related topics:

1. **AI Integration** - How Srcbook connects to AI providers
   - File: `packages/api/srcbook/examples/internals/ai-integration.src.md`

2. **Cell Execution** - How generated code gets executed
   - File: `packages/api/srcbook/examples/internals/cell-execution.src.md`

3. **WebSocket Protocol** - How AI responses stream to the UI
   - File: `packages/api/srcbook/examples/internals/websocket-protocol.src.md`

---

## Summary

### Key Takeaways

1. **Four Generation Modes**
   - Cell Generation: Natural language to code cells
   - Srcbook Generation: Complete tutorials from topics
   - App Generation: React apps with XML plans
   - Cell Editing: Modify existing code

2. **Prompt Engineering Patterns**
   - Context injection: Include all session cells
   - Structured output: Exact formats for parsing
   - Position markers: Show where to insert
   - Few-shot examples: Teach through demonstration

3. **Response Parsing**
   - Cell responses: Markdown h6 + code block
   - App responses: XML plan with actions
   - Validation: Schema and filename checks

4. **Extension Points**
   - Add prompts in `packages/api/prompts/`
   - Add parsers in `packages/api/srcmd/` or `packages/api/ai/`
   - Register new modes in `generate.mts`

### Generation Pipeline Summary

```
User Query
    |
    v
+-------------------+
| Build Prompts     |
| - System prompt   |
| - Context (cells) |
| - User query      |
+-------------------+
    |
    v
+-------------------+
| Call AI Provider  |
| - Via Vercel SDK  |
| - Any provider    |
+-------------------+
    |
    v
+-------------------+
| Parse Response    |
| - decodeCells()   |
| - parsePlan()     |
+-------------------+
    |
    v
+-------------------+
| Validate Output   |
| - Schema checks   |
| - Filename unique |
+-------------------+
    |
    v
Session Updated
```
