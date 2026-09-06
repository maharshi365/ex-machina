import { Link, useNavigate } from '@tanstack/react-router';
import { Building2, LogOut } from 'lucide-react';

import { authClient } from '@/lib/auth/client';
import { Button } from '@/components/ui/button';

import type { OnboardingUser } from './types';

export function OnboardingHeader({ user }: { user: OnboardingUser }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </div>
          ex-machina
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
            {user.name?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase()}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              void authClient.signOut({
                fetchOptions: {
                  onSuccess: () => void navigate({ to: '/login' }),
                },
              })
            }
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
