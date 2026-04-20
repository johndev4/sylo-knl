import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chunkText } from '@/lib/ai/chunking'
import { generateEmbeddings } from '@/lib/ai/embeddings'
import { getEmbeddingProvider } from '@/lib/ai/core/provider-factory'
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

    // No need to manually sync user, handled by Postgres Trigger

    // Check workspace exists and user has access
    let hasAccess = false;
    
    // Legacy Personal Space Check vs New Workspace Check
    if (spaceId === user.id) {
      // In the new schema, personal workspaces are just workspaces created by the user
      // If none match `spaceId = user.id`, we'll need to create a dedicated personal space, but for MVP
      // let's create a workspace literally with id = user.id if it doesn't exist
      const { data: existingSpace } = await supabase.from('workspaces').select('id').eq('id', user.id).single();
      if (!existingSpace) {
        await supabase.from('workspaces').insert({ id: user.id, name: 'Personal Knowledge Base' });
        await supabase.from('workspace_members').insert({ workspace_id: user.id, user_id: user.id, role: 'OWNER' });
      }
      hasAccess = true;
    } else {
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('workspace_id', spaceId)
        .eq('user_id', user.id)
        .single();
      
      hasAccess = !!membership;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 1. Chunk the document content
    const chunks = chunkText(content)

    // 2. Generate embeddings for each chunk
    let embeddings: number[][];
    try {
      console.log('[INGESTION] Generating embeddings for', chunks.length, 'chunks');
      embeddings = await generateEmbeddings(chunks);
      console.log('[INGESTION] Successfully generated embeddings');
    } catch (embedError: any) {
      console.error('[INGESTION] Embedding generation failed:', embedError);
      throw embedError;
    }

    // 3. Store Document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        title,
        content,
        workspace_id: spaceId
      })
      .select('id')
      .single()

    if (docError || !document) {
      throw new Error(docError?.message || 'Failed to create document');
    }

    // 4. Store Chunks
    const chunkInserts = chunks.map((chunkContent, i) => ({
      document_id: document.id,
      content: chunkContent,
      embedding: `[${embeddings[i].join(',')}]`
    }));

    const { error: chunksError } = await supabase.from('document_chunks').insert(chunkInserts);

    if (chunksError) {
      console.error('[INGESTION ERROR] Chunks:', chunksError);
      throw new Error('Failed to create document chunks');
    }

    return NextResponse.json({ success: true, documentId: document.id })
  } catch (error: any) {
    console.error('[INGESTION ERROR]', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
