jest.mock('../../src/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import {
  attachDocumentLinks,
  mergeAndRankChunks,
  type RetrievedChunk,
} from '@/lib/ai/rag/retrieve';

const makeChunk = (id: string, similarity: number): RetrievedChunk => ({
  id,
  document_id: `document-${id}`,
  content: `Content for ${id}`,
  title: `Title ${id}`,
  library_name: 'Library',
  similarity,
});

describe('mergeAndRankChunks', () => {
  it('keeps lexical-only matches and boosts chunks found by multiple channels', () => {
    const vectorChunk = makeChunk('shared', 0.7);
    const keywordChunk = makeChunk('keyword-only', 0.72);
    const merged = mergeAndRankChunks(
      [vectorChunk],
      [],
      [makeChunk('shared', 0.8), keywordChunk],
      10
    );

    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe('shared');
    expect(merged[0].similarity).toBeCloseTo(0.84);
    expect(merged[1].id).toBe('keyword-only');
  });
});

describe('attachDocumentLinks', () => {
  it('creates a link only for an active document in a selected library', async () => {
    const query = {
      select: jest.fn(),
      in: jest.fn(),
      is: jest.fn(),
    };
    query.select.mockReturnValue(query);
    query.in.mockReturnValue(query);
    query.is.mockResolvedValue({
      data: [{ id: 'document-1', library_id: 'library-1' }],
      error: null,
    });
    const supabase = { from: jest.fn(() => query) };
    jest.mocked(createClient).mockResolvedValue(supabase as never);

    const chunks = [
      { ...makeChunk('chunk-1', 0.9), document_id: 'document-1' },
      { ...makeChunk('chunk-2', 0.8), document_id: 'document-2' },
    ];
    const linked = await attachDocumentLinks(chunks, ['library-1']);

    expect(supabase.from).toHaveBeenCalledWith('documents');
    expect(query.in).toHaveBeenNthCalledWith(1, 'id', [
      'document-1',
      'document-2',
    ]);
    expect(query.in).toHaveBeenNthCalledWith(2, 'library_id', ['library-1']);
    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
    expect(linked).toHaveLength(1);
    expect(linked[0].document_url).toBe(
      '/hub/libraries/library-1/documents/document-1'
    );
  });
});
