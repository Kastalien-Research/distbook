# Code Generation - Implementation Specification

**Version:** 1.0
**Date:** 2026-01-14
**Status:** Implementation-Ready
**Output:** `packages/api/srcbook/examples/internals/code-generation.src.md`
**Dependencies:** AI Integration Srcbook

---

## 1. Overview

This specification defines the implementation of an educational Srcbook that explains how Srcbook uses AI to generate code cells, srcbooks, and applications.

### Learning Objectives

1. Understand the different generation modes (cell, srcbook, app)
2. Learn the prompt engineering patterns used
3. Comprehend the response parsing and validation
4. Know how to customize generation behavior

---

## 2. File Structure

### 2.1 Srcbook Metadata

```markdown
<!-- srcbook:{"language":"typescript"} -->
```

### 2.2 Required Sections

| Section | Type | Purpose |
|---------|------|---------|
| Title | Title Cell | "Code Generation - AI-Powered Development" |
| package.json | Package Cell | AI SDK and parsing dependencies |
| Introduction | Markdown | Context and objectives |
| Key Concepts | Markdown | Generation modes and flow |
| Simple Demo | Code | Basic prompt and response |
| Explanation | Markdown | Prompt engineering |
| Advanced Demo | Code | Full generation pipeline |
| Deep Dive | Markdown | Srcbook's implementation |
| Interactive Exercise | Code | Build custom generator |
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

**What is Code Generation?**
- AI-powered creation of code from natural language descriptions
- Multiple modes: generate cells, entire srcbooks, or full apps
- Uses specialized prompts for each generation type
- Includes response parsing to extract structured code

**Why does it matter?**
- Understanding enables extending AI capabilities
- Necessary for improving generation quality
- Foundation for AI-assisted development workflows

### 3.3 Key Concepts - Generation Modes

```
┌─────────────────────────────────────────────────────────────┐
│                  Code Generation Modes                       │
│                                                              │
│  1. CELL GENERATION                                          │
│     ┌───────────────────────────────────────────────────┐   │
│     │ Input: Natural language query + session context    │   │
│     │ Output: One or more code cells                     │   │
│     │ Prompt: cell-generator-{js|ts}.txt                 │   │
│     │ Parser: decodeCells() - extracts cell structure    │   │
│     └───────────────────────────────────────────────────┘   │
│                                                              │
│  2. SRCBOOK GENERATION                                       │
│     ┌───────────────────────────────────────────────────┐   │
│     │ Input: Topic/query description                     │   │
│     │ Output: Complete srcbook markdown                  │   │
│     │ Prompt: srcbook-generator.txt                      │   │
│     │ Parser: Direct markdown output                     │   │
│     └───────────────────────────────────────────────────┘   │
│                                                              │
│  3. APP GENERATION                                           │
│     ┌───────────────────────────────────────────────────┐   │
│     │ Input: App description + existing files (optional) │   │
│     │ Output: XML plan with file changes                 │   │
│     │ Prompt: app-builder.txt / app-editor.txt           │   │
│     │ Parser: parsePlan() / streamParsePlan()            │   │
│     └───────────────────────────────────────────────────┘   │
│                                                              │
│  4. CELL EDITING                                             │
│     ┌───────────────────────────────────────────────────┐   │
│     │ Input: Existing code + edit instructions           │   │
│     │ Output: Modified code                              │   │
│     │ Prompt: code-updater-{js|ts}.txt                   │   │
│     │ Parser: Direct code output                         │   │
│     └───────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Simple Demo

**Filename:** `simple-generation.ts`

```typescript
// Demonstrate code generation prompt structure

// System prompt structure (simplified from cell-generator-typescript.txt)
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
For each cell, output:

<cell>
<filename>descriptive-name.ts</filename>
<code>
// Your TypeScript code here
</code>
</cell>

GUIDELINES:
- Write clean, typed TypeScript
- Add helpful comments
- Use ES modules (import/export)
- Handle errors appropriately
`;

// User prompt template
const userPromptTemplate = (query: string, existingCode: string) => `
USER REQUEST: ${query}

EXISTING CODE IN SESSION:
${existingCode || '(empty session)'}

Generate the requested code cells.
`;

// Cell response structure
interface GeneratedCell {
  filename: string;
  code: string;
}

// Parser for AI response
function parseCellResponse(response: string): GeneratedCell[] {
  const cells: GeneratedCell[] = [];
  const cellRegex = /<cell>\s*<filename>(.*?)<\/filename>\s*<code>([\s\S]*?)<\/code>\s*<\/cell>/g;

  let match;
  while ((match = cellRegex.exec(response)) !== null) {
    cells.push({
      filename: match[1].trim(),
      code: match[2].trim(),
    });
  }

  return cells;
}

// Demo: Parse a sample AI response
const sampleAIResponse = `
I'll create two cells for you: one for the data types and one for the main logic.

<cell>
<filename>types.ts</filename>
<code>
// User data types
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
</code>
</cell>

<cell>
<filename>user-service.ts</filename>
<code>
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

// Demo
const user = createUser({ name: 'Alice', email: 'alice@example.com' });
console.log('Created user:', user);
</code>
</cell>
`;

console.log('=== Code Generation Parsing Demo ===\n');

const parsedCells = parseCellResponse(sampleAIResponse);

console.log(`Parsed ${parsedCells.length} cells:\n`);

parsedCells.forEach((cell, index) => {
  console.log(`📄 Cell ${index + 1}: ${cell.filename}`);
  console.log(`   Lines: ${cell.code.split('\n').length}`);
  console.log(`   Preview: ${cell.code.slice(0, 50).replace(/\n/g, ' ')}...`);
  console.log('');
});

// Show full system prompt
console.log('=== System Prompt Template ===');
console.log(systemPrompt.slice(0, 500) + '...\n');
```

### 3.5 Advanced Demo

**Filename:** `generation-pipeline.ts`

```typescript
// Full code generation pipeline (simplified from generate.mts)

import { z } from 'zod';

// Cell schema for validation
const GeneratedCellSchema = z.object({
  type: z.literal('code'),
  filename: z.string(),
  source: z.string(),
});

// Generation context
interface GenerationContext {
  sessionId: string;
  language: 'javascript' | 'typescript';
  existingCells: Array<{
    filename: string;
    source: string;
  }>;
  packages: Record<string, string>;
}

// Prompt templates by type
const prompts = {
  cellGenerator: {
    typescript: `You are generating TypeScript code cells for Srcbook.
Output format: <cell><filename>name.ts</filename><code>...</code></cell>`,
    javascript: `You are generating JavaScript code cells for Srcbook.
Output format: <cell><filename>name.js</filename><code>...</code></cell>`,
  },
  codeUpdater: {
    typescript: `You are editing existing TypeScript code.
Output only the modified code, no explanations.`,
    javascript: `You are editing existing JavaScript code.
Output only the modified code, no explanations.`,
  },
  srcbookGenerator: `You are creating a complete Srcbook tutorial.
Output valid srcbook markdown format with code cells.`,
  appBuilder: `You are generating a React application.
Output XML plan with file changes.`,
};

// Generation result
interface GenerationResult {
  success: boolean;
  cells?: Array<{
    filename: string;
    source: string;
  }>;
  error?: string;
  tokensUsed?: number;
}

// Code generator class
class CodeGenerator {
  constructor(private context: GenerationContext) {}

  // Build the system prompt
  private buildSystemPrompt(): string {
    const prompt = prompts.cellGenerator[this.context.language];

    // Add context about existing cells
    const existingCellsContext = this.context.existingCells
      .map(cell => `File: ${cell.filename}\n${cell.source}`)
      .join('\n\n---\n\n');

    // Add available packages
    const packagesContext = Object.entries(this.context.packages)
      .map(([name, version]) => `- ${name}@${version}`)
      .join('\n');

    return `${prompt}

EXISTING CELLS:
${existingCellsContext || '(none)'}

AVAILABLE PACKAGES:
${packagesContext || '(none)'}

RULES:
1. Generate valid ${this.context.language} code
2. Use ES module syntax (import/export)
3. Include type annotations for TypeScript
4. Add helpful comments
5. Handle potential errors`;
  }

  // Build the user prompt
  private buildUserPrompt(query: string): string {
    return `Generate code for: ${query}`;
  }

  // Parse AI response into cells
  private parseResponse(response: string): Array<{ filename: string; source: string }> {
    const cells: Array<{ filename: string; source: string }> = [];
    const regex = /<cell>\s*<filename>(.*?)<\/filename>\s*<code>([\s\S]*?)<\/code>\s*<\/cell>/g;

    let match;
    while ((match = regex.exec(response)) !== null) {
      const filename = match[1].trim();
      const source = match[2].trim();

      // Validate extension matches language
      const ext = this.context.language === 'typescript' ? '.ts' : '.js';
      const validFilename = filename.endsWith(ext) ? filename : filename + ext;

      cells.push({ filename: validFilename, source });
    }

    return cells;
  }

  // Simulate AI call (in real code, this calls the AI provider)
  private async callAI(systemPrompt: string, userPrompt: string): Promise<string> {
    console.log('📤 Calling AI...');
    console.log(`   System prompt length: ${systemPrompt.length} chars`);
    console.log(`   User prompt: "${userPrompt}"`);

    // Simulate response
    await new Promise(resolve => setTimeout(resolve, 500));

    return `
I'll generate a utility for working with arrays.

<cell>
<filename>array-utils.ts</filename>
<code>
/**
 * Array utility functions
 */

export function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

export function groupBy<T>(arr: T[], key: keyof T): Map<T[keyof T], T[]> {
  const map = new Map<T[keyof T], T[]>();

  for (const item of arr) {
    const groupKey = item[key];
    const group = map.get(groupKey) || [];
    group.push(item);
    map.set(groupKey, group);
  }

  return map;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Demo
const numbers = [1, 2, 2, 3, 3, 3, 4];
console.log('Unique:', unique(numbers));

const people = [
  { name: 'Alice', dept: 'Engineering' },
  { name: 'Bob', dept: 'Sales' },
  { name: 'Carol', dept: 'Engineering' },
];
console.log('By department:', groupBy(people, 'dept'));

console.log('Chunked:', chunk([1, 2, 3, 4, 5, 6, 7], 3));
</code>
</cell>
`;
  }

  // Main generation method
  async generate(query: string): Promise<GenerationResult> {
    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(query);

      const response = await this.callAI(systemPrompt, userPrompt);
      const cells = this.parseResponse(response);

      if (cells.length === 0) {
        return {
          success: false,
          error: 'No valid cells found in AI response',
        };
      }

      // Validate each cell
      for (const cell of cells) {
        const validation = GeneratedCellSchema.safeParse({
          type: 'code',
          filename: cell.filename,
          source: cell.source,
        });

        if (!validation.success) {
          console.warn(`⚠️ Cell validation warning: ${cell.filename}`);
        }
      }

      return {
        success: true,
        cells,
        tokensUsed: response.length, // Simplified
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Demo
async function demo() {
  console.log('=== Code Generation Pipeline Demo ===\n');

  const context: GenerationContext = {
    sessionId: 'demo-session',
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

  const generator = new CodeGenerator(context);
  const result = await generator.generate('Create array utility functions');

  console.log('\n=== Generation Result ===');
  console.log(`Success: ${result.success}`);

  if (result.cells) {
    console.log(`Generated ${result.cells.length} cell(s):\n`);
    result.cells.forEach(cell => {
      console.log(`📄 ${cell.filename}`);
      console.log('─'.repeat(40));
      console.log(cell.source);
      console.log('');
    });
  }

  if (result.error) {
    console.log(`Error: ${result.error}`);
  }
}

demo();
```

### 3.6 Deep Dive Content

**Source File References:**

1. **`packages/api/ai/generate.mts`** - Generation functions
   - `generateCells()` - Cell generation
   - `generateCellEdit()` - Cell editing
   - `generateSrcbook()` - Srcbook generation
   - `generateApp()` - App generation
   - `streamEditApp()` - Streaming app edits

2. **`packages/api/prompts/`** - Prompt templates
   - `cell-generator-typescript.txt`
   - `cell-generator-javascript.txt`
   - `code-updater-typescript.txt`
   - `srcbook-generator.txt`
   - `app-builder.txt`
   - `app-editor.txt`
   - `fix-cell-diagnostics.txt`

3. **`packages/api/ai/plan-parser.mts`** - Response parsing
   - `parsePlan()` - Complete plan parsing
   - `streamParsePlan()` - Streaming parser

4. **`packages/api/srcbook/srcmd.mts`** - Cell decoding
   - `decodeCells()` - Extract cells from markdown

### 3.7 Interactive Exercise

```typescript
// Exercise: Build a Custom Code Generator
//
// Challenge:
// 1. Create a generator for test files
// 2. Implement context-aware suggestions
// 3. Add validation for generated code
// 4. Support multiple output formats

interface TestGeneratorOptions {
  framework: 'jest' | 'vitest' | 'mocha';
  includeTypes: boolean;
  coverage: 'unit' | 'integration' | 'e2e';
}

class TestGenerator {
  constructor(private options: TestGeneratorOptions) {}

  buildPrompt(sourceCode: string): string {
    // TODO: Build specialized prompt for test generation
    throw new Error('Not implemented');
  }

  parseTests(response: string): Array<{ filename: string; source: string }> {
    // TODO: Parse test files from response
    throw new Error('Not implemented');
  }

  validate(tests: Array<{ source: string }>): { valid: boolean; errors: string[] } {
    // TODO: Validate test syntax and structure
    throw new Error('Not implemented');
  }
}

// Test your implementation:
// const generator = new TestGenerator({ framework: 'vitest', includeTypes: true, coverage: 'unit' });
// const prompt = generator.buildPrompt('function add(a, b) { return a + b; }');
// const tests = generator.parseTests(aiResponse);
// const validation = generator.validate(tests);
```

### 3.8 Source References

| File | Purpose |
|------|---------|
| `packages/api/ai/generate.mts` | All generation functions |
| `packages/api/prompts/*.txt` | Prompt templates |
| `packages/api/ai/plan-parser.mts` | XML plan parsing |
| `packages/api/srcbook/srcmd.mts` | Cell structure parsing |

---

## 4. Acceptance Criteria

- [ ] All generation modes explained
- [ ] Prompt structure documented
- [ ] Response parsing demonstrated
- [ ] Code examples execute correctly
- [ ] Exercise is achievable

---

## 5. Implementation Notes

### File Location
```
packages/api/srcbook/examples/internals/code-generation.src.md
```

### Validation
- Test with various query types
- Verify cell parsing accuracy
