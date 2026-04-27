import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { executeRAGChat } from '@/lib/ai/rag/pipeline';

export const maxDuration = 60; // allow longer timeout for RAG

/**
 * Convert provider-agnostic StreamChunk to HTTP streaming format
 */
function streamChunksToResponse(
  chunks: AsyncIterable<any>
): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of chunks) {
          if (chunk.type === 'text') {
            controller.enqueue(new TextEncoder().encode(chunk.content || ''));
          } else if (chunk.type === 'error') {
            controller.enqueue(
              new TextEncoder().encode(`[ERROR] ${chunk.error}`)
            );
            controller.close();
            break;
          } else if (chunk.type === 'finish') {
            controller.close();
          }
        }
      } catch (error: any) {
        controller.error(error);
      }
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { messages, libraryId } = body;
    console.log('[CHAT] LibraryID:', libraryId);

    // Validate request body
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages must be a non-empty array' },
        { status: 400 }
      );
    }

    if (!libraryId) {
      return NextResponse.json(
        { error: 'libraryId is required' },
        { status: 400 }
      );
    }

    // Check library exists and user has access
    let hasAccess = false;

    if (libraryId === user.id) {
      hasAccess = true;
    } else {
      const { data: membership } = await supabase
        .from('library_members')
        .select('library_id')
        .eq('library_id', libraryId)
        .eq('user_id', user.id)
        .single();

      hasAccess = !!membership;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the latest user message for embedding
    const latestMessage = messages[messages.length - 1];

    // Execute RAG pipeline: embed → retrieve → context → stream
    const chunks = executeRAGChat(latestMessage.content, libraryId, messages);
    const stream = streamChunksToResponse(chunks);

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    console.error('[CHAT ERROR] Full error:', error);
    console.error('[CHAT ERROR] Message:', error.message);
    console.error('[CHAT ERROR] Code:', error.code);
    console.error('[CHAT ERROR] Meta:', error.meta);

    // Handle specific error types
    if (
      error.code === 'P2V001' ||
      error.meta?.code === '22P02' ||
      error.message?.includes('22P02')
    ) {
      // Vector embedding not found or invalid
      return NextResponse.json(
        {
          error: 'Invalid database input (Vector or UUID format)',
          details: error.message,
        },
        { status: 400 }
      );
    }

    if (error.name === 'SyntaxError' && error.message?.includes('JSON')) {
      // Invalid JSON in request body
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    if (error.code === '23505' || error.meta?.code === '23505') {
      // Unique constraint violation
      return NextResponse.json({ error: 'Duplicate entry' }, { status: 409 });
    }

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
