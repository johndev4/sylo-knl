import { LoginHero, SupabaseLogin } from '@/features/auth/components';

export default function LoginPage() {
  return (
    <LoginHero>
      <div>
        <div className="mb-6">
          <h2 className="text-3xl font-semibold">Login</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Safe and secure sign-in. Your data stays protected.
          </p>
        </div>
        <SupabaseLogin />
      </div>
    </LoginHero>
  );
}
