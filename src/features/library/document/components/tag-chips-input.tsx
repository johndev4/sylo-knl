'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { X, Loader2Icon } from 'lucide-react';
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompleteStatus,
} from '@/components/ui/autocomplete';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface TagChipsInputProps {
  tags: string[];
  tagInput: string;
  suggestions: string[];
  isLoadingTags?: boolean;
  loadError?: string | null;
  onInputChange: (value: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export function TagChipsInput({
  tags,
  tagInput,
  suggestions,
  isLoadingTags = false,
  loadError = null,
  onInputChange,
  onAddTag,
  onRemoveTag,
}: TagChipsInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle when a suggestion is selected via click or keyboard
  useEffect(() => {
    if (tagInput && suggestions.includes(tagInput)) {
      onAddTag(tagInput);
      onInputChange('');
    }
  }, [tagInput, suggestions, onAddTag, onInputChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      // Check if there's a highlighted item in the autocomplete list
      const highlightedItem = document.querySelector(
        '[data-slot="autocomplete-item"][data-highlighted]'
      );
      if (highlightedItem) {
        // Let Base UI handle the selection (don't add here)
        // The useEffect will catch it when value changes
      } else if (
        suggestions.length === 0 ||
        !suggestions.includes(tagInput.trim())
      ) {
        // No highlighted item and either no suggestions or custom tag
        onAddTag(tagInput);
        onInputChange('');
      }
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      onRemoveTag(tags[tags.length - 1]);
    }
  };

  // Determine status message
  let statusMessage: ReactNode = '';
  if (isLoadingTags) {
    statusMessage = (
      <div className="flex items-center gap-2">
        <Loader2Icon className="size-4 animate-spin" />
        Searching tags…
      </div>
    );
  } else if (loadError) {
    statusMessage = `Error: ${loadError}`;
  }

  const shouldRenderPopup =
    (tagInput.trim().length >= 3 && suggestions.length > 0) || statusMessage;

  return (
    <Autocomplete
      items={suggestions}
      value={tagInput}
      onValueChange={onInputChange}
      itemToStringValue={(item) => item}
      filter={null}
    >
      <ScrollArea className="border-border rounded-lg border bg-transparent py-1 focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-600">
        <div
          className="flex max-h-24 flex-wrap items-center gap-1.5 px-2"
          onClick={() => inputRef.current?.focus()}
        >
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-muted-foreground flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-medium dark:bg-zinc-800"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTag(tag);
                }}
                className="hover:text-foreground transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}

          <AutocompleteInput
            ref={inputRef}
            type="text"
            placeholder="Add tag..."
            aria-label="Tags"
            onKeyDown={handleKeyDown}
            maxLength={20}
            showClear={false}
            showTrigger={false}
            className="text-muted-foreground/60 placeholder:text-muted-foreground/30 !focus-visible:ring-0 !focus-visible:border-none !h-auto min-w-[100px] flex-1 !rounded-none !border-none !bg-transparent !px-0 !py-0 text-xs !shadow-none !ring-0 focus:outline-none"
          />
        </div>

        <ScrollBar orientation="vertical" />
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {shouldRenderPopup && (
        <AutocompleteContent className="w-40">
          <AutocompleteStatus>{statusMessage}</AutocompleteStatus>
          {!isLoadingTags && (
            <AutocompleteList>
              {(suggestion: string) => (
                <AutocompleteItem
                  key={suggestion}
                  value={suggestion}
                  className="text-muted-foreground cursor-pointer px-3 py-2 text-left text-xs"
                >
                  {suggestion}
                </AutocompleteItem>
              )}
            </AutocompleteList>
          )}
        </AutocompleteContent>
      )}
    </Autocomplete>
  );
}
