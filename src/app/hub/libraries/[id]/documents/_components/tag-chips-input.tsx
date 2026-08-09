'use client';

import { useRef } from 'react';
import { X } from 'lucide-react';

interface TagChipsInputProps {
  tags: string[];
  tagInput: string;
  suggestions: string[];
  onInputChange: (value: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}

export function TagChipsInput({
  tags,
  tagInput,
  suggestions,
  onInputChange,
  onAddTag,
  onRemoveTag,
}: TagChipsInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      onAddTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      onRemoveTag(tags[tags.length - 1]);
    }
  };

  return (
    <div
      className="border-border flex min-h-[36px] flex-wrap items-center gap-1.5 rounded-lg border bg-transparent px-2 py-1 focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-600"
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

      <div className="relative min-w-[100px] flex-1">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          value={tagInput}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={'Add tag...'}
          aria-label="Tags"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls="tag-suggestion-list"
          aria-expanded={suggestions.length > 0}
          className="text-muted-foreground/60 placeholder:text-muted-foreground/30 w-full border-none bg-transparent text-xs focus:outline-none"
        />
        {suggestions.length > 0 && (
          <div
            id="tag-suggestion-list"
            role="listbox"
            aria-label="Tag suggestions"
            className="absolute top-full left-0 z-10 mt-2 max-h-56 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
          >
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAddTag(suggestion);
                }}
                className="text-muted-foreground w-full px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
