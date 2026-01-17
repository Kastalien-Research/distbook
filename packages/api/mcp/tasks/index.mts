/**
 * MCP Tasks Implementation
 *
 * Implements the experimental Tasks utility from MCP spec 2025-11-25.
 * Tasks provide durable state machines for long-running operations with:
 * - Unique task IDs for tracking
 * - Status lifecycle management
 * - Polling and result retrieval
 * - TTL-based cleanup
 *
 * @see https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks
 */

import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

// =============================================================================
// Types (aligned with MCP SDK)
// =============================================================================

/**
 * Task status values per MCP spec
 */
export type TaskStatus = 'working' | 'input_required' | 'completed' | 'failed' | 'cancelled';

/**
 * Terminal statuses that indicate task is done
 */
export type TerminalStatus = 'completed' | 'failed' | 'cancelled';

/**
 * Task metadata per MCP spec
 */
export interface Task {
  taskId: string;
  status: TaskStatus;
  statusMessage?: string;
  createdAt: string; // ISO 8601
  lastUpdatedAt: string; // ISO 8601
  ttl: number | null; // milliseconds from creation, null for unlimited
  pollInterval?: number; // suggested polling interval in ms
}

/**
 * Task creation parameters
 */
export interface TaskCreationParams {
  ttl?: number | null; // requested TTL in ms
}

/**
 * Internal task state
 */
interface TaskState<T = unknown> {
  task: Task;
  result?: T; // The actual operation result
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  executor?: Promise<void>; // The running execution promise
  authContext?: string; // For access control
}

// =============================================================================
// Task Manager
// =============================================================================

export class TaskManager extends EventEmitter {
  private tasks: Map<string, TaskState> = new Map();
  private cleanupIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Configuration
  private readonly maxConcurrentTasks: number;
  private readonly maxTtl: number;
  private readonly defaultTtl: number;
  private readonly defaultPollInterval: number;

  constructor(options?: {
    maxConcurrentTasks?: number;
    maxTtl?: number; // Maximum TTL in ms
    defaultTtl?: number; // Default TTL in ms
    defaultPollInterval?: number; // Default poll interval in ms
  }) {
    super();
    this.maxConcurrentTasks = options?.maxConcurrentTasks ?? 100;
    this.maxTtl = options?.maxTtl ?? 3600000; // 1 hour default max
    this.defaultTtl = options?.defaultTtl ?? 300000; // 5 minutes default
    this.defaultPollInterval = options?.defaultPollInterval ?? 2000; // 2 seconds
  }

  /**
   * Create a new task
   *
   * @param params Task creation parameters
   * @param authContext Optional auth context for access control
   * @returns Task object
   */
  createTask(params?: TaskCreationParams, authContext?: string): Task {
    // Check concurrent task limit
    const activeTasks = Array.from(this.tasks.values()).filter(
      (t) => !this.isTerminalStatus(t.task.status as TaskStatus),
    );

    if (activeTasks.length >= this.maxConcurrentTasks) {
      throw new Error(`Maximum concurrent tasks (${this.maxConcurrentTasks}) reached`);
    }

    // Generate task ID
    const taskId = uuidv4();

    // Determine TTL
    let ttl = params?.ttl ?? this.defaultTtl;
    if (ttl !== null && ttl > this.maxTtl) {
      ttl = this.maxTtl;
    }

    const now = new Date().toISOString();

    const task: Task = {
      taskId,
      status: 'working',
      createdAt: now,
      lastUpdatedAt: now,
      ttl,
      pollInterval: this.defaultPollInterval,
    };

    // Store task state
    this.tasks.set(taskId, {
      task,
      authContext,
    });

    // Schedule cleanup if TTL is set
    if (ttl !== null) {
      const timeout = setTimeout(() => {
        this.deleteTask(taskId);
      }, ttl);
      this.cleanupIntervals.set(taskId, timeout);
    }

    console.log(`[MCP Tasks] Created task ${taskId} with ttl=${ttl}ms`);

    return task;
  }

  /**
   * Get task by ID
   *
   * @param taskId Task ID
   * @param authContext Optional auth context for access control
   * @returns Task object or undefined
   */
  getTask(taskId: string, authContext?: string): Task | undefined {
    const state = this.tasks.get(taskId);
    if (!state) {
      return undefined;
    }

    // Check auth context if provided
    if (authContext !== undefined && state.authContext !== authContext) {
      throw new Error('Access denied: task belongs to different context');
    }

    return state.task;
  }

  /**
   * Get all tasks (with optional auth filtering)
   *
   * @param authContext Optional auth context for filtering
   * @returns Array of tasks
   */
  listTasks(authContext?: string): Task[] {
    const tasks: Task[] = [];

    for (const state of this.tasks.values()) {
      // Filter by auth context if provided
      if (authContext !== undefined && state.authContext !== authContext) {
        continue;
      }
      tasks.push(state.task);
    }

    return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Update task status
   *
   * @param taskId Task ID
   * @param status New status
   * @param statusMessage Optional status message
   * @param authContext Optional auth context
   */
  updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    statusMessage?: string,
    authContext?: string,
  ): void {
    const state = this.tasks.get(taskId);
    if (!state) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Check auth
    if (authContext !== undefined && state.authContext !== authContext) {
      throw new Error('Access denied: task belongs to different context');
    }

    // Validate status transition
    this.validateStatusTransition(state.task.status as TaskStatus, status);

    // Update task
    state.task.status = status;
    state.task.statusMessage = statusMessage;
    state.task.lastUpdatedAt = new Date().toISOString();

    console.log(`[MCP Tasks] Task ${taskId} status: ${status}`);

    // Emit status change event
    this.emit('taskStatusChanged', state.task);

    // If terminal status, stop execution
    if (this.isTerminalStatus(status)) {
      this.emit('taskCompleted', state.task);
    }
  }

  /**
   * Set task result
   *
   * @param taskId Task ID
   * @param result The operation result
   * @param authContext Optional auth context
   */
  setTaskResult<T>(taskId: string, result: T, authContext?: string): void {
    const state = this.tasks.get(taskId);
    if (!state) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Check auth
    if (authContext !== undefined && state.authContext !== authContext) {
      throw new Error('Access denied: task belongs to different context');
    }

    state.result = result;
  }

  /**
   * Set task error
   *
   * @param taskId Task ID
   * @param error Error information
   * @param authContext Optional auth context
   */
  setTaskError(
    taskId: string,
    error: { code: number; message: string; data?: unknown },
    authContext?: string,
  ): void {
    const state = this.tasks.get(taskId);
    if (!state) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Check auth
    if (authContext !== undefined && state.authContext !== authContext) {
      throw new Error('Access denied: task belongs to different context');
    }

    state.error = error;
  }

  /**
   * Get task result (blocks until terminal state if not ready)
   *
   * @param taskId Task ID
   * @param authContext Optional auth context
   * @returns Task result or throws error
   */
  async getTaskResult<T>(taskId: string, authContext?: string): Promise<T> {
    const state = this.tasks.get(taskId);
    if (!state) {
      throw { code: -32602, message: `Task ${taskId} not found` };
    }

    // Check auth
    if (authContext !== undefined && state.authContext !== authContext) {
      throw { code: -32602, message: 'Access denied: task belongs to different context' };
    }

    // Wait until terminal status
    if (!this.isTerminalStatus(state.task.status as TaskStatus)) {
      await new Promise<void>((resolve) => {
        const checkStatus = (task: Task) => {
          if (task.taskId === taskId && this.isTerminalStatus(task.status as TaskStatus)) {
            this.off('taskStatusChanged', checkStatus);
            resolve();
          }
        };
        this.on('taskStatusChanged', checkStatus);
      });
    }

    // Return result or throw error
    if (state.error) {
      throw state.error;
    }

    if (state.result === undefined) {
      throw { code: -32603, message: 'Task completed but no result available' };
    }

    return state.result as T;
  }

  /**
   * Cancel a task
   *
   * @param taskId Task ID
   * @param authContext Optional auth context
   */
  async cancelTask(taskId: string, authContext?: string): Promise<Task> {
    const state = this.tasks.get(taskId);
    if (!state) {
      throw { code: -32602, message: `Task ${taskId} not found` };
    }

    // Check auth
    if (authContext !== undefined && state.authContext !== authContext) {
      throw { code: -32602, message: 'Access denied: task belongs to different context' };
    }

    // Cannot cancel terminal tasks
    if (this.isTerminalStatus(state.task.status as TaskStatus)) {
      throw {
        code: -32602,
        message: `Cannot cancel task: already in terminal status '${state.task.status}'`,
      };
    }

    // Update status
    this.updateTaskStatus(taskId, 'cancelled', 'Task was cancelled by request', authContext);

    return state.task;
  }

  /**
   * Delete a task (cleanup)
   *
   * @param taskId Task ID
   */
  deleteTask(taskId: string): void {
    const state = this.tasks.get(taskId);
    if (!state) {
      return;
    }

    // Clear cleanup timeout
    const timeout = this.cleanupIntervals.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.cleanupIntervals.delete(taskId);
    }

    // Remove task
    this.tasks.delete(taskId);
    console.log(`[MCP Tasks] Deleted task ${taskId}`);
  }

  /**
   * Execute an operation as a task
   *
   * @param operation The async operation to execute
   * @param params Task creation parameters
   * @param authContext Optional auth context
   * @returns Task object
   */
  async executeAsTask<T>(
    operation: () => Promise<T>,
    params?: TaskCreationParams,
    authContext?: string,
  ): Promise<{ task: Task; execution: Promise<T> }> {
    // Create task
    const task = this.createTask(params, authContext);
    const taskId = task.taskId;

    // Execute operation asynchronously
    const execution = operation()
      .then((result) => {
        this.setTaskResult(taskId, result, authContext);
        this.updateTaskStatus(taskId, 'completed', undefined, authContext);
        return result;
      })
      .catch((error) => {
        const taskError = {
          code: error.code ?? -32603,
          message: error.message ?? 'Operation failed',
          data: error.data,
        };
        this.setTaskError(taskId, taskError, authContext);
        this.updateTaskStatus(taskId, 'failed', error.message, authContext);
        throw error;
      });

    // Store executor promise
    const state = this.tasks.get(taskId);
    if (state) {
      state.executor = execution.then(() => {}).catch(() => {});
    }

    return { task, execution };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Check if status is terminal
   */
  private isTerminalStatus(status: TaskStatus): status is TerminalStatus {
    return status === 'completed' || status === 'failed' || status === 'cancelled';
  }

  /**
   * Validate status transition per MCP spec
   */
  private validateStatusTransition(from: TaskStatus, to: TaskStatus): void {
    // Terminal states cannot transition
    if (this.isTerminalStatus(from)) {
      throw new Error(`Cannot transition from terminal status '${from}' to '${to}'`);
    }

    // Valid transitions:
    // working -> input_required, completed, failed, cancelled
    // input_required -> working, completed, failed, cancelled

    const validTransitions: Record<TaskStatus, TaskStatus[]> = {
      working: ['input_required', 'completed', 'failed', 'cancelled'],
      input_required: ['working', 'completed', 'failed', 'cancelled'],
      completed: [],
      failed: [],
      cancelled: [],
    };

    if (!validTransitions[from].includes(to)) {
      throw new Error(`Invalid status transition from '${from}' to '${to}'`);
    }
  }

  /**
   * Get task count by status
   */
  getTaskCountByStatus(authContext?: string): Record<TaskStatus, number> {
    const counts: Record<TaskStatus, number> = {
      working: 0,
      input_required: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const state of this.tasks.values()) {
      if (authContext !== undefined && state.authContext !== authContext) {
        continue;
      }
      counts[state.task.status as TaskStatus]++;
    }

    return counts;
  }

  /**
   * Clean up expired tasks
   */
  cleanupExpiredTasks(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [taskId, state] of this.tasks.entries()) {
      if (state.task.ttl === null) {
        continue;
      }

      const createdAt = new Date(state.task.createdAt).getTime();
      const expiresAt = createdAt + state.task.ttl;

      if (now > expiresAt) {
        this.deleteTask(taskId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[MCP Tasks] Cleaned up ${cleaned} expired tasks`);
    }

    return cleaned;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const taskManager = new TaskManager({
  maxConcurrentTasks: 100,
  maxTtl: 3600000, // 1 hour
  defaultTtl: 300000, // 5 minutes
  defaultPollInterval: 2000, // 2 seconds
});

// Periodic cleanup
setInterval(() => {
  taskManager.cleanupExpiredTasks();
}, 60000); // Clean up every minute
