import { Suspense } from 'react';
import ChatClient from '@/features/chat/chat-client';
import { getUserLibraries } from '@/queries/chat';
import { ChatSkeleton } from '@/features/chat';
import { getUser } from '@/lib/auth/get-user';
import { createClient } from '@/lib/supabase/server';

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
  const [params, user] = await Promise.all([searchParams, getUser()]);

  const supabase = await createClient();
  const libraries = await getUserLibraries(supabase, user);

  const preSelected = params.libraryIds ? params.libraryIds.split(',') : [];
  const validIds = new Set(libraries.map((l) => l.id));
  const initialLibraryIds = preSelected.filter((id) => validIds.has(id));

  return (
    <ChatClient libraries={libraries} initialLibraryIds={initialLibraryIds} />
  );
}
