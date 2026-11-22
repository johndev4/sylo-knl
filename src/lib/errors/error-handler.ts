import { NextResponse } from 'next/server';
import { unstable_rethrow } from 'next/navigation';
import { ZodError } from 'zod';
import { AppError, type ActionFailure } from './app-error';
import { ERROR_CODES } from './error-codes';
import { logger, type LogContext } from '@/lib/logging/logger';
import { REQUEST_ID_HEADER } from '@/lib/logging/request';

export type ApiErrorOptions = {
  requestId?: string;
  context?: LogContext;
  headers?: HeadersInit;
};

function getErrorCode(error: unknown): unknown {
  if (typeof error !== 'object' || error === null) return undefined;
  if ('code' in error && typeof error.code === 'string') return error.code;
  if (
    'meta' in error &&
    typeof error.meta === 'object' &&
    error.meta !== null &&
    'code' in error.meta
  ) {
    return error.meta.code;
  }
  return undefined;
}

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof ZodError || error instanceof SyntaxError) {
    return new AppError(ERROR_CODES.VALIDATION_ERROR, undefined, {
      cause: error,
    });
  }

  const databaseCode = getErrorCode(error);
  if (typeof databaseCode === 'string') {
    if (databaseCode === '23505') {
      return new AppError(ERROR_CODES.CONFLICT, undefined, { cause: error });
    }
    if (databaseCode === 'PGRST116') {
      return new AppError(ERROR_CODES.RESOURCE_NOT_FOUND, undefined, {
        cause: error,
      });
    }
    if (databaseCode === '22P02' || databaseCode === 'P2V001') {
      return new AppError(ERROR_CODES.VALIDATION_ERROR, undefined, {
        cause: error,
      });
    }
    if (databaseCode === '42501') {
      return new AppError(ERROR_CODES.FORBIDDEN, undefined, {
        cause: error,
      });
    }
    if (/^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(databaseCode)) {
      return new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        cause: error,
      });
    }
  }

  return new AppError(ERROR_CODES.INTERNAL_ERROR, undefined, {
    cause: error,
  });
}

function logHandledError(
  error: unknown,
  appError: AppError,
  context: LogContext = {},
  message: string
): void {
  const log = appError.expected ? logger.warn : logger.error;
  const details: LogContext = {
    ...context,
    errorCode: appError.code,
  };
  if (error instanceof ZodError) {
    details.validationIssueCount = error.issues.length;
  } else if (appError.code !== ERROR_CODES.VALIDATION_ERROR) {
    details.error = error;
  }
  log(message, details);
}

export function createApiErrorResponse(
  error: unknown,
  options: ApiErrorOptions = {}
): NextResponse {
  const appError = normalizeError(error);
  logHandledError(
    error,
    appError,
    { ...options.context, statusCode: appError.status },
    'API request failed'
  );

  const headers = new Headers(options.headers);
  if (options.requestId) {
    headers.set(REQUEST_ID_HEADER, options.requestId);
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
      },
    },
    { status: appError.status, headers }
  );
}

export async function withActionErrorHandling<T>(
  action: () => Promise<T>,
  context: LogContext = {}
): Promise<T | ActionFailure> {
  try {
    return await action();
  } catch (error) {
    unstable_rethrow(error);

    const appError = normalizeError(error);
    logHandledError(error, appError, context, 'Server action failed');

    return {
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
      },
    };
  }
}
