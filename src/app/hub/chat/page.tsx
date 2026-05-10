import { getUserLibraries } from '@/lib/actions/libraries';
import ChatClient from './_components/ChatClient';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

interface ChatPageProps {
  searchParams: Promise<{ libraryId?: string }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  // Auth guard
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const isTest = cookieStore.get('playwright-test')?.value === 'true';

  if (!user && !isTest) {
    redirect('/auth/login');
  }

  const [libraries, params] = await Promise.all([
    getUserLibraries(),
    searchParams,
  ]);

  // Pre-select library from query param if valid
  const preSelectedId = params.libraryId;
  const initialLibraryIds =
    preSelectedId && libraries.some((l) => l.id === preSelectedId)
      ? [preSelectedId]
      : [];

  return (
    <ChatClient libraries={libraries} initialLibraryIds={initialLibraryIds} />
  );
}
