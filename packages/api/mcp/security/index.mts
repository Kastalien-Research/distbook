/**
 * MCP Security Module
 *
 * Implements the security framework for MCP integration:
 * - Transport Security: TLS, process isolation, origin validation
 * - Authentication & Authorization: Tokens, allowlists, approval workflow
 * - Input Validation: Schema validation, security checks
 * - Rate Limiting: Per-client request throttling
 * - Session Management: Timeout, limits, isolation
 * - Audit Logging: Operation logging with redaction
 *
 * @see 03-mcp-security.md for full specification
 */

import { createHash, randomBytes } from 'node:crypto';

// =============================================================================
// Types
// =============================================================================

export interface MCPTokenInfo {
  id: string;
  clientName: string;
  permissions: string[];
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt?: Date;
  isValid: boolean;
}

export interface ApprovalRequest {
  id: string;
  operation: string;
  description: string;
  clientId: string;
  serverId?: string;
  toolName?: string;
  input?: Record<string, unknown>;
  sessionId?: string;
  requestedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  timeout: number;
}

export interface ApprovalResponse {
  approved: boolean;
  rememberedFor?: 'session' | 'always' | 'never';
}

export interface MCPSession {
  id: string;
  clientId: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  permissions: Set<string>;
  approvals: Map<string, 'session' | 'always'>;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  requiresApproval?: boolean;
  message?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'security';
  category: 'mcp_server' | 'mcp_client' | 'authentication' | 'authorization';
  operation: string;
  clientId?: string;
  sessionId?: string;
  serverId?: string;
  input?: unknown;
  output?: unknown;
  error?: string;
  duration?: number;
  metadata: Record<string, unknown>;
}

export interface ServerAllowlistEntry {
  name: string;
  command?: string;
  commandPattern?: RegExp;
  url?: string;
  urlPattern?: RegExp;
  allowedEnv: string[];
}

// =============================================================================
// Constants
// =============================================================================

export const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
export const MAX_SESSIONS = 10;
export const MAX_INPUT_SIZE = 1024 * 1024; // 1MB
export const MAX_AUDIT_LOG_SIZE = 1000;

// =============================================================================
// Rate Limit Configuration
// =============================================================================

export const rateLimits: Record<string, RateLimitConfig> = {
  'tool:invoke': {
    windowMs: 60000,
    maxRequests: 100,
    message: 'Tool invocation rate limit exceeded',
  },
  'resource:read': {
    windowMs: 60000,
    maxRequests: 200,
    message: 'Resource read rate limit exceeded',
  },
  'notebook:create': {
    windowMs: 60000,
    maxRequests: 10,
    message: 'Notebook creation rate limit exceeded',
  },
  'auth:token': {
    windowMs: 60000,
    maxRequests: 5,
    message: 'Token generation rate limit exceeded',
  },
};

// =============================================================================
// Redaction Patterns
// =============================================================================

const REDACTION_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /bearer/i,
  /credential/i,
  /private/i,
];

// =============================================================================
// Server Allowlist
// =============================================================================

export const defaultServerAllowlist: ServerAllowlistEntry[] = [
  {
    name: 'PostgreSQL',
    command: 'npx',
    commandPattern: /^-y\s+@modelcontextprotocol\/server-postgres$/,
    allowedEnv: ['DATABASE_URL', 'PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE'],
  },
  {
    name: 'Filesystem',
    command: 'npx',
    commandPattern: /^-y\s+@modelcontextprotocol\/server-filesystem\s+.*$/,
    allowedEnv: [],
  },
  {
    name: 'SQLite',
    command: 'npx',
    commandPattern: /^-y\s+@modelcontextprotocol\/server-sqlite$/,
    allowedEnv: ['SQLITE_DB_PATH'],
  },
];

// =============================================================================
// Token Management
// =============================================================================

/**
 * Generate a new MCP token
 */
export function generateToken(): { token: string; hash: string } {
  const tokenBytes = randomBytes(32);
  const token = 'srcbook_mcp_' + tokenBytes.toString('base64url');
  const hash = hashToken(token);
  return { token, hash };
}

/**
 * Hash a token for storage
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Validate a token against its hash using timing-safe comparison
 */
export function validateToken(token: string, storedHash: string): boolean {
  const inputHash = hashToken(token);
  return timingSafeEqual(inputHash, storedHash);
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }
  return parts[1];
}

// =============================================================================
// Permission Checking
// =============================================================================

export type MCPPermission =
  | 'tools:execute'
  | 'tools:list'
  | 'resources:read'
  | 'resources:subscribe'
  | 'prompts:list'
  | 'prompts:execute'
  | 'sampling:create'
  | 'notebooks:create'
  | 'notebooks:delete'
  | 'notebooks:export'
  | '*';

/**
 * Check if a set of permissions includes a specific permission
 */
export function hasPermission(permissions: string[], required: MCPPermission): boolean {
  if (permissions.includes('*')) {
    return true;
  }
  if (permissions.includes(required)) {
    return true;
  }
  const [category] = required.split(':');
  if (permissions.includes(`${category}:*`)) {
    return true;
  }
  return false;
}

/**
 * Get default permissions for a new token
 */
export function getDefaultPermissions(): MCPPermission[] {
  return ['tools:list', 'resources:read', 'prompts:list'];
}

/**
 * Operations that require user approval
 */
export const APPROVAL_REQUIRED_OPERATIONS = [
  'notebook_delete',
  'notebook_export',
  'server:install',
  'first_connection',
];

// =============================================================================
// Rate Limiting
// =============================================================================

interface RateLimitBucket {
  count: number;
  windowStart: number;
}

const rateLimitBuckets = new Map<string, RateLimitBucket>();

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  clientId: string,
  operation: string,
): { allowed: boolean; message?: string } {
  const config = rateLimits[operation];
  if (!config) {
    return { allowed: true };
  }

  const key = `${clientId}:${operation}`;
  const now = Date.now();
  let bucket = rateLimitBuckets.get(key);

  if (!bucket || now - bucket.windowStart >= config.windowMs) {
    bucket = { count: 0, windowStart: now };
    rateLimitBuckets.set(key, bucket);
  }

  bucket.count++;

  if (bucket.count > config.maxRequests) {
    return { allowed: false, message: config.message };
  }

  return { allowed: true };
}

/**
 * Reset rate limit for a client
 */
export function resetRateLimit(clientId: string, operation?: string): void {
  if (operation) {
    rateLimitBuckets.delete(`${clientId}:${operation}`);
  } else {
    for (const key of rateLimitBuckets.keys()) {
      if (key.startsWith(`${clientId}:`)) {
        rateLimitBuckets.delete(key);
      }
    }
  }
}

// =============================================================================
// Input Validation
// =============================================================================

/**
 * Validate tool input for security issues
 */
export function validateSecurityInput(input: unknown): ValidationResult {
  const errors: string[] = [];

  // Check size
  const size = JSON.stringify(input).length;
  if (size > MAX_INPUT_SIZE) {
    errors.push(`Input too large: ${size} bytes (max: ${MAX_INPUT_SIZE})`);
  }

  // Walk object for security checks
  walkObject(input, (key, value) => {
    if (typeof value === 'string') {
      // Check for path traversal
      if (value.includes('../') || value.includes('..\\')) {
        errors.push(`Path traversal detected in ${key}`);
      }

      // Check for command injection patterns
      if (containsCommandInjection(value)) {
        errors.push(`Potential command injection in ${key}`);
      }

      // Check for null bytes
      if (value.includes('\0')) {
        errors.push(`Null byte detected in ${key}`);
      }
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Check for command injection patterns
 */
function containsCommandInjection(value: string): boolean {
  const patterns = [
    /;\s*\w+/,           // ; command
    /\|\s*\w+/,          // | command
    /`[^`]+`/,           // `command`
    /\$\([^)]+\)/,       // $(command)
    /&&\s*\w+/,          // && command
    /\|\|\s*\w+/,        // || command
  ];
  return patterns.some((p) => p.test(value));
}

/**
 * Walk object recursively
 */
function walkObject(
  obj: unknown,
  callback: (key: string, value: unknown) => void,
  path: string = '',
): void {
  if (typeof obj !== 'object' || obj === null) {
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key;
    callback(fullPath, value);
    if (typeof value === 'object' && value !== null) {
      walkObject(value, callback, fullPath);
    }
  }
}

/**
 * Validate resource URI
 */
export function validateResourceUri(uri: string): ValidationResult {
  const errors: string[] = [];

  // Check for allowed schemes
  const allowedSchemes = ['srcbook://', 'file://', 'https://', 'http://'];
  const hasValidScheme = allowedSchemes.some((scheme) => uri.startsWith(scheme));
  if (!hasValidScheme) {
    errors.push(`Invalid URI scheme. Allowed: ${allowedSchemes.join(', ')}`);
  }

  // Check for path traversal
  if (uri.includes('../') || uri.includes('..\\')) {
    errors.push('Path traversal detected in URI');
  }

  // Check for null bytes
  if (uri.includes('\0')) {
    errors.push('Null byte detected in URI');
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// Server Allowlist Validation
// =============================================================================

/**
 * Validate server configuration against allowlist
 */
export function validateServerConfig(
  config: { command?: string; args?: string[]; url?: string; env?: Record<string, string> },
  allowlist: ServerAllowlistEntry[] = defaultServerAllowlist,
): ValidationResult {
  // Check if server matches any allowlist entry
  const match = allowlist.find((entry) => {
    if (config.command && entry.command) {
      if (config.command !== entry.command) {
        return false;
      }
      if (entry.commandPattern && config.args) {
        const argsString = config.args.join(' ');
        if (!entry.commandPattern.test(argsString)) {
          return false;
        }
      }
      return true;
    }
    if (config.url && entry.url) {
      if (config.url === entry.url) {
        return true;
      }
      if (entry.urlPattern && entry.urlPattern.test(config.url)) {
        return true;
      }
    }
    return false;
  });

  if (!match) {
    return {
      valid: false,
      requiresApproval: true,
      message: 'Server not in allowlist. User approval required.',
    };
  }

  // Filter environment variables
  if (config.env) {
    const filteredEnv: Record<string, string> = {};
    for (const key of Object.keys(config.env)) {
      if (match.allowedEnv.includes(key)) {
        filteredEnv[key] = config.env[key];
      }
    }
    config.env = filteredEnv;
  }

  return { valid: true };
}

// =============================================================================
// Session Management
// =============================================================================

const sessions = new Map<string, MCPSession>();

/**
 * Create a new MCP session
 */
export async function createSession(clientId: string): Promise<MCPSession> {
  // Cleanup expired sessions
  cleanupExpiredSessions();

  // Check session limit
  if (sessions.size >= MAX_SESSIONS) {
    throw new Error('Maximum concurrent sessions reached');
  }

  const session: MCPSession = {
    id: crypto.randomUUID(),
    clientId,
    createdAt: new Date(),
    lastActivityAt: new Date(),
    expiresAt: new Date(Date.now() + SESSION_TIMEOUT),
    permissions: new Set(getDefaultPermissions()),
    approvals: new Map(),
  };

  sessions.set(session.id, session);
  console.log('[MCP Security] Session created:', session.id, 'for client:', clientId);

  return session;
}

/**
 * Get session by ID
 */
export function getSession(sessionId: string): MCPSession | undefined {
  const session = sessions.get(sessionId);
  if (session && new Date() > session.expiresAt) {
    sessions.delete(sessionId);
    return undefined;
  }
  return session;
}

/**
 * Update session activity
 */
export function updateSessionActivity(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) {
    return false;
  }
  session.lastActivityAt = new Date();
  session.expiresAt = new Date(Date.now() + SESSION_TIMEOUT);
  return true;
}

/**
 * End session
 */
export function endSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

/**
 * Cleanup expired sessions
 */
function cleanupExpiredSessions(): void {
  const now = new Date();
  for (const [id, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(id);
      console.log('[MCP Security] Session expired:', id);
    }
  }
}

// =============================================================================
// Approval Workflow
// =============================================================================

const pendingApprovals = new Map<string, ApprovalRequest>();

/**
 * Create a new approval request
 */
export function createApprovalRequest(
  operation: string,
  description: string,
  clientId: string,
  details: {
    serverId?: string;
    toolName?: string;
    input?: Record<string, unknown>;
    sessionId?: string;
  },
  timeoutMs: number = 60000,
): ApprovalRequest {
  const request: ApprovalRequest = {
    id: crypto.randomUUID(),
    operation,
    description,
    clientId,
    serverId: details.serverId,
    toolName: details.toolName,
    input: details.input,
    sessionId: details.sessionId,
    requestedAt: new Date(),
    expiresAt: new Date(Date.now() + timeoutMs),
    status: 'pending',
    timeout: timeoutMs,
  };

  pendingApprovals.set(request.id, request);

  // Auto-expire after timeout
  setTimeout(() => {
    const req = pendingApprovals.get(request.id);
    if (req && req.status === 'pending') {
      req.status = 'expired';
      pendingApprovals.delete(request.id);
    }
  }, timeoutMs);

  return request;
}

/**
 * Get a pending approval request
 */
export function getApprovalRequest(id: string): ApprovalRequest | undefined {
  return pendingApprovals.get(id);
}

/**
 * Resolve an approval request
 */
export function resolveApprovalRequest(id: string, approved: boolean): boolean {
  const request = pendingApprovals.get(id);
  if (!request || request.status !== 'pending') {
    return false;
  }
  request.status = approved ? 'approved' : 'denied';
  return true;
}

/**
 * Check if operation requires approval
 */
export function requiresApproval(operation: string): boolean {
  return APPROVAL_REQUIRED_OPERATIONS.includes(operation);
}

/**
 * Get all pending approvals for a session
 */
export function getPendingApprovalsForSession(sessionId: string): ApprovalRequest[] {
  return Array.from(pendingApprovals.values()).filter(
    (req) => req.sessionId === sessionId && req.status === 'pending',
  );
}

// =============================================================================
// Tool Allowlist/Blocklist
// =============================================================================

interface ToolPermissionRule {
  serverId: string;
  toolName: string;
  action: 'allow' | 'block' | 'approve';
}

const toolPermissionRules: ToolPermissionRule[] = [];

/**
 * Check if a tool should auto-allow, auto-block, or require approval
 */
export function getToolAction(
  serverId: string,
  toolName: string,
): 'allow' | 'block' | 'approve' {
  const exactMatch = toolPermissionRules.find(
    (rule) => rule.serverId === serverId && rule.toolName === toolName,
  );
  if (exactMatch) {
    return exactMatch.action;
  }

  const serverMatch = toolPermissionRules.find(
    (rule) => rule.serverId === serverId && rule.toolName === '*',
  );
  if (serverMatch) {
    return serverMatch.action;
  }

  return 'approve';
}

/**
 * Add a tool permission rule
 */
export function addToolPermissionRule(
  serverId: string,
  toolName: string,
  action: 'allow' | 'block' | 'approve',
): void {
  const existingIndex = toolPermissionRules.findIndex(
    (rule) => rule.serverId === serverId && rule.toolName === toolName,
  );
  if (existingIndex >= 0) {
    toolPermissionRules.splice(existingIndex, 1);
  }
  toolPermissionRules.push({ serverId, toolName, action });
  console.log('[MCP Security] Added tool rule:', serverId, toolName, action);
}

/**
 * Remove a tool permission rule
 */
export function removeToolPermissionRule(serverId: string, toolName: string): boolean {
  const index = toolPermissionRules.findIndex(
    (rule) => rule.serverId === serverId && rule.toolName === toolName,
  );
  if (index >= 0) {
    toolPermissionRules.splice(index, 1);
    return true;
  }
  return false;
}

// =============================================================================
// Audit Logging
// =============================================================================

const auditLog: AuditLogEntry[] = [];

/**
 * Redact sensitive data from an object
 */
export function redactSensitive(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACTION_PATTERNS.some((p) => p.test(key))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitive(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * Log an audit event
 */
export function logAuditEvent(
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>,
): void {
  const fullEntry: AuditLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date(),
    ...entry,
    input: entry.input ? redactSensitive(entry.input) : undefined,
    output: entry.output ? redactSensitive(entry.output) : undefined,
  };

  auditLog.push(fullEntry);

  // Trim if too large
  while (auditLog.length > MAX_AUDIT_LOG_SIZE) {
    auditLog.shift();
  }

  // Log to console for debugging
  const logFn = entry.level === 'error' || entry.level === 'security' ? console.error : console.log;
  logFn(`[MCP Audit] [${entry.level.toUpperCase()}] ${entry.category}:${entry.operation}`, entry.metadata);
}

/**
 * Get recent audit log entries
 */
export function getRecentAuditLog(limit: number = 100): AuditLogEntry[] {
  return auditLog.slice(-limit);
}

/**
 * Get audit log entries by category
 */
export function getAuditLogByCategory(
  category: AuditLogEntry['category'],
  limit: number = 100,
): AuditLogEntry[] {
  return auditLog
    .filter((entry) => entry.category === category)
    .slice(-limit);
}

/**
 * Get audit log entries for a client
 */
export function getAuditLogForClient(
  clientId: string,
  limit: number = 100,
): AuditLogEntry[] {
  return auditLog
    .filter((entry) => entry.clientId === clientId)
    .slice(-limit);
}
