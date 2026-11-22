export const REQUEST_ID_HEADER = 'x-request-id';

export function getRequestId(
  headers?: Pick<Headers, 'get'> | Record<string, string | undefined>
): string {
  let incoming: string | null | undefined;
  if (headers && typeof (headers as Pick<Headers, 'get'>).get === 'function') {
    incoming = (headers as Pick<Headers, 'get'>).get(REQUEST_ID_HEADER);
  } else {
    incoming = (headers as Record<string, string | undefined> | undefined)?.[
      REQUEST_ID_HEADER
    ];
  }

  if (incoming && /^[a-zA-Z0-9._:-]{1,128}$/.test(incoming)) {
    return incoming;
  }

  try {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      return crypto.randomUUID();
    }
  } catch {}

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function getRequestContext(
  request: Request,
  requestId?: string
): {
  requestId: string;
  method: string;
  path: string;
} {
  const url = new URL(request.url);
  return {
    requestId: requestId ?? getRequestId(request.headers),
    method: request.method,
    path: `${url.pathname}${url.search}`,
  };
}

export function logDurationMs(startedAt: number): number {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

export function isSlowDuration(
  durationMs: number,
  kind: 'request' | 'operation' = 'request'
): boolean {
  const variable =
    kind === 'request'
      ? process.env.LOG_SLOW_REQUEST_MS
      : process.env.LOG_SLOW_OPERATION_MS;
  const threshold = Number.parseInt(variable ?? '', 10);
  return (
    durationMs >
    (Number.isFinite(threshold) && threshold >= 0 ? threshold : 2000)
  );
}
