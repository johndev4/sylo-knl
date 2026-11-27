import {
  buildPromptContext,
  buildSystemPrompt,
  buildConversationalSystemPrompt,
  buildOutOfScopeSystemPrompt,
  buildClarificationSystemPrompt,
  buildDocumentActionSystemPrompt,
  buildCorrectionVerificationSystemPrompt,
} from '@/lib/ai/rag/context-builder';

describe('chat response date and time formatting', () => {
  it('instructs every chat response path to use human-readable dates and times', () => {
    const prompts = [
      buildSystemPrompt('Context', ['Library']),
      buildConversationalSystemPrompt(['Library']),
      buildOutOfScopeSystemPrompt(['Library']),
      buildClarificationSystemPrompt(['Library'], 'the document title'),
      buildDocumentActionSystemPrompt(['Library']),
    ];

    for (const prompt of prompts) {
      expect(prompt).toContain('"January 15, 2000"');
      expect(prompt).toContain('"4:30 PM"');
      expect(prompt).toContain(
        'never infer or change a date, time, or time zone'
      );
    }
  });

  it('includes exact Sylo document links and requires citations for library facts', () => {
    const context = buildPromptContext([
      {
        id: 'chunk-1',
        document_id: 'document-1',
        content: 'Episode 195 aired on June 19, 2000.',
        title: 'Episode 195',
        library_name: 'Anime',
        similarity: 0.9,
        document_url: '/hub/libraries/library-1/documents/document-1',
      },
    ]);

    expect(context).toContain(
      'Source: [Episode 195](/hub/libraries/library-1/documents/document-1)'
    );
    expect(buildSystemPrompt(context, ['Anime'])).toContain(
      'ALWAYS format the document name as an active clickable Markdown hyperlink: [Document Title](document_url)'
    );
    expect(
      buildCorrectionVerificationSystemPrompt(context, ['Anime'])
    ).toContain(
      'ALWAYS format the document name as an active clickable Markdown hyperlink: [Document Title](document_url)'
    );
    expect(buildConversationalSystemPrompt(['Anime'])).toContain(
      'preserve the clickable source links already present in the conversation'
    );
  });
});
