'use client';

import './globals.css';
import { AppErrorFallback } from '@/components/shared/app-error-fallback';

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <AppErrorFallback error={error} retry={retry} />
      </body>
    </html>
  );
}
