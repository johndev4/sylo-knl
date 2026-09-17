'use client';

import { useState, useEffect, useRef } from 'react';
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
import { createClient } from '@/lib/supabase/client';
import {
  getRecentlyAddedTags,
  searchLibraryTags,
} from '@/features/library/queries';

interface TagFilterPopoverProps {
  libraryId: string;
  refreshKey?: number;
  selectedTags: string[];
  onApplyTags: (tags: string[]) => void;
}

export function TagFilterPopover({
  libraryId,
  refreshKey,
  selectedTags,
  onApplyTags,
}: TagFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draftSelectedTags, setDraftSelectedTags] =
    useState<string[]>(selectedTags);

  // Tag search internal state
  const [recommendedTags, setRecommendedTags] = useState<string[]>([]);
  const [tagSearchInput, setTagSearchInput] = useState('');
  const [debouncedTagSearch, setDebouncedTagSearch] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isTagSearchLoading, setIsTagSearchLoading] = useState(false);

  // Ref to track the latest tag search request to avoid race conditions
  const activeTagSearchIdRef = useRef(0);

  // Sync draft state with external selectedTags when popover opens or prop changes
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraftSelectedTags(selectedTags);
    }
  }, [open, selectedTags]);

  // Debounce tag search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTagSearch(tagSearchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [tagSearchInput]);

  // Load recommended tags (recently added) on initial load or library change
  useEffect(() => {
    if (!libraryId) return;
    let isCancelled = false;

    (async () => {
      try {
        const supabase = await createClient();
        const tags = await getRecentlyAddedTags(libraryId, supabase);
        if (!isCancelled) {
          setRecommendedTags(tags);
        }
      } catch (error) {
        console.error('Failed to fetch recommended tags:', error);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [libraryId, refreshKey]);

  // Search tags backend as user types
  useEffect(() => {
    if (!libraryId || !debouncedTagSearch.trim()) return;

    let isCancelled = false;
    const requestId = ++activeTagSearchIdRef.current;

    (async () => {
      setIsTagSearchLoading(true);
      try {
        const supabase = await createClient();
        const results = await searchLibraryTags(
          libraryId,
          debouncedTagSearch,
          supabase
        );
        // Only update if this is still the latest request
        if (requestId === activeTagSearchIdRef.current && !isCancelled) {
          setSearchResults(results);
        }
      } catch (error) {
        if (requestId === activeTagSearchIdRef.current && !isCancelled) {
          console.error('Failed to search tags:', error);
        }
      } finally {
        if (requestId === activeTagSearchIdRef.current && !isCancelled) {
          setIsTagSearchLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [libraryId, debouncedTagSearch]);

  // Derive display tags based on whether searching or showing recommended
  const displayTags = debouncedTagSearch.trim()
    ? searchResults
    : recommendedTags;

  const toggleTag = (tag: string) => {
    setDraftSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleApply = () => {
    onApplyTags(draftSelectedTags);
    setTagSearchInput('');
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
            onValueChange={setTagSearchInput}
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
