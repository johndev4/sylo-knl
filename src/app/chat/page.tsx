import { Suspense } from 'react';
import ChatClient from './_components/chat-client';
import { getUserLibraries } from '@/queries/chat';
import { ChatSkeleton } from './_components';

interface ChatPageProps {
  searchParams: Promise<{ libraryIds?: string }>;
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

  const preSelected = params.libraryIds ? params.libraryIds.split(',') : [];
  const validIds = new Set(libraries.map((l) => l.id));
  const initialLibraryIds = preSelected.filter((id) => validIds.has(id));

  return (
    <ChatClient libraries={libraries} initialLibraryIds={initialLibraryIds} />
  );
}
