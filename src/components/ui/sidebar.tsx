import * as React from 'react';
import { PanelLeft } from 'lucide-react';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps extends React.ComponentProps<'aside'> {
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
}

function Sidebar({
  className,
  side = 'left',
  variant = 'sidebar',
  ...props
}: SidebarProps) {
  return (
    <aside
      data-slot="sidebar"
      data-side={side}
      data-variant={variant}
      className={cn(
        'bg-background text-sidebar-foreground flex h-full flex-col border-r border-zinc-200/10 dark:border-zinc-800/20',
        side === 'right' && 'border-l border-r-0',
        variant === 'floating' && 'rounded-xl border shadow-sm',
        variant === 'inset' && 'bg-muted/50',
        className
      )}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-header" className={cn('flex items-center gap-2 p-4', className)} {...props} />;
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-content" className={cn('flex min-h-0 flex-1 flex-col', className)} {...props} />;
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-footer" className={cn('mt-auto flex items-center p-4', className)} {...props} />;
}

function SidebarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group" className={cn('flex w-full flex-col gap-2', className)} {...props} />;
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group-label" className={cn('text-muted-foreground px-2 text-[10px] font-bold tracking-[0.2em] uppercase', className)} {...props} />;
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group-content" className={cn('flex flex-col gap-3', className)} {...props} />;
}

function SidebarMenu({ className, ...props }: React.ComponentProps<'ul'>) {
  return <ul data-slot="sidebar-menu" className={cn('flex flex-col gap-1', className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={cn('w-full', className)} {...props} />;
}

interface SidebarMenuButtonProps extends React.ComponentProps<'button'> {
  asChild?: boolean;
  isActive?: boolean;
}

function SidebarMenuButton({
  className,
  asChild = false,
  isActive = false,
  ...props
}: SidebarMenuButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';

  return (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive}
      className={cn(
        'flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors',
        isActive
          ? 'bg-muted text-foreground font-medium'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        className
      )}
      {...props}
    />
  );
}

function SidebarTrigger({ className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn('h-7 w-7', className)}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
    </Button>
  );
}

function SidebarRail({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-rail" className={cn('bg-border/50 h-full w-px', className)} {...props} />;
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
};
export type { SidebarProps };
