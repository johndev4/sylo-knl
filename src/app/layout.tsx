import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Suspense } from 'react';
import { ThemeProvider } from 'next-themes';
import { Navbar } from '@/components/layout/navbar';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Spinner } from '@/components/ui/spinner';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Sylo',
  description: 'An AI-powered knowledge library',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        'h-full',
        'antialiased',
        geistSans.variable,
        geistMono.variable,
        'font-sans',
        geist.variable
      )}
      suppressHydrationWarning
    >
      <head />
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <ThemeProvider
          enableSystem
          attribute="class"
          storageKey="app-theme"
          defaultTheme="system"
          disableTransitionOnChange
        >
          <TooltipProvider>
            <Navbar />
            <main className="flex-1">
              <Suspense
                fallback={
                  <div className="text-muted-foreground flex flex-1 items-center justify-center p-8 text-sm h-[calc(100dvh-4.5rem)]">
                    <div className="flex flex-col items-center gap-4">
                      <Spinner className="text-muted-foreground h-8 w-8" />
                      Loading…
                    </div>
                  </div>
                }
              >
                {children}
              </Suspense>
            </main>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
