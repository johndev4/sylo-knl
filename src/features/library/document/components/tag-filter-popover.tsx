'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { useGetRecentlyAddedTags, useSearchLibraryTagsSWR } from '../swr';

interface TagFilterPopoverProps {
  libraryId: string;
  refreshKey?: number;
  selectedTags: string[];
  onApplyTags: (tags: string[]) => void;
}

export function TagFilterPopover({
  libraryId,
  selectedTags,
  onApplyTags,
}: TagFilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draftSelectedTags, setDraftSelectedTags] =
    useState<string[]>(selectedTags);

  // Tag search internal state
  const [tagSearchInput, setTagSearchInput] = useState('');
  const [debouncedTagSearch, setDebouncedTagSearch] = useState('');

  // Sync draft state with external selectedTags when popover opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftSelectedTags(selectedTags);
      setTagSearchInput('');
    }
    setOpen(nextOpen);
  };

  // Debounce tag search input by 300ms for network request
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTagSearch(tagSearchInput);
    }, 300);

    return () => clearTimeout(timer);
  }, [tagSearchInput]);

  // Recommended tags via SWR
  const { data: recommendedTags = [], isLoading: isRecommendedLoading } =
    useGetRecentlyAddedTags(libraryId);

  // Search results via SWR
  const { data: searchResults = [], isLoading: isSearchLoading } =
    useSearchLibraryTagsSWR(libraryId, debouncedTagSearch);

  const isSearching = tagSearchInput.trim().length > 0;
  const filterQuery = tagSearchInput.trim().toUpperCase();

  // Set of selected tags for O(1) duplicate prevention
  const selectedSet = useMemo(
    () => new Set(draftSelectedTags),
    [draftSelectedTags]
  );

  // Filter selected tags based on search query for instant 0ms feedback
  const displaySelectedTags = useMemo(() => {
    if (!isSearching) return draftSelectedTags;
    return draftSelectedTags.filter((tag) =>
      tag.toUpperCase().includes(filterQuery)
    );
  }, [draftSelectedTags, isSearching, filterQuery]);

  // Filter remaining tags (recommended or search results), preventing duplicate display
  const displayOtherTags = useMemo(() => {
    const rawList = isSearching ? searchResults : (recommendedTags as string[]);
    return rawList.filter((tag) => !selectedSet.has(tag));
  }, [isSearching, searchResults, recommendedTags, selectedSet]);

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

  const isListEmpty =
    displaySelectedTags.length === 0 && displayOtherTags.length === 0;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size={'sm'}>
            <ListFilterIcon />
            <span className="truncate">{triggerLabel}</span>
          </Button>
        }
      />
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search tags..."
            value={tagSearchInput}
            onValueChange={setTagSearchInput}
          />
          <CommandList>
            {isListEmpty ? (
              <CommandEmpty>
                {isSearchLoading || isRecommendedLoading
                  ? 'Loading tags...'
                  : 'No tags found.'}
              </CommandEmpty>
            ) : (
              <>
                {displaySelectedTags.length > 0 && (
                  <CommandGroup heading="Selected Tags">
                    {displaySelectedTags.map((tag) => (
                      <CommandItem
                        key={tag}
                        value={tag}
                        onSelect={() => toggleTag(tag)}
                        className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase"
                      >
                        <Checkbox
                          checked={true}
                          onCheckedChange={() => toggleTag(tag)}
                          tabIndex={-1}
                          className="pointer-events-none"
                        />
                        <span className="truncate">{tag}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {displayOtherTags.length > 0 && (
                  <CommandGroup
                    heading={
                      isSearching ? 'Search Results' : 'Recommended Tags'
                    }
                  >
                    {displayOtherTags.map((tag) => (
                      <CommandItem
                        key={tag}
                        value={tag}
                        onSelect={() => toggleTag(tag)}
                        className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase"
                      >
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => toggleTag(tag)}
                          tabIndex={-1}
                          className="pointer-events-none"
                        />
                        <span className="truncate">{tag}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
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
