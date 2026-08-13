import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const LOGIN_PATH = '/login';
const HUB_PATH = '/hub';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(LOGIN_PATH);
  } else {
    redirect(HUB_PATH);
  }
}
