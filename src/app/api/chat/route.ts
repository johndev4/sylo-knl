import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeRAGChat } from '@/lib/ai/rag/pipeline';
import { z } from 'zod';
import { logger } from '@/lib/logging/logger';
import {
  getRequestContext,
  isSlowDuration,
  logDurationMs,
  REQUEST_ID_HEADER,
} from '@/lib/logging/request';
import { AppError } from '@/lib/errors/app-error';
import { ERROR_CODES } from '@/lib/errors/error-codes';
import { createApiErrorResponse } from '@/lib/errors/error-handler';

export const maxDuration = 60; // allow longer timeout for RAG

const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({ role: z.enum(['user', 'assistant']), content: z.string() })
    )
    .min(1, 'messages must be a non-empty array'),
  libraryIds: z
    .array(z.string().uuid())
    .min(1, 'At least one libraryId is required'),
  mentionScope: z
    .object({
      documentIds: z
        .array(z.string().uuid())
        .max(10)
        .refine((ids) => new Set(ids).size === ids.length),
      tags: z
        .array(z.string().trim().min(1).max(100))
        .max(10)
        .refine(
          (tags) =>
            new Set(tags.map((tag) => tag.toLowerCase())).size === tags.length
        ),
    })
    .strict()
    .refine((scope) => scope.documentIds.length + scope.tags.length <= 10)
    .nullable()
    .optional(),
});

/**
 * Convert provider-agnostic StreamChunk to HTTP streaming format
 */
function streamChunksToResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chunks: AsyncIterable<any>,
  requestContext: { requestId: string; method: string; path: string }
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          if (chunk.type === 'text') {
            controller.enqueue(new TextEncoder().encode(chunk.content || ''));
          } else if (chunk.type === 'error') {
            controller.enqueue(
              new TextEncoder().encode(
                '[ERROR] An unexpected error occurred. Please try again.'
              )
            );
            controller.close();
            break;
          } else if (chunk.type === 'finish') {
            controller.close();
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        logger.error('Chat response stream failed', {
          ...requestContext,
          error,
        });
        controller.error(error);
      }
    },
  });
}

export async function POST(req: NextRequest) {
  const requestContext = getRequestContext(req);
  const startedAt = performance.now();
  logger.info('Chat request received', requestContext);

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createApiErrorResponse(
        new AppError(ERROR_CODES.AUTHENTICATION_REQUIRED, undefined, {
          cause: authError,
        }),
        {
          requestId: requestContext.requestId,
          context: { ...requestContext, statusCode: 401 },
        }
      );
    }

    const body = await req.json();

    // Validate request body with Zod
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return createApiErrorResponse(parsed.error, {
        requestId: requestContext.requestId,
        context: {
          ...requestContext,
          statusCode: 400,
          issueCount: parsed.error.issues.length,
        },
      });
    }

    const {
      messages,
      libraryIds,
      mentionScope: requestedMentionScope,
    } = parsed.data;
    const userContext = {
      ...requestContext,
      userId: user.id,
      libraryCount: libraryIds.length,
    };

    // Fetch all libraries the current user has access to
    const { data: memberships, error: membershipError } = await supabase
      .from('library_members')
      .select('library_id')
      .eq('user_id', user.id)
      .in('library_id', libraryIds);

    if (membershipError) {
      return createApiErrorResponse(
        new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
          cause: membershipError,
        }),
        {
          requestId: requestContext.requestId,
          context: { ...userContext, statusCode: 500 },
        }
      );
    }

    const authorizedIds = (memberships ?? []).map((m) => m.library_id);

    // Reject if any requested library is not authorized
    const unauthorized = libraryIds.filter((id) => !authorizedIds.includes(id));
    if (unauthorized.length > 0) {
      return createApiErrorResponse(new AppError(ERROR_CODES.FORBIDDEN), {
        requestId: requestContext.requestId,
        context: {
          ...userContext,
          statusCode: 403,
          unauthorizedLibraryCount: unauthorized.length,
        },
      });
    }

    const documentIds = requestedMentionScope?.documentIds ?? [];
    if (documentIds.length > 0) {
      const { data: selectedDocuments, error: documentsError } = await supabase
        .from('documents')
        .select('id')
        .in('id', documentIds)
        .in('library_id', authorizedIds)
        .is('deleted_at', null);

      if (documentsError) {
        return createApiErrorResponse(
          new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
            cause: documentsError,
          }),
          {
            requestId: requestContext.requestId,
            context: { ...userContext, statusCode: 500 },
          }
        );
      }

      if ((selectedDocuments ?? []).length !== documentIds.length) {
        return createApiErrorResponse(new AppError(ERROR_CODES.FORBIDDEN), {
          requestId: requestContext.requestId,
          context: {
            ...userContext,
            statusCode: 403,
            requestedDocumentCount: documentIds.length,
          },
        });
      }
    }

    const mentionScope = requestedMentionScope
      ? {
          documentIds,
          tags: [
            ...new Map(
              requestedMentionScope.tags.map((tag) => [tag.toLowerCase(), tag])
            ).values(),
          ],
        }
      : undefined;

    const { data: selectedLibraries, error: librariesError } = await supabase
      .from('libraries')
      .select('id, name')
      .in('id', authorizedIds);

    if (librariesError) {
      return createApiErrorResponse(
        new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
          cause: librariesError,
        }),
        {
          requestId: requestContext.requestId,
          context: { ...userContext, statusCode: 500 },
        }
      );
    }

    const selectedLibraryNames = (selectedLibraries ?? []).map(
      (library) => library.name
    );
    if (selectedLibraryNames.length !== authorizedIds.length) {
      return createApiErrorResponse(new AppError(ERROR_CODES.DATABASE_ERROR), {
        requestId: requestContext.requestId,
        context: {
          ...userContext,
          statusCode: 500,
          selectedLibraryCount: selectedLibraryNames.length,
          authorizedLibraryCount: authorizedIds.length,
        },
      });
    }

    // Get the latest user message for embedding
    const latestMessage = messages[messages.length - 1];

    // Execute RAG pipeline: embed → retrieve (multi-library) → context → stream
    const chunks = executeRAGChat(
      latestMessage.content,
      authorizedIds,
      messages,
      selectedLibraryNames,
      mentionScope
    );
    const stream = streamChunksToResponse(chunks, requestContext);

    const duration = logDurationMs(startedAt);
    logger.info('Chat request completed', {
      ...userContext,
      statusCode: 200,
      duration,
    });
    if (isSlowDuration(duration, 'request')) {
      logger.warn('Slow chat request detected', {
        ...userContext,
        statusCode: 200,
        duration,
      });
    }

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        [REQUEST_ID_HEADER]: requestContext.requestId,
      },
    });
  } catch (error: unknown) {
    return createApiErrorResponse(error, {
      requestId: requestContext.requestId,
      context: {
        ...requestContext,
        statusCode: 500,
        duration: logDurationMs(startedAt),
      },
    });
  }
}
