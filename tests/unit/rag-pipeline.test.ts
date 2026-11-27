jest.mock('../../src/lib/ai/embeddings', () => ({
  generateEmbedding: jest.fn(),
}));

jest.mock('../../src/lib/ai/core/llm', () => ({
  streamAnswer: jest.fn(),
}));

jest.mock('../../src/lib/ai/rag/retrieve', () => ({
  attachDocumentLinks: jest.fn(async (chunks) =>
    chunks.map((chunk) => ({
      ...chunk,
      document_url: `/hub/libraries/library-id/documents/${chunk.document_id}`,
    }))
  ),
  retrieveRelevantChunks: jest.fn(),
  retrieveChunksByTags: jest.fn(),
  retrieveChunksByKeywords: jest.fn(),
  mergeAndRankChunks: jest.fn((vector, tags, keywords) => [
    ...vector,
    ...tags,
    ...keywords,
  ]),
}));

jest.mock('../../src/lib/ai/rag/query-analyzer', () => ({
  analyzeChatQuery: jest.fn(),
}));

jest.mock('../../src/lib/ai/rag/context-builder', () => ({
  buildPromptContext: jest.fn(() => 'retrieved library context'),
  buildSystemPrompt: jest.fn(() => 'library answer prompt'),
  buildConversationalSystemPrompt: jest.fn(),
  buildOutOfScopeSystemPrompt: jest.fn(() => 'out-of-scope prompt'),
  buildDocumentActionSystemPrompt: jest.fn(),
  buildClarificationSystemPrompt: jest.fn(() => 'clarification prompt'),
  buildCorrectionVerificationSystemPrompt: jest.fn(
    () => 'correction verification prompt'
  ),
}));

import { generateEmbedding } from '@/lib/ai/embeddings';
import { streamAnswer } from '@/lib/ai/core/llm';
import {
  attachDocumentLinks,
  retrieveRelevantChunks,
  retrieveChunksByTags,
  retrieveChunksByKeywords,
} from '@/lib/ai/rag/retrieve';
import { analyzeChatQuery } from '@/lib/ai/rag/query-analyzer';
import {
  buildOutOfScopeSystemPrompt,
  buildSystemPrompt,
  buildClarificationSystemPrompt,
  buildCorrectionVerificationSystemPrompt,
} from '@/lib/ai/rag/context-builder';
import { executeRAGChat } from '@/lib/ai/rag/pipeline';
import type { RetrievedChunk } from '@/lib/ai/rag/retrieve';

const BASE_ANALYSIS = {
  isDocumentActionRequest: false,
  isOutOfScope: false,
  isUserCorrection: false,
  correctionSearchQuery: '',
  isConversationalOnly: false,
  needsClarification: false,
  clarificationQuestion: '',
  standaloneQuery: 'when does episode 195 air',
  tagKeywords: [],
};

describe('executeRAGChat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(analyzeChatQuery).mockResolvedValue({
      ...BASE_ANALYSIS,
      isOutOfScope: true,
    });
    jest.mocked(generateEmbedding).mockResolvedValue([]);
    jest.mocked(retrieveRelevantChunks).mockResolvedValue([]);
    jest.mocked(retrieveChunksByTags).mockResolvedValue([
      {
        id: 'episode-195',
        document_id: 'episode-guide',
        content: 'Episode 195 aired on the documented date.',
        title: 'Episode Guide',
        library_name: 'Anime',
        similarity: 0.95,
      } satisfies RetrievedChunk,
    ]);
    jest.mocked(retrieveChunksByKeywords).mockResolvedValue([]);
    jest.mocked(streamAnswer).mockImplementation(async function* () {
      yield { type: 'text', content: 'The date from the library.' };
    });
  });

  it('searches a mentioned library source before considering an out-of-scope refusal', async () => {
    const messages = [
      { role: 'user' as const, content: 'when does episode 195 air?' },
    ];
    const output = [];

    for await (const chunk of executeRAGChat(
      messages[0].content,
      ['library-id'],
      messages,
      ['Anime'],
      { documentIds: [], tags: ['Detective Conan'] }
    )) {
      output.push(chunk);
    }

    expect(retrieveChunksByTags).toHaveBeenCalledWith(
      ['library-id'],
      ['Detective Conan'],
      12
    );
    expect(buildSystemPrompt).toHaveBeenCalledWith(
      'retrieved library context',
      ['Anime']
    );
    expect(attachDocumentLinks).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ document_id: 'episode-guide' }),
      ]),
      ['library-id']
    );
    expect(buildOutOfScopeSystemPrompt).not.toHaveBeenCalled();
    expect(output).toContainEqual({
      type: 'text',
      content: 'The date from the library.',
    });
  });

  it('streams a clarifying question when query needs clarification and no mention scope is set', async () => {
    jest.mocked(analyzeChatQuery).mockResolvedValue({
      ...BASE_ANALYSIS,
      needsClarification: true,
      clarificationQuestion:
        'Which show, series, or topic does episode 195 belong to?',
      standaloneQuery: '',
    });

    const messages = [
      { role: 'user' as const, content: 'when does episode 195 aired?' },
    ];
    const output = [];

    for await (const chunk of executeRAGChat(
      messages[0].content,
      ['library-id'],
      messages,
      ['Anime']
    )) {
      output.push(chunk);
    }

    expect(buildClarificationSystemPrompt).toHaveBeenCalledWith(
      ['Anime'],
      'Which show, series, or topic does episode 195 belong to?'
    );
    expect(generateEmbedding).not.toHaveBeenCalled();
    expect(retrieveRelevantChunks).not.toHaveBeenCalled();
    expect(retrieveChunksByTags).not.toHaveBeenCalled();
    expect(retrieveChunksByKeywords).not.toHaveBeenCalled();
    expect(output).toContainEqual({
      type: 'text',
      content: 'The date from the library.',
    });
  });

  it('bypasses clarification and runs hybrid search when mention scope is provided', async () => {
    jest.mocked(analyzeChatQuery).mockResolvedValue({
      ...BASE_ANALYSIS,
      needsClarification: true,
      clarificationQuestion:
        'Which show, series, or topic does episode 195 belong to?',
      standaloneQuery: '',
    });

    const messages = [
      { role: 'user' as const, content: 'when does episode 195 aired?' },
    ];
    const output = [];

    for await (const chunk of executeRAGChat(
      messages[0].content,
      ['library-id'],
      messages,
      ['Anime'],
      { documentIds: [], tags: ['Detective Conan'] }
    )) {
      output.push(chunk);
    }

    expect(buildClarificationSystemPrompt).not.toHaveBeenCalled();
    expect(retrieveChunksByTags).toHaveBeenCalled();
    expect(output.length).toBeGreaterThan(0);
  });

  it('runs retrieval and invokes correction verification prompt when isUserCorrection is true', async () => {
    jest.mocked(analyzeChatQuery).mockResolvedValue({
      ...BASE_ANALYSIS,
      isUserCorrection: true,
      correctionSearchQuery: 'Detective Conan episode 195 air date',
      standaloneQuery: 'Detective Conan episode 195 air date',
      tagKeywords: ['detective conan'],
    });

    const messages = [
      { role: 'user' as const, content: 'when does episode 195 aired?' },
      {
        role: 'assistant' as const,
        content: 'Episode 195 of Detective Conan aired June 19, 2000.',
      },
      {
        role: 'user' as const,
        content: 'episode 195 was aired July not June',
      },
    ];
    const output = [];

    for await (const chunk of executeRAGChat(
      messages[2].content,
      ['library-id'],
      messages,
      ['Anime']
    )) {
      output.push(chunk);
    }

    expect(generateEmbedding).toHaveBeenCalledWith(
      'Detective Conan episode 195 air date'
    );
    expect(retrieveRelevantChunks).toHaveBeenCalled();
    expect(retrieveChunksByTags).toHaveBeenCalledWith(
      ['library-id'],
      ['detective conan'],
      8
    );
    expect(retrieveChunksByKeywords).toHaveBeenCalledWith(
      'Detective Conan episode 195 air date',
      ['library-id'],
      12,
      undefined
    );
    expect(buildCorrectionVerificationSystemPrompt).toHaveBeenCalledWith(
      'retrieved library context',
      ['Anime']
    );
    expect(attachDocumentLinks).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ document_id: 'episode-guide' }),
      ]),
      ['library-id']
    );
    expect(output).toContainEqual({
      type: 'text',
      content: 'The date from the library.',
    });
  });
});
