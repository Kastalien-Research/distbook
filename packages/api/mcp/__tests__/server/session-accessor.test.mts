/**
 * Session Accessor Unit Tests
 *
 * Tests for session and cell access with proper error handling.
 *
 * @see 04-mcp-testing.md section 3.1 for requirements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SessionNotFoundError,
  CellNotFoundError,
  StorageError,
  getSession,
  getCell,
  getSessionCell,
  getCodeCell,
  isCodeCell,
  isMarkdownCell,
  isTitleCell,
  isPackageJsonCell,
} from '../../server/session-accessor.mjs';
import * as sessionModule from '../../../session.mjs';
import type { SessionType } from '../../../types.mjs';
import type { CellType, CodeCellType, MarkdownCellType, TitleCellType } from '@srcbook/shared';

// Mock the session module
vi.mock('../../../session.mjs', () => ({
  findSession: vi.fn(),
  findCell: vi.fn(),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const mockCodeCell: CodeCellType = {
  id: 'cell-1',
  type: 'code',
  source: 'console.log("hello")',
  language: 'typescript',
  filename: 'index.ts',
  status: 'idle',
};

const mockMarkdownCell: MarkdownCellType = {
  id: 'cell-2',
  type: 'markdown',
  text: '# Header',
};

const mockTitleCell: TitleCellType = {
  id: 'cell-0',
  type: 'title',
  text: 'Test Notebook',
};

const mockSession: SessionType = {
  id: 'session-1',
  dir: '/tmp/srcbook/session-1',
  cells: [mockTitleCell, mockCodeCell, mockMarkdownCell],
  language: 'typescript',
  openedAt: Date.now(),
};

// =============================================================================
// Error Class Tests
// =============================================================================

describe('Error Classes', () => {
  describe('SessionNotFoundError', () => {
    it('has correct error code', () => {
      const error = new SessionNotFoundError('session-123');
      expect(error.code).toBe('SESSION_NOT_FOUND');
    });

    it('includes session ID in message', () => {
      const error = new SessionNotFoundError('session-123');
      expect(error.message).toContain('session-123');
    });

    it('has correct name', () => {
      const error = new SessionNotFoundError('session-123');
      expect(error.name).toBe('SessionNotFoundError');
    });
  });

  describe('CellNotFoundError', () => {
    it('has correct error code', () => {
      const error = new CellNotFoundError('cell-123', 'session-456');
      expect(error.code).toBe('CELL_NOT_FOUND');
    });

    it('includes cell and session IDs in message', () => {
      const error = new CellNotFoundError('cell-123', 'session-456');
      expect(error.message).toContain('cell-123');
      expect(error.message).toContain('session-456');
    });

    it('has correct name', () => {
      const error = new CellNotFoundError('cell-123', 'session-456');
      expect(error.name).toBe('CellNotFoundError');
    });
  });

  describe('StorageError', () => {
    it('has correct error code', () => {
      const error = new StorageError('Failed to write');
      expect(error.code).toBe('STORAGE_ERROR');
    });

    it('preserves cause when provided', () => {
      const cause = new Error('Disk full');
      const error = new StorageError('Failed to write', cause);
      expect(error.cause).toBe(cause);
    });

    it('has correct name', () => {
      const error = new StorageError('Failed to write');
      expect(error.name).toBe('StorageError');
    });
  });
});

// =============================================================================
// getSession Tests
// =============================================================================

describe('getSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns session when found', async () => {
    vi.mocked(sessionModule.findSession).mockResolvedValue(mockSession);

    const session = await getSession('session-1');

    expect(session).toBe(mockSession);
    expect(sessionModule.findSession).toHaveBeenCalledWith('session-1');
  });

  it('throws SessionNotFoundError when session not found', async () => {
    vi.mocked(sessionModule.findSession).mockRejectedValue(new Error('Session not found'));

    await expect(getSession('nonexistent')).rejects.toThrow(SessionNotFoundError);
    await expect(getSession('nonexistent')).rejects.toThrow('nonexistent');
  });

  it('SessionNotFoundError has correct code', async () => {
    vi.mocked(sessionModule.findSession).mockRejectedValue(new Error('Session not found'));

    try {
      await getSession('nonexistent');
    } catch (error) {
      expect(error).toBeInstanceOf(SessionNotFoundError);
      expect((error as SessionNotFoundError).code).toBe('SESSION_NOT_FOUND');
    }
  });
});

// =============================================================================
// getCell Tests
// =============================================================================

describe('getCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns cell when found', () => {
    vi.mocked(sessionModule.findCell).mockReturnValue(mockCodeCell);

    const cell = getCell(mockSession, 'cell-1');

    expect(cell).toBe(mockCodeCell);
    expect(sessionModule.findCell).toHaveBeenCalledWith(mockSession, 'cell-1');
  });

  it('throws CellNotFoundError when cell not found', () => {
    vi.mocked(sessionModule.findCell).mockReturnValue(undefined);

    expect(() => getCell(mockSession, 'nonexistent')).toThrow(CellNotFoundError);
    expect(() => getCell(mockSession, 'nonexistent')).toThrow('nonexistent');
  });

  it('CellNotFoundError includes session ID', () => {
    vi.mocked(sessionModule.findCell).mockReturnValue(undefined);

    try {
      getCell(mockSession, 'nonexistent');
    } catch (error) {
      expect(error).toBeInstanceOf(CellNotFoundError);
      expect((error as CellNotFoundError).message).toContain('session-1');
    }
  });
});

// =============================================================================
// getSessionCell Tests
// =============================================================================

describe('getSessionCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns both session and cell when found', async () => {
    vi.mocked(sessionModule.findSession).mockResolvedValue(mockSession);
    vi.mocked(sessionModule.findCell).mockReturnValue(mockCodeCell);

    const result = await getSessionCell('session-1', 'cell-1');

    expect(result.session).toBe(mockSession);
    expect(result.cell).toBe(mockCodeCell);
  });

  it('throws SessionNotFoundError when session not found', async () => {
    vi.mocked(sessionModule.findSession).mockRejectedValue(new Error('Not found'));

    await expect(getSessionCell('nonexistent', 'cell-1')).rejects.toThrow(SessionNotFoundError);
  });

  it('throws CellNotFoundError when cell not found', async () => {
    vi.mocked(sessionModule.findSession).mockResolvedValue(mockSession);
    vi.mocked(sessionModule.findCell).mockReturnValue(undefined);

    await expect(getSessionCell('session-1', 'nonexistent')).rejects.toThrow(CellNotFoundError);
  });
});

// =============================================================================
// getCodeCell Tests
// =============================================================================

describe('getCodeCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns session and narrowed code cell when found', async () => {
    vi.mocked(sessionModule.findSession).mockResolvedValue(mockSession);
    vi.mocked(sessionModule.findCell).mockReturnValue(mockCodeCell);

    const result = await getCodeCell('session-1', 'cell-1');

    expect(result.session).toBe(mockSession);
    expect(result.cell).toBe(mockCodeCell);
    expect(result.cell.type).toBe('code');
  });

  it('throws CellNotFoundError when cell is not a code cell', async () => {
    vi.mocked(sessionModule.findSession).mockResolvedValue(mockSession);
    vi.mocked(sessionModule.findCell).mockReturnValue(mockMarkdownCell);

    await expect(getCodeCell('session-1', 'cell-2')).rejects.toThrow(CellNotFoundError);
  });

  it('throws SessionNotFoundError when session not found', async () => {
    vi.mocked(sessionModule.findSession).mockRejectedValue(new Error('Not found'));

    await expect(getCodeCell('nonexistent', 'cell-1')).rejects.toThrow(SessionNotFoundError);
  });
});

// =============================================================================
// Type Guard Tests
// =============================================================================

describe('Type Guards', () => {
  describe('isCodeCell', () => {
    it('returns true for code cells', () => {
      expect(isCodeCell(mockCodeCell)).toBe(true);
    });

    it('returns false for non-code cells', () => {
      expect(isCodeCell(mockMarkdownCell)).toBe(false);
      expect(isCodeCell(mockTitleCell)).toBe(false);
    });
  });

  describe('isMarkdownCell', () => {
    it('returns true for markdown cells', () => {
      expect(isMarkdownCell(mockMarkdownCell)).toBe(true);
    });

    it('returns false for non-markdown cells', () => {
      expect(isMarkdownCell(mockCodeCell)).toBe(false);
      expect(isMarkdownCell(mockTitleCell)).toBe(false);
    });
  });

  describe('isTitleCell', () => {
    it('returns true for title cells', () => {
      expect(isTitleCell(mockTitleCell)).toBe(true);
    });

    it('returns false for non-title cells', () => {
      expect(isTitleCell(mockCodeCell)).toBe(false);
      expect(isTitleCell(mockMarkdownCell)).toBe(false);
    });
  });

  describe('isPackageJsonCell', () => {
    const mockPackageJsonCell = {
      id: 'cell-pkg',
      type: 'package.json' as const,
      source: '{}',
      filename: 'package.json',
    };

    it('returns true for package.json cells', () => {
      expect(isPackageJsonCell(mockPackageJsonCell as CellType)).toBe(true);
    });

    it('returns false for non-package.json cells', () => {
      expect(isPackageJsonCell(mockCodeCell)).toBe(false);
      expect(isPackageJsonCell(mockMarkdownCell)).toBe(false);
    });
  });
});
