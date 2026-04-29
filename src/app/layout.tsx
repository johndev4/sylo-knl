import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Suspense } from 'react';
import { ThemeProvider } from 'next-themes';
import { Navbar } from '@/components/layout/Navbar';
import { cn } from '@/lib/utils';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

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
      className={cn('scroll-smooth', 'antialiased', geist.variable)}
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
          <Navbar />
          <Suspense fallback={null}>{children}</Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
