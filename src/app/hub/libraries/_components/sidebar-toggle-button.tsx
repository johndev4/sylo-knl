'use client';

import { PanelLeft, PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SidebarToggleButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export function SidebarToggleButton({
  isOpen,
  onToggle,
  className,
}: SidebarToggleButtonProps) {
  const label = isOpen ? 'Collapse sidebar' : 'Expand sidebar';
  const Icon = isOpen ? PanelLeftClose : PanelLeft;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={label}
          aria-expanded={isOpen}
          className={cn(
            'h-7 w-7 rounded-full border-zinc-200/70 bg-white/80 text-zinc-600 shadow-sm backdrop-blur transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800/70 dark:bg-zinc-950/70 dark:text-zinc-300 dark:hover:bg-zinc-800',
            className
          )}
          onClick={onToggle}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
