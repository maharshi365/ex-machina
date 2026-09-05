import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { auth } from '@/lib/auth/server';

import type { Invitation, Organization, OnboardingUser } from './types';

export const getOnboardingData = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    // let beforeLoad handle redirect; return empty
    return { organizations: [] as Organization[], invitations: [] as Invitation[], user: null };
  }

  let organizations: Organization[] = [];
  try {
    const orgs = await auth.api.listOrganizations({ headers: request.headers });
    organizations = (orgs as Organization[]) ?? [];
  } catch {
    organizations = [];
  }

  let invitations: Invitation[] = [];
  try {
    // better-auth exposes listUserInvitations for pending invites by email
    const api = auth.api as unknown as {
      listUserInvitations?: (opts: { headers: Headers }) => Promise<Invitation[]>;
    };
    if (api.listUserInvitations) {
      invitations = (await api.listUserInvitations({ headers: request.headers })) ?? [];
    } else {
      invitations = [];
    }
  } catch {
    invitations = [];
  }

  // filter pending only (server already does, but double-check)
  invitations = invitations.filter((inv) => inv.status === 'pending');

  return {
    organizations,
    invitations,
    user: session.user as OnboardingUser,
  };
});
