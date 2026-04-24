'use client';

import { Check, Moon, Sun, Monitor } from 'lucide-react';
import { useThemeContext } from '@/components/providers/ThemeProvider';
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { id: Theme; label: string; icon: React.ReactNode }[] = [
  { id: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
  { id: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
  { id: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
];

export function ThemeSubmenu() {
  const { theme, setTheme } = useThemeContext();

  return (
    <>
      <DropdownMenuLabel>Theme</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
        {THEME_OPTIONS.map((option) => (
          <DropdownMenuRadioItem
            key={option.id}
            value={option.id}
            className="flex items-center gap-2"
          >
            <div className="text-foreground/70">
              {option.icon}
            </div>
            <span>{option.label}</span>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );
}
