/**
 * MCP Server Prompts
 *
 * Registers pre-configured prompt templates that external MCP clients can use:
 *
 * 3 Prompt Templates:
 * - create_analysis_notebook: Create a data analysis notebook with standard structure
 * - debug_code_cell: Debug a failing code cell
 * - optimize_notebook: Suggest optimizations for notebook performance and structure
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// =============================================================================
// Prompt Argument Schemas
// =============================================================================

export const CreateAnalysisNotebookArgsSchema = z.object({
  dataset_description: z.string().describe('Description of the dataset to analyze'),
  analysis_goals: z.string().describe('Insights to extract from the data'),
});

export const DebugCodeCellArgsSchema = z.object({
  cell_content: z.string().describe('The failing code'),
  error_message: z.string().describe('The error received'),
});

export const OptimizeNotebookArgsSchema = z.object({
  session_id: z.string().describe('The notebook session ID to optimize'),
});

// =============================================================================
// Prompt Registration
// =============================================================================

/**
 * Register all notebook prompts with the MCP server
 */
export function registerNotebookPrompts(server: McpServer): void {
  // =========================================================================
  // create_analysis_notebook
  // =========================================================================

  server.prompt(
    'create_analysis_notebook',
    'Create a data analysis notebook with standard structure',
    CreateAnalysisNotebookArgsSchema.shape,
    async (args) => {
      console.log('[MCP Prompt] create_analysis_notebook:', args);

      const datasetDescription = args.dataset_description || 'your dataset';
      const analysisGoals = args.analysis_goals || 'insights and patterns';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Create a Srcbook notebook for data analysis with the following structure:

## Dataset
${datasetDescription}

## Analysis Goals
${analysisGoals}

Please create a notebook with these cells:

1. **Title Cell** (markdown): Clear title and description of the analysis

2. **Setup Cell** (code): Import required libraries
   \`\`\`typescript
   // Import libraries
   import * as fs from 'fs';
   // Add other imports as needed
   \`\`\`

3. **Data Loading Cell** (code): Load and preview the data
   - Read the data source
   - Display first few records
   - Show basic statistics

4. **Data Cleaning Cell** (code): Clean and preprocess
   - Handle missing values
   - Fix data types
   - Remove duplicates if needed

5. **Analysis Cells** (code): Perform the main analysis
   - Calculate key metrics
   - Find patterns and correlations
   - Answer the analysis goals

6. **Visualization Cell** (code): Create visual representations
   - Charts and graphs as appropriate
   - Clear labels and legends

7. **Summary Cell** (markdown): Key findings and insights
   - Answer the analysis goals
   - Highlight important discoveries
   - Suggest next steps

Make sure each cell has clear comments explaining what it does.`,
            },
          },
        ],
      };
    },
  );

  // =========================================================================
  // debug_code_cell
  // =========================================================================

  server.prompt(
    'debug_code_cell',
    'Debug a failing code cell',
    DebugCodeCellArgsSchema.shape,
    async (args) => {
      console.log('[MCP Prompt] debug_code_cell:', args);

      const cellContent = args.cell_content || '// No code provided';
      const errorMessage = args.error_message || 'Unknown error';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `I have a code cell in my Srcbook notebook that's failing. Please help me debug it.

## Failing Code
\`\`\`typescript
${cellContent}
\`\`\`

## Error Message
\`\`\`
${errorMessage}
\`\`\`

Please:
1. Identify the root cause of the error
2. Explain why this error occurred
3. Provide a corrected version of the code
4. Suggest any improvements or best practices

If the error is related to:
- **Import issues**: Check if the package is installed and imported correctly
- **Type errors**: Verify TypeScript types are correct
- **Runtime errors**: Look for null/undefined access, async issues, etc.
- **Syntax errors**: Check for typos or missing brackets

Provide the fixed code in a format I can directly use in Srcbook.`,
            },
          },
        ],
      };
    },
  );

  // =========================================================================
  // optimize_notebook
  // =========================================================================

  server.prompt(
    'optimize_notebook',
    'Suggest optimizations for notebook performance and structure',
    OptimizeNotebookArgsSchema.shape,
    async (args) => {
      console.log('[MCP Prompt] optimize_notebook:', args);

      const sessionId = args.session_id || 'unknown';

      // TODO: In a full implementation, we would fetch the notebook content
      // and include it in the prompt for analysis

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please analyze my Srcbook notebook (session: ${sessionId}) and suggest optimizations.

Evaluate the notebook on these dimensions:

## 1. Structure & Organization
- Is the notebook well-organized with clear sections?
- Are cells in a logical order?
- Is there appropriate use of markdown cells for documentation?

## 2. Code Quality
- Are there any code smells or anti-patterns?
- Could any code be simplified or made more readable?
- Are there opportunities for refactoring?

## 3. Performance
- Are there any computationally expensive operations that could be optimized?
- Are there redundant calculations that could be cached?
- Could any loops be vectorized or parallelized?

## 4. Dependencies
- Are all imported packages actually used?
- Are there lighter alternatives to heavy dependencies?
- Are package versions up to date?

## 5. Error Handling
- Is there appropriate error handling?
- Are edge cases covered?
- Could any operations fail silently?

## 6. Best Practices
- Does the notebook follow TypeScript/JavaScript best practices?
- Are there any security concerns?
- Is the code testable?

Please provide:
1. A summary of the notebook's current state
2. Specific optimization recommendations with examples
3. Priority ranking of suggested changes
4. Estimated impact of each optimization`,
            },
          },
        ],
      };
    },
  );

  console.log('[MCP Server] Registered 3 notebook prompts');
}
