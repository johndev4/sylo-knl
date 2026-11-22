import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppError, isActionFailure } from '@/lib/errors/app-error';
import { ERROR_CODES } from '@/lib/errors/error-codes';
import {
  createApiErrorResponse,
  normalizeError,
  withActionErrorHandling,
} from '@/lib/errors/error-handler';
import { logger } from '@/lib/logging/logger';
import { redirect } from 'next/navigation';
import { AppErrorFallback } from '@/components/shared/app-error-fallback';
import { z } from 'zod';

describe('application error handling', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves application error codes and safe messages', () => {
    const error = new AppError(ERROR_CODES.FORBIDDEN);

    expect(error).toMatchObject({
      name: 'AppError',
      code: 'FORBIDDEN',
      status: 403,
      expected: true,
      message: 'You do not have permission to perform this action.',
    });
  });

  it('normalizes validation, database, and unknown errors', () => {
    let validationError: unknown;
    try {
      z.string().parse(42);
    } catch (error) {
      validationError = error;
    }

    expect(normalizeError(validationError).code).toBe(
      ERROR_CODES.VALIDATION_ERROR
    );
    expect(normalizeError({ code: '23505', message: 'private database text' }))
      .toMatchObject({
        code: ERROR_CODES.CONFLICT,
        status: 409,
      });
    expect(normalizeError(new Error('private implementation detail')))
      .toMatchObject({
        code: ERROR_CODES.INTERNAL_ERROR,
        status: 500,
      });
  });

  it('returns standardized API errors without exposing internal messages', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => {});
    const response = createApiErrorResponse(
      new Error('database host and query details'),
      { requestId: 'request-123' }
    );

    expect(response.status).toBe(500);
    expect(response.headers.get('x-request-id')).toBe('request-123');
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
    });
  });

  it('returns a safe database error response', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => {});
    const response = createApiErrorResponse({
      code: '08006',
      message: 'private database connection detail',
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'A database operation could not be completed.',
      },
    });
  });

  it('maps malformed JSON to a validation response', async () => {
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    const response = createApiErrorResponse(new SyntaxError('invalid JSON'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('uses the standard unauthorized response', async () => {
    jest.spyOn(logger, 'warn').mockImplementation(() => {});
    const response = createApiErrorResponse(
      new AppError(ERROR_CODES.AUTHENTICATION_REQUIRED)
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'AUTHENTICATION_REQUIRED' },
    });
  });

  it('returns structured action failures and logs unexpected exceptions', async () => {
    const warn = jest.spyOn(logger, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(logger, 'error').mockImplementation(() => {});

    const expected = await withActionErrorHandling(async () => {
      throw new AppError(ERROR_CODES.RESOURCE_NOT_FOUND);
    });
    expect(isActionFailure(expected)).toBe(true);
    expect(expected).toMatchObject({
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'The requested resource was not found.',
      },
    });
    expect(warn).toHaveBeenCalledTimes(1);

    const unexpected = await withActionErrorHandling(async () => {
      throw new Error('sensitive database detail');
    });
    expect(unexpected).toMatchObject({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
    });
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('rethrows Next.js redirect control-flow errors from action handling', async () => {
    await expect(
      withActionErrorHandling(async () => redirect('/login'))
    ).rejects.toMatchObject({
      digest: expect.stringContaining('NEXT_REDIRECT'),
    });
  });

  it('renders a generic error boundary fallback', () => {
    const markup = renderToStaticMarkup(
      createElement(AppErrorFallback, {
        error: new Error('private server implementation detail'),
        retry: () => {},
      })
    );

    expect(markup).toContain('Something went wrong');
    expect(markup).toContain('Try again');
    expect(markup).not.toContain('private server implementation detail');
  });
});
