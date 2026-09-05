import { auth } from "@/lib/auth/server";

export type IntegrationSession = {
  userId: string;
  organizationId: string;
};

function hasPrivilegedRole(role: unknown): boolean {
  const roles = Array.isArray(role) ? role : typeof role === "string" ? role.split(",") : [];
  return roles.some((value) => value.trim() === "owner" || value.trim() === "admin");
}

export async function requireIntegrationSession(
  request: Request,
  options: { requireAdmin?: boolean } = {}
): Promise<IntegrationSession> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) throw new Error("Unauthorized");

  const organizationId = (session.session as { activeOrganizationId?: string | null })
    .activeOrganizationId;
  if (!organizationId) throw new Error("No active organization");

  if (options.requireAdmin) {
    const api = auth.api as unknown as {
      getActiveMember: (input: {
        headers: Headers;
      }) => Promise<{ role?: string | string[] } | null>;
    };
    const member = await api.getActiveMember({ headers: request.headers });
    if (!hasPrivilegedRole(member?.role)) throw new Error("Organization owner or admin required");
  }

  return { userId: session.user.id, organizationId };
}
