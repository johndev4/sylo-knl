'use client';

import { useState, useMemo } from 'react';
import { ChevronUp, Library } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import { useChatLibrary } from '@/features/chat/providers/chat-library-provider';

export function LibrarySelectorButton() {
  const [open, setOpen] = useState(false);
  const { libraries, selectedIds, allSelected, toggleLibrary, toggleAll } =
    useChatLibrary();

  const label = useMemo(() => {
    if (libraries.length === 0) return 'No libraries';
    if (allSelected) return 'All libraries';
    if (selectedIds.length === 0) return 'Select library';
    if (selectedIds.length === 1) {
      const lib = libraries.find((l) => l.id === selectedIds[0]);
      return lib?.name ?? '1 library';
    }
    return `${selectedIds.length} libraries`;
  }, [libraries, allSelected, selectedIds]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Select libraries"
            aria-haspopup="listbox"
            aria-expanded={open}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium',
              'text-muted-foreground ring-offset-background transition-colors',
              'hover:bg-accent hover:text-foreground',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
              'disabled:pointer-events-none disabled:opacity-50',
              selectedIds.length > 0
                ? 'border-border bg-background'
                : 'border-border/60 border-dashed bg-transparent'
            )}
          >
            <Library className="size-3 shrink-0" aria-hidden="true" />
            <span className="max-w-[120px] truncate">{label}</span>
            <ChevronUp
              className={cn(
                'size-3 shrink-0 transition-transform duration-150',
                open ? 'rotate-0' : 'rotate-180'
              )}
              aria-hidden="true"
            />
          </button>
        }
      />
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-72 p-0"
      >
        <Command>
          <CommandInput placeholder="Search libraries…" autoFocus />
          <CommandList>
            <CommandEmpty className="text-muted-foreground py-6 text-center text-sm">
              No libraries found.
            </CommandEmpty>
            <CommandGroup>
              {libraries.map((lib) => {
                const isSelected = selectedIds.includes(lib.id);
                return (
                  <CommandItem
                    key={lib.id}
                    value={lib.name}
                    data-checked={isSelected}
                    onSelect={() => toggleLibrary(lib.id)}
                    aria-selected={isSelected}
                    className="gap-2"
                  >
                    <Checkbox
                      checked={isSelected}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="pointer-events-none"
                    />
                    <span className="min-w-0 flex-1 truncate">{lib.name}</span>
                    <Badge
                      variant="outline"
                      className="text-muted-foreground ml-auto h-4 shrink-0 border-none px-1 text-[9px] font-bold"
                    >
                      {lib.role}
                    </Badge>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          {libraries.length > 1 && (
            <div className="border-t p-1">
              <button
                type="button"
                onClick={toggleAll}
                className={cn(
                  'text-muted-foreground hover:text-foreground hover:bg-accent w-full rounded-sm px-2 py-1.5 text-left text-xs transition-colors',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
                )}
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
