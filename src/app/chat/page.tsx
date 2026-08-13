import { Suspense } from 'react';

import ChatClient from './_components/chat-client';
import { getUserLibraries } from '@/queries/chat';
import { ChatSkeleton } from './_components';

interface ChatPageProps {
  searchParams: Promise<{ libraryId?: string }>;
}

export default function ChatPage({ searchParams }: ChatPageProps) {
  return (
    <Suspense fallback={<ChatLoading />}>
      <ChatPageContent searchParams={searchParams} />
    </Suspense>
  );
}

function ChatLoading() {
  return <ChatSkeleton />;
}

async function ChatPageContent({ searchParams }: ChatPageProps) {
  const [params, libraries] = await Promise.all([
    searchParams,
    getUserLibraries(),
  ]);

  const preSelectedId = params.libraryId;
  const initialLibraryIds =
    preSelectedId && libraries.some((l) => l.id === preSelectedId)
      ? [preSelectedId]
      : [];

  return (
    <ChatClient libraries={libraries} initialLibraryIds={initialLibraryIds} />
  );
}
