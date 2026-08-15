import { getUser } from '@/lib/auth/get-user';
import { redirect } from 'next/navigation';

export default async function Home() {
  // getUser() already handles redirect to /login if unauthenticated
  await getUser();
  redirect('/hub');
}
