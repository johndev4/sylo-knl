import { chunkText } from '../../src/lib/ai/chunking';
import {
  blockNoteJsonToMarkdownAndPlainText,
  blockNoteJsonToMarkdown,
  markdownToBlockNoteJson,
  markdownToPlainText,
} from '../../src/lib/document-converters';

describe('document converters', () => {
  it('converts BlockNote headings, inline styles, links, and nested list items', async () => {
    const markdown = await blockNoteJsonToMarkdown([
      {
        type: 'heading',
        props: { level: 2 },
        content: [
          { type: 'text', text: 'Knowledge base', styles: { bold: true } },
        ],
      },
      {
        type: 'bulletListItem',
        content: [
          {
            type: 'link',
            href: 'https://example.com',
            content: [{ type: 'text', text: 'search guide', styles: {} }],
          },
        ],
        children: [
          {
            type: 'bulletListItem',
            content: [{ type: 'text', text: 'Nested item', styles: {} }],
          },
        ],
      },
    ]);

    expect(markdown).toMatch(/## \*\*Knowledge base\*\*/);
    expect(markdown).toContain('search guide');
    expect(markdown).toContain('Nested item');
  });

  it('parses Markdown while preserving searchable text', async () => {
    const plainText = await markdownToPlainText(
      '# Heading\n\nA **bold** [search guide](https://example.com).\n\n' +
        '`inline code` and:\n\n```ts\nconst answer = 42;\n```\n\n> quoted text\n\n' +
        '<figure><img alt="diagram" src="https://example.com/image.png">' +
        '<figcaption>image caption</figcaption></figure>'
    );

    for (const text of [
      'Heading',
      'bold',
      'search guide',
      'inline code',
      'const answer = 42;',
      'quoted text',
      'diagram',
      'image caption',
    ]) {
      expect(plainText).toContain(text);
    }
    expect(plainText).not.toContain('**');
    expect(plainText).not.toContain('https://example.com');
  });

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
    await expect(blockNoteJsonToMarkdown([])).resolves.toBe('');
    await expect(markdownToPlainText('')).resolves.toBe('');
    await expect(
      blockNoteJsonToMarkdown({ type: 'paragraph' })
    ).rejects.toThrow(TypeError);
    await expect(blockNoteJsonToMarkdown([{}])).rejects.toThrow(TypeError);
    await expect(
      blockNoteJsonToMarkdown(
        Array.from({ length: 1001 }, () => ({ type: 'paragraph' }))
      )
    ).rejects.toThrow(RangeError);
  });
});

describe('chunkText', () => {
  it('preserves trailing text without sentence punctuation', () => {
    expect(chunkText('First sentence. trailing text')).toEqual([
      'First sentence. trailing text',
    ]);
  });
});