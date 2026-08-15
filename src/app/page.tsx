import { getUser } from '@/lib/auth/get-user';
import { redirect } from 'next/navigation';

export default async function Home() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  } else {
    redirect('/hub');
  }
}
