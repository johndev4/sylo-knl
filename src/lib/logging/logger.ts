export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  requestId?: string;
  correlationId?: string;
  userId?: string;
  method?: string;
  path?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: unknown;
}

export interface LogError {
  name: string;
  message: string;
  cause?: unknown;
  code?: string;
  stack?: string;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

const REDACTED_KEYS =
  /(authorization|cookie|password|pass(code)?|secret|token|api[_-]?key|private[_-]?key|client[_-]?secret|session|credential)/i;

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;

function configuredLevel(): LogLevel {
  const level = process.env.LOG_LEVEL?.toLowerCase();
  return level && level in LEVEL_PRIORITY ? (level as LogLevel) : 'info';
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function sanitizeLogValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[Truncated]';
  if (typeof value === 'string') {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [REDACTED]')
      .replace(
        /(password|secret|token|api[_-]?key|session)\s*[:=]\s*[^\s,&;]+/gi,
        '$1=[REDACTED]'
      )
      .replace(CONTROL_CHARACTERS, ' ')
      .slice(0, 2000);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value === null || value === undefined) return value;
  if (value instanceof Error) return serializeError(value);
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitizeLogValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(
      value as Record<string, unknown>
    )) {
      const sanitizedKey = key.replace(CONTROL_CHARACTERS, ' ');
      result[sanitizedKey] = REDACTED_KEYS.test(sanitizedKey)
        ? '[REDACTED]'
        : sanitizeLogValue(nestedValue, depth + 1);
    }
    return result;
  }
  return '[Unsupported]';
}

export function serializeError(error: unknown): LogError {
  if (error instanceof Error) {
    const result: LogError = {
      name: error.name,
      message: sanitizeLogValue(error.message) as string,
    };
    if ('code' in error && typeof error.code === 'string') {
      result.code = sanitizeLogValue(error.code) as string;
    }
    if (error.cause !== undefined) {
      result.cause = sanitizeLogValue(error.cause);
    }
    if (!isProduction()) {
      result.stack = sanitizeLogValue(error.stack) as string;
    }
    return result;
  }

  if (typeof error === 'object' && error !== null) {
    const value = sanitizeLogValue(error) as Record<string, unknown>;
    return {
      name: typeof value.name === 'string' ? value.name : 'UnknownError',
      message:
        typeof value.message === 'string'
          ? value.message
          : JSON.stringify(value).slice(0, 2000),
      ...(value.code ? { code: String(value.code) } : {}),
      ...(value.cause ? { cause: value.cause } : {}),
    };
  }

  return {
    name: 'UnknownError',
    message: sanitizeLogValue(String(error)) as string,
  };
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[configuredLevel()];
}

function write(
  level: LogLevel,
  message: string,
  context: LogContext = {}
): void {
  if (!shouldLog(level)) return;

  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message: sanitizeLogValue(message),
    environment: process.env.NODE_ENV ?? 'development',
    service: 'sylo-knl',
  };

  const sanitizedContext = sanitizeLogValue(context) as LogContext;
  Object.assign(entry, sanitizedContext);

  const format =
    process.env.LOG_FORMAT?.toLowerCase() ??
    (isProduction() ? 'json' : 'pretty');

  if (format === 'json') {
    console[level === 'fatal' ? 'error' : level === 'debug' ? 'debug' : level](
      JSON.stringify(entry)
    );
    return;
  }

  const prefix = `[${level.toUpperCase()}] ${entry.timestamp}`;
  const contextText =
    Object.keys(sanitizedContext).length > 0
      ? ` ${JSON.stringify(sanitizedContext)}`
      : '';
  const output = `${prefix} ${entry.message}${contextText}`;
  if (level === 'error' || level === 'fatal') console.error(output);
  else if (level === 'warn') console.warn(output);
  else if (level === 'debug') console.debug(output);
  else console.info(output);
}

export const logger = {
  debug: (message: string, context?: LogContext) =>
    write('debug', message, context),
  info: (message: string, context?: LogContext) =>
    write('info', message, context),
  warn: (message: string, context?: LogContext) =>
    write('warn', message, context),
  error: (message: string, context?: LogContext) =>
    write('error', message, context),
  fatal: (message: string, context?: LogContext) =>
    write('fatal', message, context),
};
