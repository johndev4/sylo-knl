import type { Metadata } from 'next';
import './globals.css';
import { AppThemeProvider } from '@/components/providers/app-theme-provider';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/components/providers/auth-provider';
import { getUserNonRedirect } from '@/lib/auth/get-user';
import { Suspense } from 'react';
import { AppHeader } from '@/components/layout/app-header';

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
            <Suspense fallback={null}>
              <AuthProviderWrapper>
                <AppHeader />
                <main className="flex-1">{children}</main>
              </AuthProviderWrapper>
            </Suspense>
          </TooltipProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}

async function AuthProviderWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUserNonRedirect();
  return <AuthProvider initialUser={user}>{children}</AuthProvider>;
}
