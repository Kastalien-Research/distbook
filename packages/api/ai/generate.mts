import { streamText, generateText, type GenerateTextResult } from 'ai';
import { getModel } from './config.mjs';
import {
  type CodeLanguageType,
  type CellType,
  type CodeCellType,
  randomid,
  type CellWithPlaceholderType,
} from '@srcbook/shared';
import { type SessionType } from '../types.mjs';
import { readFileSync } from 'node:fs';
import Path from 'node:path';
import { PROMPTS_DIR } from '../constants.mjs';
import { encode, decodeCells } from '../srcmd.mjs';
import { buildProjectXml, type FileContent } from '../ai/app-parser.mjs';
import { logAppGeneration } from './logger.mjs';
import { mcpClientManager, mcpToolsToVercelTools } from '@srcbook/mcp';
import { getMcpServers } from '../config.mjs';

let mcpClientsInitialized = false;

/**
 * Load enabled MCP server configs from the DB and connect them.
 * Called lazily on first AI generation request, and can be re-called
 * to refresh connections after config changes.
 */
export async function initMcpClients(): Promise<void> {
  try {
    const servers = await getMcpServers();
    const enabledServers = servers.filter((s) => s.enabled);

    // Disconnect any servers that are no longer enabled or in the config
    const connectedNames = new Set(
      mcpClientManager.listConnectedServers().map((s) => s.name),
    );
    const enabledNames = new Set(enabledServers.map((s) => s.name));
    for (const name of connectedNames) {
      if (!enabledNames.has(name)) {
        await mcpClientManager.disconnect(name);
      }
    }

    // Connect (or reconnect) all enabled servers. McpClientManager.connect()
    // internally disconnects any existing connection with the same name first,
    // so this correctly picks up config changes (updated URL, command, args, etc.)
    let allConnected = true;
    for (const server of enabledServers) {
      try {
        await mcpClientManager.connect(server);
      } catch (e) {
        allConnected = false;
        console.error(`Failed to connect MCP server "${server.name}":`, (e as Error).message);
      }
    }

    // Only mark as initialized if all servers connected successfully.
    // If any failed, subsequent getMcpTools() calls will retry.
    mcpClientsInitialized = allConnected;
  } catch (e) {
    console.error('Failed to initialize MCP clients:', (e as Error).message);
  }
}

/**
 * Get MCP tools from all connected external MCP servers.
 * Returns an empty object if no servers are connected.
 */
async function getMcpTools(): Promise<Record<string, any>> {
  try {
    // Lazily initialize MCP clients on first use
    if (!mcpClientsInitialized) {
      await initMcpClients();
    }
    const tools = mcpClientManager.getAllTools();
    if (tools.length === 0) return {};
    return mcpToolsToVercelTools(tools, mcpClientManager);
  } catch {
    return {};
  }
}

const makeGenerateSrcbookSystemPrompt = () => {
  return readFileSync(Path.join(PROMPTS_DIR, 'srcbook-generator.txt'), 'utf-8');
};

const makeGenerateCellSystemPrompt = (language: CodeLanguageType) => {
  return readFileSync(Path.join(PROMPTS_DIR, `cell-generator-${language}.txt`), 'utf-8');
};

const makeFixDiagnosticsSystemPrompt = () => {
  return readFileSync(Path.join(PROMPTS_DIR, 'fix-cell-diagnostics.txt'), 'utf-8');
};
const makeAppBuilderSystemPrompt = () => {
  return readFileSync(Path.join(PROMPTS_DIR, 'app-builder.txt'), 'utf-8');
};
const makeAppEditorSystemPrompt = () => {
  return readFileSync(Path.join(PROMPTS_DIR, 'app-editor.txt'), 'utf-8');
};

const makeAppEditorUserPrompt = (projectId: string, files: FileContent[], query: string) => {
  const projectXml = buildProjectXml(files, projectId);
  const userRequestXml = `<userRequest>${query}</userRequest>`;
  return `Following below are the project XML and the user request.

${projectXml}

${userRequestXml}
  `.trim();
};

const makeAppCreateUserPrompt = (projectId: string, files: FileContent[], query: string) => {
  const projectXml = buildProjectXml(files, projectId);
  const userRequestXml = `<userRequest>${query}</userRequest>`;
  return `Following below are the project XML and the user request.

${projectXml}

${userRequestXml}
  `.trim();
};

const makeGenerateCellUserPrompt = (session: SessionType, insertIdx: number, query: string) => {
  // Make sure we copy cells so we don't mutate the session
  const cellsWithPlaceholder: CellWithPlaceholderType[] = [...session.cells];

  cellsWithPlaceholder.splice(insertIdx, 0, {
    id: randomid(),
    type: 'placeholder',
    text: '==== INTRODUCE CELL HERE ====',
  });

  // Intentionally not passing in tsconfig.json here as that doesn't need to be in the prompt.
  const inlineSrcbookWithPlaceholder = encode(
    { cells: cellsWithPlaceholder, language: session.language },
    {
      inline: true,
    },
  );

  const prompt = `==== BEGIN SRCBOOK ====
${inlineSrcbookWithPlaceholder}
==== END SRCBOOK ====

==== BEGIN USER REQUEST ====
${query}
==== END USER REQUEST ====`;
  return prompt;
};

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

const makeGenerateCellEditSystemPrompt = (language: CodeLanguageType) => {
  return readFileSync(Path.join(PROMPTS_DIR, `code-updater-${language}.txt`), 'utf-8');
};

const makeGenerateCellEditUserPrompt = (
  query: string,
  session: SessionType,
  cell: CodeCellType,
) => {
  // Intentionally not passing in tsconfig.json here as that doesn't need to be in the prompt.
  const inlineSrcbook = encode(
    { cells: session.cells, language: session.language },
    { inline: true },
  );

  const prompt = `==== BEGIN SRCBOOK ====
${inlineSrcbook}
==== END SRCBOOK ====

==== BEGIN CODE CELL ====
${cell.source}
==== END CODE CELL ====

==== BEGIN USER REQUEST ====
${query}
==== END USER REQUEST ====
`;
  return prompt;
};

type NoToolsGenerateTextResult = GenerateTextResult<{}>;
/*
 * Given a user request, which is free form text describing their intent,
 * generate a srcbook using an LLM.
 *
 * Currently, this uses openAI and the GPT-4o model, and throws if the
 * openAI API key is not set in the settings.
 * In the future, we can parameterize this with different models, to allow
 * users to use different providers like Anthropic or local ones.
 */
export async function generateSrcbook(query: string): Promise<NoToolsGenerateTextResult> {
  const model = await getModel();
  const result = await generateText({
    model,
    system: makeGenerateSrcbookSystemPrompt(),
    prompt: query,
  });

  // TODO, handle 'length' finish reason with sequencing logic.
  if (result.finishReason !== 'stop') {
    console.warn('Generated a srcbook, but finish_reason was not "stop":', result.finishReason);
  }
  return result;
}

export async function healthcheck(): Promise<string> {
  const model = await getModel();
  const result = await generateText({
    model,
    system: 'This is a test, simply respond "yes" to confirm the model is working.',
    prompt: 'Are you working?',
  });
  return result.text;
}

type GenerateCellsResult = {
  error: boolean;
  errors?: string[];
  cells?: CellType[];
};
export async function generateCells(
  query: string,
  session: SessionType,
  insertIdx: number,
): Promise<GenerateCellsResult> {
  const model = await getModel();
  const mcpTools = await getMcpTools();
  const hasTools = Object.keys(mcpTools).length > 0;

  const systemPrompt = makeGenerateCellSystemPrompt(session.language);
  const userPrompt = makeGenerateCellUserPrompt(session, insertIdx, query);
  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    ...(hasTools ? { tools: mcpTools, maxSteps: 10 } : {}),
  });

  // TODO, handle 'length' finish reason with sequencing logic.
  if (result.finishReason !== 'stop') {
    console.warn('Generated a cell, but finish_reason was not "stop":', result.finishReason);
  }

  // Parse the result into cells
  // TODO: figure out logging.
  // Data is incredibly valuable for product improvements, but privacy needs to be considered.
  const decodeResult = decodeCells(result.text);

  if (decodeResult.error) {
    return { error: true, errors: decodeResult.errors };
  } else {
    return { error: false, cells: decodeResult.srcbook.cells };
  }
}

export async function generateCellEdit(query: string, session: SessionType, cell: CodeCellType) {
  const model = await getModel();
  const mcpTools = await getMcpTools();
  const hasTools = Object.keys(mcpTools).length > 0;

  const systemPrompt = makeGenerateCellEditSystemPrompt(session.language);
  const userPrompt = makeGenerateCellEditUserPrompt(query, session, cell);
  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    ...(hasTools ? { tools: mcpTools, maxSteps: 10 } : {}),
  });

  return result.text;
}

export async function fixDiagnostics(
  session: SessionType,
  cell: CodeCellType,
  diagnostics: string,
): Promise<string> {
  const model = await getModel();
  const mcpTools = await getMcpTools();
  const hasTools = Object.keys(mcpTools).length > 0;

  const systemPrompt = makeFixDiagnosticsSystemPrompt();
  const userPrompt = makeFixDiagnosticsUserPrompt(session, cell, diagnostics);

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    ...(hasTools ? { tools: mcpTools, maxSteps: 10 } : {}),
  });

  return result.text;
}

export async function generateApp(
  projectId: string,
  files: FileContent[],
  query: string,
): Promise<string> {
  const model = await getModel();
  const mcpTools = await getMcpTools();
  const hasTools = Object.keys(mcpTools).length > 0;

  const result = await generateText({
    model,
    system: makeAppBuilderSystemPrompt(),
    prompt: makeAppCreateUserPrompt(projectId, files, query),
    ...(hasTools ? { tools: mcpTools, maxSteps: 10 } : {}),
  });
  return result.text;
}

export async function streamEditApp(
  projectId: string,
  files: FileContent[],
  query: string,
  appId: string,
  planId: string,
) {
  const model = await getModel();
  const mcpTools = await getMcpTools();
  const hasTools = Object.keys(mcpTools).length > 0;

  const systemPrompt = makeAppEditorSystemPrompt();
  const userPrompt = makeAppEditorUserPrompt(projectId, files, query);

  let response = '';

  const result = await streamText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    ...(hasTools ? { tools: mcpTools, maxSteps: 10 } : {}),
    onChunk: (chunk) => {
      if (chunk.chunk.type === 'text-delta') {
        response += chunk.chunk.textDelta;
      }
    },
    onFinish: () => {
      if (process.env.SRCBOOK_DISABLE_ANALYTICS !== 'true') {
        logAppGeneration({
          appId,
          planId,
          llm_request: { model, system: systemPrompt, prompt: userPrompt },
          llm_response: response,
        });
      }
    },
  });

  return result.textStream;
}
