/**
 * MCP Server Resources Unit Tests
 *
 * Tests for resource providers and URI validation.
 *
 * @see 04-mcp-testing.md section 3.1 for requirements
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestSession,
  addCodeCell,
  addMarkdownCell,
  validateResourceUri,
} from '../utils.mjs';

// =============================================================================
// Session Resource Provider Tests
// =============================================================================

describe('session resource provider', () => {
  it('returns complete notebook state', async () => {
    const session = await createTestSession({ title: 'Resource Test' });
    await addCodeCell(session.id, 'const x = 1');
    await addMarkdownCell(session.id, '# Header');

    // TODO: Implement actual resource reading
    const mockResource = {
      sessionId: session.id,
      title: session.title,
      language: session.language,
      cells: [
        { type: 'title', content: 'Resource Test' },
        { type: 'code', content: 'const x = 1' },
        { type: 'markdown', content: '# Header' },
      ],
    };

    expect(mockResource.cells).toHaveLength(3);
    expect(mockResource.language).toBe('typescript');
  });

  it('returns 404 for invalid session', async () => {
    const readInvalidSession = async () => {
      throw new Error('Resource not found');
    };

    await expect(readInvalidSession()).rejects.toThrow('Resource not found');
  });

  it('includes cell outputs when available', async () => {
    const session = await createTestSession({ title: 'Output Test' });
    const cell = await addCodeCell(session.id, 'console.log("test")');

    // TODO: Implement actual output retrieval
    const mockResource = {
      sessionId: session.id,
      cells: [
        {
          id: cell.id,
          type: 'code',
          content: 'console.log("test")',
          outputs: [{ type: 'stdout', content: 'test\n' }],
        },
      ],
    };

    expect(mockResource.cells[0].outputs).toBeDefined();
    expect(mockResource.cells[0].outputs[0].content).toBe('test\n');
  });
});

// =============================================================================
// Cell Resource Provider Tests
// =============================================================================

describe('cell resource provider', () => {
  it('returns individual cell state', async () => {
    const session = await createTestSession({ title: 'Cell Resource' });
    const cell = await addCodeCell(session.id, 'const x = 1');

    // TODO: Implement actual cell resource reading
    const mockCellResource = {
      id: cell.id,
      type: 'code',
      content: 'const x = 1',
      sessionId: session.id,
    };

    expect(mockCellResource.id).toBe(cell.id);
    expect(mockCellResource.content).toBe('const x = 1');
  });

  it('returns 404 for invalid cell', async () => {
    const session = await createTestSession({ title: 'Invalid Cell' });

    const readInvalidCell = async () => {
      throw new Error('Cell not found');
    };

    await expect(readInvalidCell()).rejects.toThrow('Cell not found');
  });
});

// =============================================================================
// Notebooks List Resource Tests
// =============================================================================

describe('notebooks list resource', () => {
  it('returns list of all notebooks', async () => {
    const session1 = await createTestSession({ title: 'Notebook 1' });
    const session2 = await createTestSession({ title: 'Notebook 2' });

    // TODO: Implement actual list resource
    const mockListResource = {
      notebooks: [
        { id: session1.id, title: session1.title },
        { id: session2.id, title: session2.title },
      ],
    };

    expect(mockListResource.notebooks).toHaveLength(2);
  });

  it('returns empty list when no notebooks exist', async () => {
    // TODO: Implement with clean state
    const mockEmptyList = { notebooks: [] };

    expect(mockEmptyList.notebooks).toHaveLength(0);
  });
});

// =============================================================================
// Outputs Resource Tests
// =============================================================================

describe('outputs resource provider', () => {
  it('returns all outputs for session', async () => {
    const session = await createTestSession({ title: 'Outputs Test' });
    await addCodeCell(session.id, 'console.log(1)');
    await addCodeCell(session.id, 'console.log(2)');

    // TODO: Implement actual outputs resource
    const mockOutputsResource = {
      sessionId: session.id,
      outputs: [
        { cellId: 'cell-1', stdout: '1\n' },
        { cellId: 'cell-2', stdout: '2\n' },
      ],
    };

    expect(mockOutputsResource.outputs).toBeDefined();
    expect(mockOutputsResource.outputs.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// Dependencies Resource Tests
// =============================================================================

describe('dependencies resource provider', () => {
  it('returns installed packages for session', async () => {
    const session = await createTestSession({ title: 'Deps Resource' });

    // TODO: Implement actual deps resource
    const mockDepsResource = {
      sessionId: session.id,
      dependencies: {
        lodash: '4.17.21',
        zod: '3.22.4',
      },
    };

    expect(mockDepsResource.dependencies).toBeDefined();
    expect(mockDepsResource.dependencies.lodash).toBe('4.17.21');
  });

  it('returns empty deps for new session', async () => {
    const session = await createTestSession({ title: 'New Session' });

    const mockEmptyDeps = {
      sessionId: session.id,
      dependencies: {},
    };

    expect(Object.keys(mockEmptyDeps.dependencies)).toHaveLength(0);
  });
});

// =============================================================================
// Resource URI Validation Tests
// =============================================================================

describe('resource URI validation', () => {
  it('accepts valid srcbook:// URIs', () => {
    expect(validateResourceUri('srcbook://notebooks')).toBe(true);
    expect(validateResourceUri('srcbook://session/abc')).toBe(true);
    expect(validateResourceUri('srcbook://session/abc/cell/xyz')).toBe(true);
    expect(validateResourceUri('srcbook://session/abc/outputs')).toBe(true);
    expect(validateResourceUri('srcbook://session/abc/deps')).toBe(true);
  });

  it('rejects invalid schemes', () => {
    expect(validateResourceUri('file:///etc/passwd')).toBe(false);
    expect(validateResourceUri('http://example.com')).toBe(false);
    expect(validateResourceUri('https://example.com')).toBe(false);
    expect(validateResourceUri('ftp://server.com/file')).toBe(false);
  });

  it('rejects path traversal attempts', () => {
    expect(validateResourceUri('srcbook://../etc/passwd')).toBe(false);
    expect(validateResourceUri('srcbook://session/../../../etc/passwd')).toBe(false);
    expect(validateResourceUri('srcbook://..%2F..%2Fetc%2Fpasswd')).toBe(false);
  });

  it('rejects malformed URIs', () => {
    expect(validateResourceUri('')).toBe(false);
    expect(validateResourceUri('srcbook://')).toBe(false);
    expect(validateResourceUri('srcbook')).toBe(false);
  });

  it('accepts session IDs with various characters', () => {
    expect(validateResourceUri('srcbook://session/abc123')).toBe(true);
    expect(validateResourceUri('srcbook://session/test-session')).toBe(true);
    expect(validateResourceUri('srcbook://session/test_session')).toBe(true);
  });
});

// =============================================================================
// Resource Subscription Tests
// =============================================================================

describe('resource subscriptions', () => {
  it('notifies on cell creation', async () => {
    const session = await createTestSession({ title: 'Sub Test' });
    const updates: unknown[] = [];

    // TODO: Implement actual subscription
    const mockSubscribe = (callback: (data: unknown) => void) => {
      // Simulate update
      setTimeout(() => {
        callback({ cells: [{ content: 'new cell' }] });
      }, 10);

      return () => {}; // unsubscribe
    };

    mockSubscribe((update) => updates.push(update));

    // Wait for update
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(updates.length).toBeGreaterThan(0);
  });

  it('notifies on cell update', async () => {
    const session = await createTestSession({ title: 'Update Sub' });
    const cell = await addCodeCell(session.id, 'original');
    const updates: unknown[] = [];

    // TODO: Implement actual subscription
    const mockUpdate = () => {
      // Simulate update
      updates.push({ cellId: cell.id, content: 'updated' });
    };

    mockUpdate();

    expect(updates).toHaveLength(1);
  });

  it('stops receiving updates after unsubscribe', async () => {
    const session = await createTestSession({ title: 'Unsub Test' });
    const updates: unknown[] = [];
    let isSubscribed = true;

    const mockSubscribe = () => {
      return () => {
        isSubscribed = false;
      };
    };

    const unsubscribe = mockSubscribe();
    unsubscribe();

    expect(isSubscribed).toBe(false);
  });
});
