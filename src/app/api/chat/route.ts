import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';
import { generateEmbedding, googleAI } from '@/lib/ai/embeddings';
import { streamText } from 'ai';
import { Prisma } from '@prisma/client';

export const maxDuration = 60; // allow longer timeout for RAG

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
    const { messages, spaceId } = body;
    console.log('[CHAT] SpaceID:', spaceId);

    // Validate request body
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages must be a non-empty array' }, { status: 400 });
    }

    if (!spaceId) {
      return NextResponse.json({ error: 'spaceId is required' }, { status: 400 });
    }

    // Sync user with our DB
    await prisma.user.upsert({
      where: { id: user.id },
      update: {
        email: user.email!,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
      },
      create: {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name || user.email?.split('@')[0],
      },
    });

    // Verify access to space
    const spaceMember = await prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId: user.id,
        },
      },
    });

    if (!spaceMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];

    // 1. Generate embedding for query
    const queryEmbedding = await generateEmbedding(latestMessage.content);
    console.log('[CHAT] Query embedding length:', queryEmbedding.length);
    const embeddingString = `[${queryEmbedding.join(',')}]`;

    // 2. Perform vector search using pgvector and Prisma.sql
    // Using ::vector without size to avoid mismatch with unsized DB column
    const chunks = await prisma.$queryRaw<Array<{ id: string; content: string; title: string }>>`
      SELECT 
        dc.id, 
        dc.content, 
        d.title, 
        (dc.embedding <=> ${embeddingString}::vector) as distance
      FROM "DocumentChunk" dc
      JOIN "Document" d ON dc."documentId" = d.id
      WHERE d."spaceId" = ${spaceId}::uuid
      ORDER BY distance ASC
      LIMIT 5;
    `;

    console.log('[CHAT] Retrieved chunks:', chunks.length);

    // 3. Construct prompt with retrieved context
    const contextContent =
      chunks.length > 0
        ? chunks.map((c) => `[Source: ${c.title}]\n${c.content}`).join('\n\n')
        : 'No relevant documents found.';

    console.log('[CHAT] Context Content:');
    console.dir(contextContent);

    const systemPrompt = `You are a helpful knowledge assistant. Answer the user's question based strictly on the provided context below. If the context does not contain the answer, say "I don't have enough information to answer that based on the provided documents."

Context Documents:
${contextContent}
`;

    // 4. Stream response from Gemini 2.5 Flash (legacy 1.5 is retired in 2026)
    const result = streamText({
      model: googleAI('gemini-2.5-flash'),
      system: systemPrompt,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('[CHAT ERROR] Full error:', error);
    console.error('[CHAT ERROR] Message:', error.message);
    console.error('[CHAT ERROR] Code:', error.code);
    console.error('[CHAT ERROR] Meta:', error.meta);

    // Handle specific error types
    if (error.code === 'P2V001' || error.meta?.code === '22P02' || error.message?.includes('22P02')) {
      // Vector embedding not found or invalid
      return NextResponse.json(
        {
          error: 'Invalid database input (Vector or UUID format)',
          details: error.message,
        },
        { status: 400 },
      );
    }

    if (error.name === 'SyntaxError' && error.message?.includes('JSON')) {
      // Invalid JSON in request body
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
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
      { status: 500 },
    );
  }
}
