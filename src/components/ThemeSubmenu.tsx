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
            'w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-smooth',
            'hover:bg-zinc-200 dark:hover:bg-zinc-800',
            theme === option.id ? 'bg-zinc-200 dark:bg-zinc-800' : ''
          )}
          role="menuitemradio"
          aria-checked={theme === option.id}
        >
          <div className="flex items-center gap-2">
            <div className="text-foreground/70">
              {option.icon}
            </div>
            <span className="text-foreground">
              {option.label}
            </span>
          </div>
          {theme === option.id && (
            <Check className="w-4 h-4 text-foreground" />
          )}
        </button>
      ))}
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}
