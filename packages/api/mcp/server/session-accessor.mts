/**
 * MCP Session Accessor Module
 *
 * Type-safe session and cell access with proper error types for MCP responses.
 *
 * @see 04-mcp-testing.md section 3.1 for requirements
 */

import type { CellType, CodeCellType } from '@srcbook/shared';
import type { SessionType } from '../../types.mjs';
import { findSession, findCell } from '../../session.mjs';

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when a session cannot be found.
 * Provides structured error code for MCP error responses.
 */
export class SessionNotFoundError extends Error {
  readonly code = 'SESSION_NOT_FOUND' as const;

  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
  }
}

/**
 * Error thrown when a cell cannot be found within a session.
 * Provides structured error code for MCP error responses.
 */
export class CellNotFoundError extends Error {
  readonly code = 'CELL_NOT_FOUND' as const;

  constructor(cellId: string, sessionId: string) {
    super(`Cell not found: ${cellId} in session ${sessionId}`);
    this.name = 'CellNotFoundError';
  }
}

/**
 * Error thrown for storage/persistence failures.
 * Provides structured error code for MCP error responses.
 */
export class StorageError extends Error {
  readonly code = 'STORAGE_ERROR' as const;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'StorageError';
    if (cause) {
      this.cause = cause;
    }
  }
}

// =============================================================================
// Session Accessors
// =============================================================================

/**
 * Get a session by ID with proper error handling.
 *
 * @throws {SessionNotFoundError} if session doesn't exist
 */
export async function getSession(sessionId: string): Promise<SessionType> {
  try {
    return await findSession(sessionId);
  } catch (error) {
    // findSession throws a generic Error; wrap it in our typed error
    throw new SessionNotFoundError(sessionId);
  }
}

/**
 * Get a cell from a session with proper error handling.
 *
 * @throws {CellNotFoundError} if cell doesn't exist in session
 */
export function getCell(session: SessionType, cellId: string): CellType {
  const cell = findCell(session, cellId);
  if (!cell) {
    throw new CellNotFoundError(cellId, session.id);
  }
  return cell;
}

/**
 * Get both session and cell in one call.
 *
 * @throws {SessionNotFoundError} if session doesn't exist
 * @throws {CellNotFoundError} if cell doesn't exist in session
 */
export async function getSessionCell(
  sessionId: string,
  cellId: string,
): Promise<{ session: SessionType; cell: CellType }> {
  const session = await getSession(sessionId);
  const cell = getCell(session, cellId);
  return { session, cell };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for code cells.
 * Use this to safely narrow a CellType to CodeCellType.
 */
export function isCodeCell(cell: CellType): cell is CodeCellType {
  return cell.type === 'code';
}

/**
 * Type guard for markdown cells.
 */
export function isMarkdownCell(cell: CellType): cell is Extract<CellType, { type: 'markdown' }> {
  return cell.type === 'markdown';
}

/**
 * Type guard for title cells.
 */
export function isTitleCell(cell: CellType): cell is Extract<CellType, { type: 'title' }> {
  return cell.type === 'title';
}

/**
 * Type guard for package.json cells.
 */
export function isPackageJsonCell(
  cell: CellType,
): cell is Extract<CellType, { type: 'package.json' }> {
  return cell.type === 'package.json';
}

// =============================================================================
// Combined Accessors with Type Narrowing
// =============================================================================

/**
 * Get a code cell from a session, with type narrowing.
 *
 * @throws {SessionNotFoundError} if session doesn't exist
 * @throws {CellNotFoundError} if cell doesn't exist or is not a code cell
 */
export async function getCodeCell(
  sessionId: string,
  cellId: string,
): Promise<{ session: SessionType; cell: CodeCellType }> {
  const { session, cell } = await getSessionCell(sessionId, cellId);

  if (!isCodeCell(cell)) {
    throw new CellNotFoundError(
      cellId,
      sessionId,
    );
  }

  return { session, cell };
}
