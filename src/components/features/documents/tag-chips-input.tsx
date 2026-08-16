'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => setOpen(suggestions.length > 0))();
  }, [suggestions.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      onAddTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      onRemoveTag(tags[tags.length - 1]);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div
        className="border-border flex max-h-24 flex-wrap items-center gap-1.5 overflow-x-auto overflow-y-auto rounded-lg border bg-transparent px-2 py-1 focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-600"
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

        <DropdownMenuTrigger asChild>
          <input
            ref={inputRef}
            type="text"
            value={tagInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={'Add tag...'}
            aria-label="Tags"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-controls="tag-suggestion-list"
            aria-expanded={suggestions.length > 0}
            className="text-muted-foreground/60 placeholder:text-muted-foreground/30 min-w-[100px] flex-1 border-none bg-transparent text-xs focus:outline-none"
            maxLength={20}
          />
        </DropdownMenuTrigger>
      </div>

      <DropdownMenuContent align="start" className="w-40 p-0">
        {suggestions.map((suggestion) => (
          <DropdownMenuItem
            key={suggestion}
            onSelect={() => onAddTag(suggestion)}
            className="text-muted-foreground px-3 py-2 text-left text-xs"
          >
            {suggestion}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
