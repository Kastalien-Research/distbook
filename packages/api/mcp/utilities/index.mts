/**
 * MCP Utilities Implementation
 *
 * Implements three core utilities from MCP spec 2025-11-25:
 * 1. Logging - Structured log messages with severity levels
 * 2. Progress - Progress tracking for long-running operations
 * 3. Pagination - Cursor-based pagination for list operations
 *
 * @see https://modelcontextprotocol.io/specification/2025-11-25/
 */

import { EventEmitter } from 'events';

// =============================================================================
// Logging Utility
// =============================================================================

/**
 * Log levels per RFC 5424 (syslog severity)
 */
export type LogLevel =
  | 'debug'
  | 'info'
  | 'notice'
  | 'warning'
  | 'error'
  | 'critical'
  | 'alert'
  | 'emergency';

/**
 * Numeric mapping of log levels (for comparison)
 */
const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  notice: 2,
  warning: 3,
  error: 4,
  critical: 5,
  alert: 6,
  emergency: 7,
};

/**
 * Log message structure
 */
export interface LogMessage {
  level: LogLevel;
  logger?: string; // Optional logger name
  data: unknown; // Arbitrary JSON-serializable data
  timestamp?: string; // ISO 8601 timestamp
}

/**
 * Logger for MCP servers
 */
export class MCPLogger extends EventEmitter {
  private minLevel: LogLevel = 'info';
  private messageCount = 0;
  private readonly maxMessagesPerSecond: number;
  private lastSecond = 0;
  private messagesThisSecond = 0;

  constructor(options?: { maxMessagesPerSecond?: number }) {
    super();
    this.maxMessagesPerSecond = options?.maxMessagesPerSecond ?? 100;
  }

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    if (!LOG_LEVEL_VALUES.hasOwnProperty(level)) {
      throw new Error(`Invalid log level: ${level}`);
    }
    this.minLevel = level;
    console.log(`[MCP Logger] Log level set to: ${level}`);
  }

  /**
   * Get current minimum log level
   */
  getLevel(): LogLevel {
    return this.minLevel;
  }

  /**
   * Log a message (emits if level is sufficient)
   */
  log(level: LogLevel, data: unknown, logger?: string): void {
    // Check if level is sufficient
    if (LOG_LEVEL_VALUES[level] < LOG_LEVEL_VALUES[this.minLevel]) {
      return;
    }

    // Rate limiting
    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);

    if (currentSecond !== this.lastSecond) {
      this.lastSecond = currentSecond;
      this.messagesThisSecond = 0;
    }

    if (this.messagesThisSecond >= this.maxMessagesPerSecond) {
      // Drop message due to rate limiting
      return;
    }

    this.messagesThisSecond++;
    this.messageCount++;

    const message: LogMessage = {
      level,
      logger,
      data,
      timestamp: new Date(now).toISOString(),
    };

    // Emit log message event
    this.emit('message', message);
  }

  // Convenience methods
  debug(data: unknown, logger?: string): void {
    this.log('debug', data, logger);
  }

  info(data: unknown, logger?: string): void {
    this.log('info', data, logger);
  }

  notice(data: unknown, logger?: string): void {
    this.log('notice', data, logger);
  }

  warning(data: unknown, logger?: string): void {
    this.log('warning', data, logger);
  }

  error(data: unknown, logger?: string): void {
    this.log('error', data, logger);
  }

  critical(data: unknown, logger?: string): void {
    this.log('critical', data, logger);
  }

  alert(data: unknown, logger?: string): void {
    this.log('alert', data, logger);
  }

  emergency(data: unknown, logger?: string): void {
    this.log('emergency', data, logger);
  }

  /**
   * Get total message count
   */
  getMessageCount(): number {
    return this.messageCount;
  }
}

// =============================================================================
// Progress Tracking Utility
// =============================================================================

/**
 * Progress token (string or number)
 */
export type ProgressToken = string | number;

/**
 * Progress notification data
 */
export interface ProgressNotification {
  progressToken: ProgressToken;
  progress: number; // Current progress value
  total?: number; // Optional total value
  message?: string; // Optional human-readable message
  timestamp?: string; // ISO 8601 timestamp
}

/**
 * Progress tracker for long-running operations
 */
export class ProgressTracker extends EventEmitter {
  private activeTokens: Map<
    ProgressToken,
    {
      lastProgress: number;
      lastUpdate: number;
      metadata?: unknown;
    }
  > = new Map();

  private readonly minUpdateInterval: number; // Minimum ms between updates

  constructor(options?: { minUpdateInterval?: number }) {
    super();
    this.minUpdateInterval = options?.minUpdateInterval ?? 100; // 100ms minimum
  }

  /**
   * Register a new progress token
   */
  register(token: ProgressToken, metadata?: unknown): void {
    if (this.activeTokens.has(token)) {
      throw new Error(`Progress token ${token} is already active`);
    }

    this.activeTokens.set(token, {
      lastProgress: 0,
      lastUpdate: 0,
      metadata,
    });

    console.log(`[MCP Progress] Registered token: ${token}`);
  }

  /**
   * Send progress notification
   */
  notify(notification: Omit<ProgressNotification, 'timestamp'>): void {
    const { progressToken, progress, total, message } = notification;

    // Check if token is active
    const state = this.activeTokens.get(progressToken);
    if (!state) {
      console.warn(`[MCP Progress] Token ${progressToken} is not active`);
      return;
    }

    // Validate progress is increasing
    if (progress < state.lastProgress) {
      console.warn(
        `[MCP Progress] Progress decreased for token ${progressToken}: ${state.lastProgress} -> ${progress}`,
      );
    }

    // Rate limiting
    const now = Date.now();
    if (now - state.lastUpdate < this.minUpdateInterval) {
      return; // Skip update
    }

    // Update state
    state.lastProgress = progress;
    state.lastUpdate = now;

    const fullNotification: ProgressNotification = {
      progressToken,
      progress,
      total,
      message,
      timestamp: new Date(now).toISOString(),
    };

    // Emit progress event
    this.emit('progress', fullNotification);
  }

  /**
   * Complete progress tracking (removes token)
   */
  complete(token: ProgressToken): void {
    if (!this.activeTokens.has(token)) {
      console.warn(`[MCP Progress] Token ${token} is not active`);
      return;
    }

    this.activeTokens.delete(token);
    console.log(`[MCP Progress] Completed token: ${token}`);
  }

  /**
   * Check if token is active
   */
  isActive(token: ProgressToken): boolean {
    return this.activeTokens.has(token);
  }

  /**
   * Get active token count
   */
  getActiveCount(): number {
    return this.activeTokens.size;
  }

  /**
   * Create a progress reporter function for a token
   */
  createReporter(
    token: ProgressToken,
    total?: number,
  ): (progress: number, message?: string) => void {
    this.register(token);

    return (progress: number, message?: string) => {
      this.notify({ progressToken: token, progress, total, message });
    };
  }
}

// =============================================================================
// Pagination Utility
// =============================================================================

/**
 * Opaque cursor for pagination
 */
export type PaginationCursor = string;

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: PaginationCursor;
}

/**
 * Pagination state
 */
interface PaginationState {
  offset: number;
  pageSize: number;
  timestamp: number;
}

/**
 * Paginator for list operations
 */
export class Paginator {
  private readonly defaultPageSize: number;
  private readonly maxPageSize: number;
  private readonly cursorExpiration: number; // ms

  constructor(options?: {
    defaultPageSize?: number;
    maxPageSize?: number;
    cursorExpiration?: number;
  }) {
    this.defaultPageSize = options?.defaultPageSize ?? 50;
    this.maxPageSize = options?.maxPageSize ?? 1000;
    this.cursorExpiration = options?.cursorExpiration ?? 3600000; // 1 hour
  }

  /**
   * Create a pagination cursor
   */
  createCursor(offset: number, pageSize?: number): PaginationCursor {
    const state: PaginationState = {
      offset,
      pageSize: pageSize ?? this.defaultPageSize,
      timestamp: Date.now(),
    };

    // Base64 encode the state
    const json = JSON.stringify(state);
    return Buffer.from(json).toString('base64url');
  }

  /**
   * Parse a pagination cursor
   */
  parseCursor(cursor: PaginationCursor): { offset: number; pageSize: number } {
    try {
      const json = Buffer.from(cursor, 'base64url').toString('utf-8');
      const state: PaginationState = JSON.parse(json);

      // Check expiration
      const age = Date.now() - state.timestamp;
      if (age > this.cursorExpiration) {
        throw new Error('Cursor has expired');
      }

      // Validate page size
      if (state.pageSize > this.maxPageSize) {
        throw new Error(`Page size ${state.pageSize} exceeds maximum ${this.maxPageSize}`);
      }

      return {
        offset: state.offset,
        pageSize: state.pageSize,
      };
    } catch (error) {
      throw {
        code: -32602,
        message: `Invalid cursor: ${error instanceof Error ? error.message : 'unknown error'}`,
      };
    }
  }

  /**
   * Paginate an array of items
   */
  paginate<T>(
    items: T[],
    cursor?: PaginationCursor,
    pageSize?: number,
  ): PaginatedResult<T> {
    const effectivePageSize = Math.min(pageSize ?? this.defaultPageSize, this.maxPageSize);

    let offset = 0;
    if (cursor) {
      const parsed = this.parseCursor(cursor);
      offset = parsed.offset;
    }

    // Slice the items
    const page = items.slice(offset, offset + effectivePageSize);

    // Create next cursor if more items exist
    const hasMore = offset + effectivePageSize < items.length;
    const nextCursor = hasMore ? this.createCursor(offset + effectivePageSize, effectivePageSize) : undefined;

    return {
      items: page,
      nextCursor,
    };
  }

  /**
   * Create a paginator function for an array
   */
  createPaginator<T>(
    items: T[],
    pageSize?: number,
  ): (cursor?: PaginationCursor) => PaginatedResult<T> {
    return (cursor?: PaginationCursor) => this.paginate(items, cursor, pageSize);
  }
}

// =============================================================================
// Singleton Instances
// =============================================================================

export const logger = new MCPLogger({ maxMessagesPerSecond: 100 });
export const progressTracker = new ProgressTracker({ minUpdateInterval: 100 });
export const paginator = new Paginator({
  defaultPageSize: 50,
  maxPageSize: 1000,
  cursorExpiration: 3600000,
});
