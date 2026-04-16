'use client';

import { Check, Moon, Sun, Monitor } from 'lucide-react';
import { useThemeContext } from '@/components/providers/ThemeProvider';

type Theme = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { id: Theme; label: string; icon: React.ReactNode }[] = [
  { id: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
  { id: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
  { id: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
];

export function ThemeSubmenu() {
  const { theme, setTheme } = useThemeContext();

  return (
    <div className="space-y-1">
      {THEME_OPTIONS.map((option) => (
        <button
          key={option.id}
          onClick={() => setTheme(option.id)}
          className={cn(
            'w-full flex items-center justify-between px-2 py-2 text-sm rounded-md transition-colors',
            'hover:bg-accent/50 dark:hover:bg-accent/30',
            theme === option.id ? 'bg-accent/30 dark:bg-accent/20' : ''
          )}
          role="menuitemradio"
          aria-checked={theme === option.id}
        >
          <div className="flex items-center gap-2">
            <div className="text-foreground/70 dark:text-foreground/60">
              {option.icon}
            </div>
            <span className="text-foreground dark:text-foreground/90">
              {option.label}
            </span>
          </div>
          {theme === option.id && (
            <Check className="w-4 h-4 text-foreground dark:text-foreground/80" />
          )}
        </button>
      ))}
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
