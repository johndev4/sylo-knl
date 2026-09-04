import type { Metadata } from 'next';
import './globals.css';
import { AppThemeProvider } from '@/components/providers/app-theme-provider';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppHeader } from '@/components/layout/app-header';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

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
      className={cn('h-full', 'antialiased', 'font-sans', inter.variable)}
      suppressHydrationWarning
    >
      <head />
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <AppThemeProvider>
          <TooltipProvider>
            <AppHeader />
            <main className="flex-1">{children}</main>
          </TooltipProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
