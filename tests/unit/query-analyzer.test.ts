jest.mock('../../src/lib/ai/core/llm', () => ({
  generateAnswer: jest.fn(),
}));

import { generateAnswer } from '@/lib/ai/core/llm';
import { analyzeChatQuery } from '@/lib/ai/rag/query-analyzer';

describe('analyzeChatQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    'What is this library mainly about?',
    'What are the most important takeaways from this library?',
    'What are these libraries mainly about?',
    'What are the most important takeaways across these libraries?',
  ])('routes library overview prompts to retrieval: %s', async (content) => {
    await expect(
      analyzeChatQuery([{ role: 'user', content }])
    ).resolves.toMatchObject({
      isDocumentActionRequest: false,
      isOutOfScope: false,
      isConversationalOnly: false,
      needsClarification: false,
      standaloneQuery: content,
    });
  });

  it('returns needsClarification: true when LLM flags a missing subject', async () => {
    jest.mocked(generateAnswer).mockResolvedValue(
      JSON.stringify({
        isDocumentActionRequest: false,
        isOutOfScope: false,
        isConversationalOnly: false,
        needsClarification: true,
        clarificationQuestion:
          'Which show, series, or topic does episode 195 belong to?',
        standaloneQuery: '',
        tagKeywords: [],
      })
    );

    const result = await analyzeChatQuery([
      { role: 'user', content: 'when does episode 195 aired?' },
    ]);

    expect(result).toMatchObject({
      isDocumentActionRequest: false,
      isOutOfScope: false,
      isConversationalOnly: false,
      needsClarification: true,
      clarificationQuestion: expect.stringContaining('episode 195'),
      standaloneQuery: '',
      tagKeywords: [],
    });
  });

  it('resolves needsClarification to false when follow-up turn provides the missing context', async () => {
    jest.mocked(generateAnswer).mockResolvedValue(
      JSON.stringify({
        isDocumentActionRequest: false,
        isOutOfScope: false,
        isUserCorrection: false,
        correctionSearchQuery: '',
        isConversationalOnly: false,
        needsClarification: false,
        clarificationQuestion: '',
        standaloneQuery: 'When did episode 195 of Naruto air?',
        tagKeywords: ['naruto', 'episode 195'],
      })
    );

    const result = await analyzeChatQuery([
      { role: 'user', content: 'when does episode 195 aired?' },
      {
        role: 'assistant',
        content: 'Which show, series, or topic does episode 195 belong to?',
      },
      { role: 'user', content: 'Naruto' },
    ]);

    expect(result).toMatchObject({
      needsClarification: false,
      standaloneQuery: 'When did episode 195 of Naruto air?',
    });
  });

  it('returns isUserCorrection: true when user disputes an earlier assistant statement', async () => {
    jest.mocked(generateAnswer).mockResolvedValue(
      JSON.stringify({
        isDocumentActionRequest: false,
        isOutOfScope: false,
        isUserCorrection: true,
        correctionSearchQuery: 'Detective Conan episode 195 air date',
        isConversationalOnly: false,
        needsClarification: false,
        clarificationQuestion: '',
        standaloneQuery: 'Detective Conan episode 195 air date',
        tagKeywords: ['detective conan', 'episode 195'],
      })
    );

    const result = await analyzeChatQuery([
      { role: 'user', content: 'when does episode 195 aired?' },
      {
        role: 'assistant',
        content:
          'Based on the information, Episode 195 of Detective Conan aired on June 19, 2000.',
      },
      { role: 'user', content: 'episode 195 was aired July not June' },
    ]);

    expect(result).toMatchObject({
      isUserCorrection: true,
      correctionSearchQuery: 'Detective Conan episode 195 air date',
      isConversationalOnly: false,
      needsClarification: false,
    });
  });

  it('keeps isUserCorrection: false when there is no prior assistant statement to dispute', async () => {
    jest.mocked(generateAnswer).mockResolvedValue(
      JSON.stringify({
        isDocumentActionRequest: false,
        isOutOfScope: false,
        isUserCorrection: false,
        correctionSearchQuery: '',
        isConversationalOnly: false,
        needsClarification: false,
        clarificationQuestion: '',
        standaloneQuery: 'episode 195 was aired July not June',
        tagKeywords: [],
      })
    );

    const result = await analyzeChatQuery([
      { role: 'user', content: 'episode 195 was aired July not June' },
    ]);

    expect(result).toMatchObject({
      isUserCorrection: false,
      correctionSearchQuery: '',
    });
  });
});