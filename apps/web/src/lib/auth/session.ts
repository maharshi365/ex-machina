import { getRequest } from '@tanstack/react-start/server';
import { auth } from '@/lib/auth/server';

function readActiveOrganizationId(session: unknown): string | null {
  return (
    (session as { session?: { activeOrganizationId?: string | null } })?.session
      ?.activeOrganizationId ??
    (session as { activeOrganizationId?: string | null })?.activeOrganizationId ??
    null
  );
}

/**
 * Single top-level check: ensures the session carries an active organization.
 * Called once from the `_authenticated` route's beforeLoad (and covers new
 * logins via the session-create hook in `lib/auth/server.ts`). Everything
 * downstream can treat active org as guaranteed.
 */
export async function ensureActiveOrganization(headers: Headers): Promise<string | null> {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) return null;
  const activeId = readActiveOrganizationId(session);
  if (activeId) return activeId;
  try {
    const orgs = (await auth.api.listOrganizations({ headers })) as unknown as
      | { id: string }[]
      | null;
    const fallbackId = orgs?.[0]?.id;
    if (!fallbackId) return null;
    await auth.api.setActiveOrganization({
      body: { organizationId: fallbackId },
      headers,
    });
    return fallbackId;
  } catch {
    return null;
  }
}

export async function requireSessionAndOrg() {
  const request = getRequest();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  const organizationId = readActiveOrganizationId(session);

  if (!organizationId) {
    throw new Error('No active organization');
  }

  return { session, organizationId };
}
