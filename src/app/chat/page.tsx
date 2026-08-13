import { Suspense } from 'react';

import ChatClient from './_components/chat-client';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChatSkeleton } from './_components';
import { getUserLibraries } from '@/lib/actions/libraries';

interface ChatPageProps {
  searchParams: Promise<{ libraryId?: string }>;
}

// 1. Keep the parent page component completely clean so Suspense can stream immediately
export default function ChatPage({ searchParams }: ChatPageProps) {
  return (
    <Suspense fallback={<ChatSkeleton />}>
      <ChatPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ChatPageContent({ searchParams }: ChatPageProps) {
  // 3. Concurrent fetching or clean data resolution
  const [params, libraries] = await Promise.all([
    searchParams,
    getUserLibraries(),
  ]);

  // 4. Determine pre-selected items safely
  const preSelectedId = params.libraryId;
  const initialLibraryIds =
    preSelectedId && libraries.some((l) => l.id === preSelectedId)
      ? [preSelectedId]
      : [];

  return (
    <ChatClient libraries={libraries} initialLibraryIds={initialLibraryIds} />
  );
}
