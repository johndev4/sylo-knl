'use client';

import '@blocknote/core/fonts/inter.css';
import { BlockNoteEditor } from '@blocknote/core';
import { SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';
import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { getCustomSlashMenuItems } from './custom-slash-menu-items';
import { useTheme } from 'next-themes';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BlockNotePartialBlocks } from '@/lib/blocknote/config';

const subscribeToMount = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface EditorProps {
  onChange: (
    blocks: BlockNotePartialBlocks,
    blockCount: number,
    isUserEdit?: boolean
  ) => void;
  initialContent?: BlockNotePartialBlocks;
  editable?: boolean;
  onEditorReady?: (editor: BlockNoteEditor) => void;
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
  onEditorReady,
}) => {
  const { resolvedTheme } = useTheme();

  const editor: BlockNoteEditor = useCreateBlockNote({
    initialContent: initialContent?.length
      ? (initialContent as never)
      : undefined,
  });

  const isMounted = useSyncExternalStore(
    subscribeToMount,
    getClientSnapshot,
    getServerSnapshot
  );
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const isInitialMount = React.useRef(true);

  const handleViewRef = useCallback(
    (element: HTMLDivElement | null) => {
      setIsEditorMounted(Boolean(element));
      if (element) {
        onEditorReady?.(editor);
      }
    },
    [editor, onEditorReady]
  );

  const handleEditorChange = () => {
    const blocks = editor.document;
    const blockCount = countBlocks(blocks);
    const wasInitial = isInitialMount.current;
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
    const isFocused =
      typeof editor.isFocused === 'function' ? editor.isFocused() : false;
    const isUserEdit = !wasInitial && (isFocused || Boolean(editable));
    onChange(blocks, blockCount, isUserEdit);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!isMounted) return null;

  return (
    <ScrollArea className="flex h-full w-full flex-col">
      <BlockNoteView
        ref={handleViewRef}
        editor={editor}
        editable={editable}
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        onChange={handleEditorChange}
        slashMenu={false}
      >
        {isEditorMounted && (
          <SuggestionMenuController
            triggerCharacter={'/'}
            // Replaces the default Slash Menu items with our custom ones.
            getItems={async (query) => getCustomSlashMenuItems(editor, query)}
          />
        )}
      </BlockNoteView>
    </ScrollArea>
  );
};

export default Editor;
