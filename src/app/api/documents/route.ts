import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import prisma from '@/lib/db'
import { chunkText } from '@/lib/ai/chunking'
import { generateEmbeddings } from '@/lib/ai/embeddings'
import { z } from 'zod'

const ingestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(10, "Content is too short"),
  spaceId: z.string().uuid("Invalid Space ID"),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, content, spaceId } = ingestSchema.parse(body)

    // Sync user with our DB to avoid FK constraint issues
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
      }
    })

    // Verify user has access to Space
    let hasAccess = false;
    
    if (spaceId === user.id) {
      // Personal Space logic: Ensure it exists in the DB
      await prisma.space.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          name: 'Personal Knowledge Base',
          isShared: false,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER'
            }
          }
        }
      });
      hasAccess = true;
    } else {
      const spaceMember = await prisma.spaceMember.findUnique({
        where: {
          spaceId_userId: {
            spaceId,
            userId: user.id
          }
        }
      });
      hasAccess = !!spaceMember;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 1. Chunk the document content
    const chunks = chunkText(content)

    // 2. Generate embeddings for each chunk
    const embeddings = await generateEmbeddings(chunks)

    // 3. Store in database
    const document = await prisma.$transaction(async (tx: any) => {
      // Create Document logically
      const doc = await tx.document.create({
        data: {
          title,
          content,
          spaceId,
        }
      })

      // Create chunks with vectors using raw SQL since Prisma doesn't map arrays of vectors easily in standard createMany
      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i]
        // pgvector requires strings like '[0.1, 0.2, 0.3...]' for raw inserts
        const chunkEmbedding = `[${embeddings[i].join(',')}]`

        await tx.$executeRaw`
          INSERT INTO "DocumentChunk" ("documentId", "content", "embedding")
          VALUES (${doc.id}::uuid, ${chunkContent}, ${chunkEmbedding}::vector);
        `
      }

      return doc
    })

    return NextResponse.json({ success: true, documentId: document.id })
  } catch (error: any) {
    console.error('[INGESTION ERROR]', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
