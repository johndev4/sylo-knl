import { getUserNonRedirect } from '@/lib/auth/get-user';
import { redirect } from 'next/navigation';

export const instant = false;

export default async function Home() {
  const user = await getUserNonRedirect();

  if (user) {
    redirect('/hub');
  } else {
    redirect('/login');
  }
}
