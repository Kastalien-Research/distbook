import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { SrcbookDeps } from './index.mjs';

export function registerPrompts(server: McpServer, _deps: SrcbookDeps) {
  server.prompt(
    'create_notebook',
    'Create an interactive TypeScript or JavaScript notebook on a topic',
    {
      topic: z.string().describe('The topic for the notebook'),
      language: z
        .enum(['typescript', 'javascript'])
        .optional()
        .describe('Language for the notebook (default: typescript)'),
    },
    ({ topic, language }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Create a Srcbook notebook about "${topic}" using ${language || 'typescript'}.

A Srcbook notebook is an interactive document with markdown cells for explanation and code cells that can be executed. Structure it as:

1. A title cell with a descriptive name
2. An introduction markdown cell explaining the topic
3. Several code cells demonstrating key concepts, each preceded by a markdown cell explaining what the code does
4. A summary markdown cell

Use the create_srcbook tool to create the notebook, then use create_cell to add each cell.`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'analyze_notebook',
    'Analyze and suggest improvements for an existing notebook',
    {
      sessionId: z.string().describe('The session ID of the notebook to analyze'),
    },
    ({ sessionId }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please analyze the srcbook notebook with session ID "${sessionId}".

Use the read_srcbook tool to read its contents, then:
1. Review the code quality and suggest improvements
2. Check for potential bugs or issues
3. Suggest additional cells that could enhance the notebook
4. Evaluate the documentation/markdown cells for clarity

Provide a structured analysis with specific recommendations.`,
          },
        },
      ],
    }),
  );

  server.prompt(
    'build_app',
    'Build a web application from a description',
    {
      description: z.string().describe('Description of the web application to build'),
    },
    ({ description }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Build a web application based on this description: "${description}"

Use the create_app tool with the description as the prompt. The app will be created as a React + Vite + TypeScript + Tailwind CSS project.

After creation, you can use read_app_file and write_app_file to review and modify specific files.`,
          },
        },
      ],
    }),
  );
}
