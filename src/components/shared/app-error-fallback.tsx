'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logging/logger';

export function AppErrorFallback({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    logger.error('Unhandled application error', {
      digest: error.digest,
      error,
    });
  }, [error]);

  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground">
          We couldn&apos;t complete your request. Please try again.
        </p>
        <Button onClick={retry}>Try again</Button>
      </div>
    </main>
  );
}
