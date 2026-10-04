import { chunkText } from '../../src/lib/ai/chunking';
import {
  blockNoteJsonToMarkdownAndPlainText,
  blockNoteJsonToPlainText,
  markdownToBlockNoteJson,
  parseBlockNoteJson,
} from '../../src/lib/document-converters';

describe('document converters', () => {
  it('extracts plain text from validated BlockNote blocks without Markdown conversion', async () => {
    const blocks = [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Canonical document text', styles: {} },
        ],
      },
    ];
    const conversion = await blockNoteJsonToMarkdownAndPlainText([
      ...blocks,
    ]);

    expect(parseBlockNoteJson(blocks)).toEqual(blocks);
    expect(blockNoteJsonToPlainText(blocks)).toBe('Canonical document text');
    expect(conversion).toEqual({
      markdown: '',
      plainText: 'Canonical document text',
    });
  });

  it('rejects Markdown conversion through the deprecated runtime helper', async () => {
    await expect(markdownToBlockNoteJson('Legacy Markdown')).rejects.toThrow(
      'markdownToBlockNoteJson is deprecated at runtime. Use the /api/documents/convert-markdown endpoint instead.'
    );
  });

  it('rejects invalid or oversized block input', () => {
    expect(() => blockNoteJsonToPlainText({})).toThrow(
      'Document content must be an array of BlockNote blocks'
    );
    expect(() =>
      parseBlockNoteJson(
        Array.from({ length: 1001 }, () => ({ type: 'paragraph' }))
      )
    ).toThrow('Documents cannot exceed 1000 blocks');
  });
});

describe('chunkText', () => {
  it('preserves trailing text without sentence punctuation', () => {
    expect(chunkText('First sentence. trailing text')).toEqual([
      'First sentence. trailing text',
    ]);
  });
});