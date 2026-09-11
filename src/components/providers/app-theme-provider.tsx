'use client';

import { ThemeProvider, ThemeProviderProps } from 'next-themes';

export function AppThemeProvider({ children }: ThemeProviderProps) {
  return (
    <ThemeProvider
      enableSystem
      attribute="class"
      storageKey="app-theme"
      defaultTheme="system"
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
