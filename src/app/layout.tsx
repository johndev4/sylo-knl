import type { Metadata } from 'next';
import { JetBrains_Mono, Geist } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Suspense } from 'react';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Navbar } from '@/components/layout/Navbar';
import { cn } from '@/lib/utils';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
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
        jetbrainsMono.variable,
        'font-sans',
        'font-sans',
        geist.variable
      )}
      suppressHydrationWarning
    >
      <head />
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('app-theme');
                const isDark = stored === 'dark' || 
                  (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
        <ThemeProvider>
          <Navbar />
          <Suspense fallback={null}>{children}</Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
