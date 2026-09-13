'use client';

import { useState, useEffect } from 'react';
import { ListFilterIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TagFilterPopoverProps {
  selectedTags: string[];
  displayTags: string[];
  tagSearchInput: string;
  debouncedTagSearch: string;
  isTagSearchLoading: boolean;
  onApplyTags: (tags: string[]) => void;
  onSearchChange: (value: string) => void;
}

export function TagFilterPopover({
  selectedTags,
  displayTags,
  tagSearchInput,
  debouncedTagSearch,
  isTagSearchLoading,
  onApplyTags,
  onSearchChange,
}: TagFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draftSelectedTags, setDraftSelectedTags] =
    useState<string[]>(selectedTags);

  // Sync draft state with external selectedTags when popover opens or prop changes
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraftSelectedTags(selectedTags);
    }
  }, [open, selectedTags]);

  const toggleTag = (tag: string) => {
    setDraftSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleApply = () => {
    onApplyTags(draftSelectedTags);
    setOpen(false);
  };

  const triggerLabel =
    selectedTags.length === 0
      ? 'Filter Tags'
      : selectedTags.length === 1
        ? selectedTags[0]
        : `${selectedTags.length} Tags Selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size={'sm'}>
            <ListFilterIcon />
            <span className="truncate">{triggerLabel}</span>
          </Button>
        }
      ></PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search tags..."
            value={tagSearchInput}
            onValueChange={onSearchChange}
          />
          <CommandList>
            {displayTags.length === 0 ? (
              <CommandEmpty>
                {isTagSearchLoading ? 'Searching...' : 'No tags found.'}
              </CommandEmpty>
            ) : (
              <CommandGroup
                heading={
                  debouncedTagSearch ? 'Search Results' : 'Recommended Tags'
                }
              >
                {displayTags.map((tag) => {
                  const isChecked = draftSelectedTags.includes(tag);
                  return (
                    <CommandItem
                      key={tag}
                      value={tag}
                      onSelect={() => toggleTag(tag)}
                      className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleTag(tag)}
                        tabIndex={-1}
                        className="pointer-events-none"
                      />
                      <span className="truncate">{tag}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
          <div className="flex items-center justify-between border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDraftSelectedTags([])}
              disabled={draftSelectedTags.length === 0}
              className="h-7 px-2 text-xs"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              className="h-7 px-3 text-xs"
            >
              Apply
            </Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
