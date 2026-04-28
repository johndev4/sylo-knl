'use client';

import { ThemeProvider } from '@/components/ThemeProvider';
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
