import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Forbidden() {
  return (
    <div
      className={cn(
        'flex min-h-screen items-center justify-center',
        'bg-background text-foreground transition-colors'
      )}
    >
      <div className="space-y-6 px-4 text-center">
        <div>
          <h1 className="text-foreground mb-2 text-6xl font-bold">403</h1>
          <p className="text-muted-foreground text-lg">Access denied.</p>
        </div>

        <div className="space-y-3">
          <p className="text-foreground/70 text-sm">
            You don&apos;t have permission to access this page.
          </p>

          <Link href="/">
            <Button size="lg" className="gap-2">
              Go to Hub
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
