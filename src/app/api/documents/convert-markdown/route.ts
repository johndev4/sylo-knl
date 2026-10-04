import { createClient } from '@/lib/supabase/server';
import { ServerBlockNoteEditor } from '@blocknote/server-util';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const maxDuration = 30;

const MAX_REQUEST_BYTES = 1_000_000;
const convertMarkdownRequestSchema = z.object({
  markdown: z.string().max(MAX_REQUEST_BYTES),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { error: 'Request body is too large' },
        { status: 413 }
      );
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { error: 'Request body is too large' },
        { status: 413 }
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const parsed = convertMarkdownRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 }
      );
    }

    try {
      const editor = ServerBlockNoteEditor.create();
      const blocks = await editor.tryParseMarkdownToBlocks(
        parsed.data.markdown
      );
      return NextResponse.json({ blocks });
    } catch {
      return NextResponse.json(
        { error: 'Unable to convert Markdown to document blocks' },
        { status: 422 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
