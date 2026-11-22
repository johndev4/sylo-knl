import {
  logger,
  sanitizeLogValue,
  serializeError,
} from '@/lib/logging/logger';
import {
  getRequestId,
  getRequestContext,
  isSlowDuration,
  REQUEST_ID_HEADER,
} from '@/lib/logging/request';

describe('structured logging', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('emits JSON fields at the configured level', () => {
    process.env.LOG_FORMAT = 'json';
    process.env.LOG_LEVEL = 'info';
    process.env.NODE_ENV = 'production';
    const output = jest.spyOn(console, 'info').mockImplementation(() => {});

    logger.debug('suppressed');
    expect(output).not.toHaveBeenCalled();

    logger.info('Request completed', {
      requestId: 'req-123',
      method: 'POST',
      path: '/api/chat',
      duration: 42,
      statusCode: 200,
    });

    const entry = JSON.parse(String(output.mock.calls[0][0]));
    expect(entry).toMatchObject({
      level: 'info',
      message: 'Request completed',
      environment: 'production',
      service: 'sylo-knl',
      requestId: 'req-123',
      method: 'POST',
      path: '/api/chat',
      duration: 42,
      statusCode: 200,
    });
    expect(entry.timestamp).toEqual(expect.any(String));
  });

  it('redacts sensitive keys and credential values', () => {
    expect(
      sanitizeLogValue({
        password: 'hunter2',
        authorization: 'Bearer abc',
        api_key: 'sk-test',
        userId: 'private-user-id',
        nested: { session_token: 'session-value' },
      })
    ).toEqual({
      password: '[REDACTED]',
      authorization: '[REDACTED]',
      api_key: '[REDACTED]',
      userId: '[REDACTED]',
      nested: { session_token: '[REDACTED]' },
    });
    expect(sanitizeLogValue({ email: 'person@example.com' })).toEqual({
      email: '[REDACTED]',
    });

    expect(
      sanitizeLogValue('Authorization: Bearer abc123')
    ).toContain('[REDACTED]');
    expect(sanitizeLogValue('Contact person@example.com')).toBe(
      'Contact [REDACTED_EMAIL]'
    );
  });

  it('sanitizes log-injection control characters', () => {
    expect(sanitizeLogValue('safe\nforged\tentry')).toBe(
      'safe forged entry'
    );
  });

  it('serializes errors without production stack traces', () => {
    process.env.NODE_ENV = 'production';
    const error = new Error('Database unavailable');
    error.name = 'DatabaseError';
    const serialized = serializeError(error);
    expect(serialized).toEqual({
      name: 'DatabaseError',
      message: 'Database unavailable',
    });
  });

  it('propagates a valid request ID and generates one safely', () => {
    const headers = new Headers({
      [REQUEST_ID_HEADER]: 'incoming-123',
    });
    expect(getRequestId(headers)).toBe('incoming-123');

    expect(
      getRequestId({ [REQUEST_ID_HEADER]: 'bad id\nforged' })
    ).toMatch(/^[a-zA-Z0-9-]+$/);
  });

  it('omits query strings from logged request paths', () => {
    const request = new Request(
      'https://example.test/api/chat?token=private-value'
    );
    expect(getRequestContext(request).path).toBe('/api/chat');
  });

  it('uses configurable slow-operation thresholds', () => {
    process.env.LOG_SLOW_REQUEST_MS = '100';
    process.env.LOG_SLOW_OPERATION_MS = '500';
    expect(isSlowDuration(101, 'request')).toBe(true);
    expect(isSlowDuration(499, 'operation')).toBe(false);
  });
});
