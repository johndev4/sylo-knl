import { Suspense } from 'react';

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <JoinLayoutShell>{children}</JoinLayoutShell>
    </Suspense>
  );
}

async function JoinLayoutShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
