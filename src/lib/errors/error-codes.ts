export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const ERROR_CODE_DETAILS: Record<
  ErrorCode,
  { status: number; message: string; expected: boolean }
> = {
  VALIDATION_ERROR: {
    status: 400,
    message: 'The request contains invalid data.',
    expected: true,
  },
  AUTHENTICATION_REQUIRED: {
    status: 401,
    message: 'Authentication is required.',
    expected: true,
  },
  FORBIDDEN: {
    status: 403,
    message: 'You do not have permission to perform this action.',
    expected: true,
  },
  RESOURCE_NOT_FOUND: {
    status: 404,
    message: 'The requested resource was not found.',
    expected: true,
  },
  CONFLICT: {
    status: 409,
    message: 'The request conflicts with the current resource state.',
    expected: true,
  },
  RATE_LIMITED: {
    status: 429,
    message: 'The service is temporarily rate limited. Please try again later.',
    expected: true,
  },
  DATABASE_ERROR: {
    status: 500,
    message: 'A database operation could not be completed.',
    expected: false,
  },
  INTERNAL_ERROR: {
    status: 500,
    message: 'An unexpected error occurred. Please try again.',
    expected: false,
  },
};
