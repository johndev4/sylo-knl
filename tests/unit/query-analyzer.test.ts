jest.mock('../../src/lib/ai/core/llm', () => ({
  generateAnswer: jest.fn(),
}));

import { analyzeChatQuery } from '@/lib/ai/rag/query-analyzer';

describe('analyzeChatQuery', () => {
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
      standaloneQuery: content,
    });
  });
});