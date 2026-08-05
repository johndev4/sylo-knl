'use client';

import '@blocknote/core/fonts/inter.css';
import { BlockNoteEditor } from '@blocknote/core';
import { SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';
import React, { useEffect, useState, useRef } from 'react';
import { getCustomSlashMenuItems } from './custom-slash-menu-items';
import { useTheme } from 'next-themes';

interface EditorProps {
  onChange: (markdown: string, blockCount: number) => void;
  initialContent?: string;
  editable?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function countBlocks(blocks: any[]): number {
  let count = 0;
  for (const block of blocks) {
    count++;
    if (block.children && block.children.length > 0) {
      count += countBlocks(block.children);
    }
  }
  return count;
}

const Editor: React.FC<EditorProps> = ({
  onChange,
  initialContent,
  editable = true,
}) => {
  const { resolvedTheme } = useTheme();
  const [initialContentLoaded, setInitialContentLoaded] = useState(false);
  const loadedRef = useRef(false);

  const editor: BlockNoteEditor = useCreateBlockNote({
    pasteHandler: ({ event, editor, defaultPasteHandler }) => {
      const pastedText = event.clipboardData?.getData('text/plain');

      if (pastedText) {
        editor.pasteMarkdown(pastedText);
        return true;
      }

      return defaultPasteHandler();
    },
  });

  useEffect(() => {
    async function loadContent() {
      if (loadedRef.current) return;
      loadedRef.current = true;

      if (initialContent) {
        try {
          const blocks = await editor.tryParseMarkdownToBlocks(initialContent);
          editor.replaceBlocks(editor.document, blocks);
        } catch (e) {
          console.error('Failed to parse markdown', e);
        }
      }
      setInitialContentLoaded(true);
    }
    loadContent();
  }, [editor, initialContent]);

  const handleEditorChange = async () => {
    const blocks = editor.document;
    const blockCount = countBlocks(blocks);
    const markdown = await editor.blocksToMarkdownLossy(blocks);
    onChange(markdown, blockCount);
  };

  if (!initialContentLoaded) {
    return (
      <div className="h-full animate-pulse rounded-lg bg-zinc-100/50 dark:bg-zinc-900/50"></div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="-mx-[54px] flex h-full flex-col">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        onChange={handleEditorChange}
        slashMenu={false}
        className="flex-1 overflow-y-auto"
        portalElements={{ default: document.body }}
      >
        <SuggestionMenuController
          triggerCharacter={'/'}
          // Replaces the default Slash Menu items with our custom ones.
          getItems={async (query) => getCustomSlashMenuItems(editor, query)}
        />
      </BlockNoteView>
    </div>
  );
};

export default Editor;
