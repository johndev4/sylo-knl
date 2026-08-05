import { BlockNoteEditor, filterSuggestionItems } from '@blocknote/core';
import {
  DefaultReactSuggestionItem,
  getDefaultReactSlashMenuItems,
} from '@blocknote/react';

// List containing all default Slash Menu Items, as well as our custom one.
export function getCustomSlashMenuItems(
  editor: BlockNoteEditor,
  query: string
): DefaultReactSuggestionItem[] {
  const allItems = getDefaultReactSlashMenuItems(editor);

  // Define the specific items you want to keep
  // We exclude 'Advanced' (tables, media) to keep it syncable to standard markdown
  const allowedGroups = ['Headings', 'Basic blocks', 'Subheadings'];

  const filteredItems = allItems.filter((item) =>
    allowedGroups.includes(item.group as string)
  );

  // Filter based on what the user is currently typing
  return filterSuggestionItems(filteredItems, query);
}
