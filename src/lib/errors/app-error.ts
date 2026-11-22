import { ERROR_CODE_DETAILS, type ErrorCode } from './error-codes';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly expected: boolean;

  constructor(
    code: ErrorCode,
    message = ERROR_CODE_DETAILS[code].message,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'AppError';
    this.code = code;
    this.status = ERROR_CODE_DETAILS[code].status;
    this.expected = ERROR_CODE_DETAILS[code].expected;
  }
}

export type ActionFailure = {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
  };
};

export type ActionOutcome<T> = T | ActionFailure;

export function isActionFailure(value: unknown): value is ActionFailure {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    value.success === false &&
    'error' in value &&
    typeof value.error === 'object' &&
    value.error !== null &&
    'code' in value.error &&
    typeof value.error.code === 'string' &&
    'message' in value.error &&
    typeof value.error.message === 'string'
  );
}

export function unwrapActionResult<T>(result: ActionOutcome<T>): T {
  if (isActionFailure(result)) {
    throw new Error(result.error.message);
  }

  return result;
}
