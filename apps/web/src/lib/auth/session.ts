import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth/server'

export async function requireSessionAndOrg() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  const organizationId =
    (session.session as { activeOrganizationId?: string | null })?.activeOrganizationId ??
    (session as unknown as { activeOrganizationId?: string | null })?.activeOrganizationId ??
    null

  if (!organizationId) {
    throw new Error('No active organization')
  }

  return { session, organizationId }
}
