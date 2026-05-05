import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Suspense } from 'react';
import { ThemeProvider } from 'next-themes';
import { Navbar } from '@/components/layout/Navbar';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        geist.variable,
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
            <Suspense fallback={null}>{children}</Suspense>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
