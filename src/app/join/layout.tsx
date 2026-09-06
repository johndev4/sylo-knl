import { AppHeader } from '@/components/layout/app-header';

interface JoinLayoutProps {
  children: React.ReactNode;
}

export default function JoinLayoutAsync({ children }: JoinLayoutProps) {
  return (
    <>
      <AppHeader />
      <main className="flex-1">{children}</main>
    </>
  );
}
