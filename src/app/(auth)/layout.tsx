'use client';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { Suspense } from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <Suspense fallback={null}>{children}</Suspense>
    </ThemeProvider>
  );
}
