import { getUser } from '@/lib/auth/get-user';
import { redirect } from 'next/navigation';


const LOGIN_PATH = '/login';
const HUB_PATH = '/hub';

export default async function Home() {
  const user = await getUser();

  if (!user) {
    redirect(LOGIN_PATH);
  } else {
    redirect(HUB_PATH);
  }
}
