/**
 * MCP Security Unit Tests
 *
 * Tests for input validation, rate limiting, and security middleware.
 *
 * @see 04-mcp-testing.md section 3.3 and 7 for requirements
 */

import { describe, it, expect } from 'vitest';
import { sleep } from './utils.mjs';

// =============================================================================
// Input Validation Tests
// =============================================================================

describe('InputValidator', () => {
  // Helper to simulate validation
  function validateInput(input: Record<string, unknown>): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    for (const [key, value] of Object.entries(input)) {
      if (typeof value === 'string') {
        // Check for path traversal
        if (value.includes('..') || value.includes('%2e%2e')) {
          errors.push(`Path traversal detected in ${key}`);
        }

        // Check for command injection
        if (/[;&|`$]/.test(value) && key === 'cmd') {
          errors.push(`Potential command injection in ${key}`);
        }

        // Check for null bytes
        if (value.includes('\x00')) {
          errors.push(`Null byte detected in ${key}`);
        }
      }
    }

    return errors.length > 0 ? { valid: false, errors } : { valid: true };
  }

  it('rejects path traversal', () => {
    expect(validateInput({ path: '../../../etc/passwd' })).toEqual({
      valid: false,
      errors: ['Path traversal detected in path'],
    });
  });

  it('rejects URL-encoded path traversal', () => {
    expect(validateInput({ path: '%2e%2e/%2e%2e/etc/passwd' })).toEqual({
      valid: false,
      errors: ['Path traversal detected in path'],
    });
  });

  it('rejects command injection patterns', () => {
    expect(validateInput({ cmd: 'ls; rm -rf /' })).toEqual({
      valid: false,
      errors: ['Potential command injection in cmd'],
    });

    expect(validateInput({ cmd: 'ls && cat /etc/passwd' })).toEqual({
      valid: false,
      errors: ['Potential command injection in cmd'],
    });

    expect(validateInput({ cmd: 'ls | xargs rm' })).toEqual({
      valid: false,
      errors: ['Potential command injection in cmd'],
    });
  });

  it('rejects null bytes', () => {
    expect(validateInput({ data: 'test\x00.txt' })).toEqual({
      valid: false,
      errors: ['Null byte detected in data'],
    });
  });

  it('accepts clean input', () => {
    expect(validateInput({ title: 'My Notebook', count: 5 })).toEqual({
      valid: true,
    });

    expect(validateInput({ path: '/valid/path/file.ts' })).toEqual({
      valid: true,
    });
  });

  it('accepts special characters in safe contexts', () => {
    // Semicolon in non-cmd field is OK
    expect(validateInput({ title: 'Hello; World' })).toEqual({
      valid: true,
    });
  });
});

// =============================================================================
// Rate Limiter Tests
// =============================================================================

describe('RateLimiter', () => {
  // Simple rate limiter implementation for testing
  class TestRateLimiter {
    private requests: Map<string, number[]> = new Map();
    private windowMs: number;
    private maxRequests: number;

    constructor(options: { windowMs: number; maxRequests: number }) {
      this.windowMs = options.windowMs;
      this.maxRequests = options.maxRequests;
    }

    async check(clientId: string): Promise<boolean> {
      const now = Date.now();
      const clientRequests = this.requests.get(clientId) || [];

      // Remove old requests outside window
      const validRequests = clientRequests.filter(
        (time) => now - time < this.windowMs,
      );

      if (validRequests.length >= this.maxRequests) {
        return false;
      }

      validRequests.push(now);
      this.requests.set(clientId, validRequests);
      return true;
    }

    reset(clientId: string): void {
      this.requests.delete(clientId);
    }
  }

  it('allows requests within limit', async () => {
    const limiter = new TestRateLimiter({ windowMs: 1000, maxRequests: 5 });

    for (let i = 0; i < 5; i++) {
      expect(await limiter.check('client1')).toBe(true);
    }
  });

  it('blocks requests exceeding limit', async () => {
    const limiter = new TestRateLimiter({ windowMs: 1000, maxRequests: 5 });

    for (let i = 0; i < 5; i++) {
      await limiter.check('client1');
    }

    expect(await limiter.check('client1')).toBe(false);
  });

  it('resets after window expires', async () => {
    const limiter = new TestRateLimiter({ windowMs: 100, maxRequests: 1 });

    await limiter.check('client1');
    expect(await limiter.check('client1')).toBe(false);

    await sleep(150);
    expect(await limiter.check('client1')).toBe(true);
  });

  it('tracks clients independently', async () => {
    const limiter = new TestRateLimiter({ windowMs: 1000, maxRequests: 2 });

    // Client 1 uses quota
    await limiter.check('client1');
    await limiter.check('client1');
    expect(await limiter.check('client1')).toBe(false);

    // Client 2 still has quota
    expect(await limiter.check('client2')).toBe(true);
    expect(await limiter.check('client2')).toBe(true);
  });

  it('manual reset clears client quota', async () => {
    const limiter = new TestRateLimiter({ windowMs: 10000, maxRequests: 2 });

    await limiter.check('client1');
    await limiter.check('client1');
    expect(await limiter.check('client1')).toBe(false);

    limiter.reset('client1');
    expect(await limiter.check('client1')).toBe(true);
  });
});

// =============================================================================
// Token Validation Tests
// =============================================================================

describe('Token Validation', () => {
  function validateToken(token: string): boolean {
    // Token format: prefix_base64
    if (!token || typeof token !== 'string') return false;
    if (!token.startsWith('sb_')) return false;
    if (token.length < 20) return false;

    // Check for valid base64 characters after prefix
    const tokenPart = token.slice(3);
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    return base64Regex.test(tokenPart);
  }

  it('accepts valid token format', () => {
    expect(validateToken('sb_dGVzdHRva2VuZGF0YTE=')).toBe(true);
    expect(validateToken('sb_YW5vdGhlcnZhbGlkdG9rZW4=')).toBe(true);
  });

  it('rejects missing prefix', () => {
    expect(validateToken('dGVzdHRva2VuZGF0YTE=')).toBe(false);
  });

  it('rejects short tokens', () => {
    expect(validateToken('sb_abc')).toBe(false);
    expect(validateToken('sb_')).toBe(false);
  });

  it('rejects empty or null tokens', () => {
    expect(validateToken('')).toBe(false);
    expect(validateToken(null as unknown as string)).toBe(false);
    expect(validateToken(undefined as unknown as string)).toBe(false);
  });

  it('rejects invalid characters', () => {
    expect(validateToken('sb_invalid<script>token')).toBe(false);
    expect(validateToken('sb_token with spaces')).toBe(false);
  });
});

// =============================================================================
// Session Management Tests
// =============================================================================

describe('Session Management', () => {
  interface Session {
    id: string;
    clientId: string;
    createdAt: Date;
    lastActivityAt: Date;
    expiresAt: Date;
  }

  class TestSessionManager {
    private sessions: Map<string, Session> = new Map();
    private timeoutMs: number;

    constructor(timeoutMs: number = 30 * 60 * 1000) {
      this.timeoutMs = timeoutMs;
    }

    create(clientId: string): Session {
      const now = new Date();
      const session: Session = {
        id: `session-${Date.now()}`,
        clientId,
        createdAt: now,
        lastActivityAt: now,
        expiresAt: new Date(now.getTime() + this.timeoutMs),
      };
      this.sessions.set(session.id, session);
      return session;
    }

    get(sessionId: string): Session | null {
      const session = this.sessions.get(sessionId);
      if (!session) return null;

      if (new Date() > session.expiresAt) {
        this.sessions.delete(sessionId);
        return null;
      }

      return session;
    }

    updateActivity(sessionId: string): boolean {
      const session = this.sessions.get(sessionId);
      if (!session) return false;

      const now = new Date();
      session.lastActivityAt = now;
      session.expiresAt = new Date(now.getTime() + this.timeoutMs);
      return true;
    }

    end(sessionId: string): boolean {
      return this.sessions.delete(sessionId);
    }
  }

  it('creates session with expiry', () => {
    const manager = new TestSessionManager(60000);
    const session = manager.create('client1');

    expect(session.id).toBeDefined();
    expect(session.clientId).toBe('client1');
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('returns null for expired session', async () => {
    const manager = new TestSessionManager(50); // 50ms timeout
    const session = manager.create('client1');

    await sleep(100);

    expect(manager.get(session.id)).toBe(null);
  });

  it('updates activity extends expiry', async () => {
    const manager = new TestSessionManager(100);
    const session = manager.create('client1');
    const originalExpiry = session.expiresAt.getTime();

    await sleep(50);
    manager.updateActivity(session.id);

    const updated = manager.get(session.id);
    expect(updated?.expiresAt.getTime()).toBeGreaterThan(originalExpiry);
  });

  it('ends session removes it', () => {
    const manager = new TestSessionManager();
    const session = manager.create('client1');

    expect(manager.get(session.id)).not.toBe(null);
    manager.end(session.id);
    expect(manager.get(session.id)).toBe(null);
  });
});

// =============================================================================
// Audit Logging Tests
// =============================================================================

describe('Audit Logging', () => {
  // AuditEvent interface for future audit logging implementation
  // interface AuditEvent {
  //   timestamp: Date;
  //   type: string;
  //   clientId: string;
  //   action: string;
  //   details: Record<string, unknown>;
  // }

  function redactSensitive(obj: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = redactSensitive(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  it('redacts sensitive fields', () => {
    const input = {
      user: 'admin',
      password: 'secret123',
      token: 'abc123',
      data: 'safe',
    };

    const result = redactSensitive(input);

    expect(result.user).toBe('admin');
    expect(result.password).toBe('[REDACTED]');
    expect(result.token).toBe('[REDACTED]');
    expect(result.data).toBe('safe');
  });

  it('redacts nested sensitive fields', () => {
    const input = {
      outer: {
        apiKey: 'secret',
        value: 'safe',
      },
    };

    const result = redactSensitive(input);

    expect((result.outer as Record<string, unknown>).apiKey).toBe('[REDACTED]');
    expect((result.outer as Record<string, unknown>).value).toBe('safe');
  });

  it('handles Authorization header', () => {
    const input = {
      headers: {
        Authorization: 'Bearer xyz',
        'Content-Type': 'application/json',
      },
    };

    const result = redactSensitive(input);
    const headers = result.headers as Record<string, unknown>;

    expect(headers.Authorization).toBe('[REDACTED]');
    expect(headers['Content-Type']).toBe('application/json');
  });
});

// =============================================================================
// Server Allowlist Tests
// =============================================================================

describe('Server Allowlist', () => {
  const defaultAllowlist = ['github.com', 'gitlab.com', 'localhost'];

  function isServerAllowed(
    hostname: string,
    allowlist: string[] = defaultAllowlist,
  ): boolean {
    return allowlist.some(
      (allowed) =>
        hostname === allowed || hostname.endsWith(`.${allowed}`),
    );
  }

  it('allows whitelisted hosts', () => {
    expect(isServerAllowed('github.com')).toBe(true);
    expect(isServerAllowed('gitlab.com')).toBe(true);
    expect(isServerAllowed('localhost')).toBe(true);
  });

  it('allows subdomains of whitelisted hosts', () => {
    expect(isServerAllowed('api.github.com')).toBe(true);
    expect(isServerAllowed('raw.githubusercontent.com', ['githubusercontent.com'])).toBe(true);
  });

  it('rejects non-whitelisted hosts', () => {
    expect(isServerAllowed('malicious.com')).toBe(false);
    expect(isServerAllowed('evil.net')).toBe(false);
  });

  it('rejects similar-looking hosts', () => {
    // Security check: github.com.evil.com should not match
    expect(isServerAllowed('github.com.evil.com')).toBe(false);
    expect(isServerAllowed('notgithub.com')).toBe(false);
  });
});

// =============================================================================
// Approval Workflow Tests
// =============================================================================

describe('Approval Workflow', () => {
  interface ApprovalRequest {
    id: string;
    operation: string;
    details: Record<string, unknown>;
    status: 'pending' | 'approved' | 'denied';
    createdAt: Date;
    resolvedAt?: Date;
    resolution?: string;
  }

  class TestApprovalManager {
    private requests: Map<string, ApprovalRequest> = new Map();

    create(operation: string, details: Record<string, unknown>): ApprovalRequest {
      const request: ApprovalRequest = {
        id: `approval-${Date.now()}`,
        operation,
        details,
        status: 'pending',
        createdAt: new Date(),
      };
      this.requests.set(request.id, request);
      return request;
    }

    approve(requestId: string, reason?: string): boolean {
      const request = this.requests.get(requestId);
      if (!request || request.status !== 'pending') return false;

      request.status = 'approved';
      request.resolvedAt = new Date();
      request.resolution = reason;
      return true;
    }

    deny(requestId: string, reason?: string): boolean {
      const request = this.requests.get(requestId);
      if (!request || request.status !== 'pending') return false;

      request.status = 'denied';
      request.resolvedAt = new Date();
      request.resolution = reason;
      return true;
    }

    get(requestId: string): ApprovalRequest | null {
      return this.requests.get(requestId) || null;
    }
  }

  it('creates pending approval request', () => {
    const manager = new TestApprovalManager();
    const request = manager.create('dangerous_operation', { target: 'test' });

    expect(request.status).toBe('pending');
    expect(request.operation).toBe('dangerous_operation');
  });

  it('approves pending request', () => {
    const manager = new TestApprovalManager();
    const request = manager.create('operation', {});

    expect(manager.approve(request.id, 'approved by admin')).toBe(true);
    expect(manager.get(request.id)?.status).toBe('approved');
  });

  it('denies pending request', () => {
    const manager = new TestApprovalManager();
    const request = manager.create('operation', {});

    expect(manager.deny(request.id, 'rejected')).toBe(true);
    expect(manager.get(request.id)?.status).toBe('denied');
  });

  it('cannot approve already resolved request', () => {
    const manager = new TestApprovalManager();
    const request = manager.create('operation', {});

    manager.deny(request.id);
    expect(manager.approve(request.id)).toBe(false);
  });

  it('cannot deny already resolved request', () => {
    const manager = new TestApprovalManager();
    const request = manager.create('operation', {});

    manager.approve(request.id);
    expect(manager.deny(request.id)).toBe(false);
  });
});
