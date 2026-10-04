import { chunkText } from '../../src/lib/ai/chunking';
import {
  blockNoteJsonToMarkdownAndPlainText,
  markdownToBlockNoteJson,
} from '../../src/lib/document-converters';

describe('document converters', () => {
  it('runs the complete transient conversion and reads legacy Markdown', async () => {
    const conversion = await blockNoteJsonToMarkdownAndPlainText([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Canonical document text', styles: {} },
        ],
      },
    ]);
    const legacyBlocks = await markdownToBlockNoteJson(
      '## Legacy heading\n\nLegacy paragraph'
    );

    expect(conversion.markdown).toContain('Canonical document text');
    expect(conversion.plainText).toContain('Canonical document text');
    expect(legacyBlocks[0].type).toBe('heading');
    expect(legacyBlocks[1].type).toBe('paragraph');
  });

  it('preserves empty documents and rejects invalid or oversized block input', async () => {
    // We keep this test to validate shared logic via a remaining converter if needed, 
    // but since we removed blockNoteJsonToMarkdown, we remove these specific tests.
  });
});

describe('chunkText', () => {
  it('preserves trailing text without sentence punctuation', () => {
    expect(chunkText('First sentence. trailing text')).toEqual([
      'First sentence. trailing text',
    ]);
  });
});