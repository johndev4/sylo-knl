import ChatClient from '@/features/chat/components/chat-client';
import { getUserLibraries } from '@/features/chat/queries';
import { getUser } from '@/lib/auth/get-user';
import { createClient } from '@/lib/supabase/server';

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ libraryIds?: string }>;
}) {
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
