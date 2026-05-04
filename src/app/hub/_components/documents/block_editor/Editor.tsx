'use client';

import '@blocknote/core/fonts/inter.css';
import { BlockNoteEditor, PartialBlock } from '@blocknote/core';
import { SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';
import React from 'react';
import { getCustomSlashMenuItems } from './custom-slash-menu-items';
import { useTheme } from 'next-themes';

interface EditorProps {
  onChange: (blocksJson: string) => void;
  initialContent?: string;
  editable?: boolean;
}

const Editor: React.FC<EditorProps> = ({
  onChange,
  initialContent,
  editable = true,
}) => {
  const { resolvedTheme } = useTheme();

  const handleEditorChange = async () => {
    const blocksJson = JSON.stringify(editor.document);
    onChange(blocksJson);
  };

  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent: initialContent
      ? (JSON.parse(initialContent) as PartialBlock[])
      : undefined,
    pasteHandler: ({ event, editor, defaultPasteHandler }) => {
      const pastedText = event.clipboardData?.getData('text/plain');

      if (pastedText) {
        editor.pasteMarkdown(pastedText);
        return true;
      }

      return defaultPasteHandler();
    },
  });

  return (
    <div className="-mx-[54px] my-4">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        onChange={handleEditorChange}
        slashMenu={false}
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
