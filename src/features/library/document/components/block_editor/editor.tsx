'use client';

import '@blocknote/core/fonts/inter.css';
import { BlockNoteEditor } from '@blocknote/core';
import { SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';
import React from 'react';
import { getCustomSlashMenuItems } from './custom-slash-menu-items';
import { useTheme } from 'next-themes';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BlockNotePartialBlocks } from '@/lib/blocknote/config';

interface EditorProps {
  onChange: (blocks: BlockNotePartialBlocks, blockCount: number) => void;
  initialContent?: BlockNotePartialBlocks;
  editable?: boolean;
}

function countBlocks(blocks: BlockNotePartialBlocks): number {
  let count = 0;
  for (const block of blocks) {
    count++;
    count += countBlocks(block.children ?? []);
  }
  return count;
}

const Editor: React.FC<EditorProps> = ({
  onChange,
  initialContent,
  editable = true,
}) => {
  const { resolvedTheme } = useTheme();

  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent: initialContent?.length
      ? (initialContent as never)
      : undefined,
  });

  const handleEditorChange = () => {
    const blocks = editor.document;
    const blockCount = countBlocks(blocks);
    onChange(blocks, blockCount);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <ScrollArea className="flex h-full w-full flex-col">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        onChange={handleEditorChange}
        slashMenu={false}
        portalElements={{ default: document.body }}
      >
        <SuggestionMenuController
          triggerCharacter={'/'}
          // Replaces the default Slash Menu items with our custom ones.
          getItems={async (query) => getCustomSlashMenuItems(editor, query)}
        />
      </BlockNoteView>
    </ScrollArea>
  );
};

export default Editor;
