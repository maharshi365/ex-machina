import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { authClient } from '@/lib/auth/client';

export function LoginPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && session?.user) {
      void navigate({ to: '/onboarding' });
    }
  }, [isPending, session, navigate]);

  if (isPending) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </main>
    );
  }

  if (session?.user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Redirecting to onboarding…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Continue with Google to access ex-machina.
      </p>

      <button
        onClick={() =>
          void authClient.signIn.social({ provider: 'google', callbackURL: '/onboarding' })
        }
        className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.2 3.31v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09A6.97 6.97 0 0 1 5.48 12s0-.4.36-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.42 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </button>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        By continuing you agree to our Terms.
      </p>
    </main>
  );
}
