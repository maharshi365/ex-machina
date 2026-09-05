import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth/server'

export type OrganizationDTO = {
  id: string
  name: string
  slug: string
  createdAt: string
  logo?: string | null
}

export const getActiveOrganizationServerFn = createServerFn({ method: 'GET' }).handler(async (): Promise<OrganizationDTO | null> => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return null

  // try getFullOrganization (uses activeOrganizationId from session)
  try {
    const api = auth.api as unknown as {
      getFullOrganization?: (opts: { headers: Headers }) => Promise<OrganizationDTO | null>
    }
    if (api.getFullOrganization) {
      const org = await api.getFullOrganization({ headers: request.headers })
      if (org?.id) return org
    }
  } catch {
    // fall through
  }

  try {
    const orgs = (await auth.api.listOrganizations({ headers: request.headers })) as unknown as OrganizationDTO[] | null
    if (!orgs || orgs.length === 0) return null
    const activeId = (session.session as { activeOrganizationId?: string | null })?.activeOrganizationId
    if (activeId) {
      const found = orgs.find((o) => o.id === activeId)
      if (found) return found
    }
    return orgs[0] ?? null
  } catch {
    return null
  }
})

export const listOrganizationsServerFn = createServerFn({ method: 'GET' }).handler(async (): Promise<OrganizationDTO[]> => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return []
  try {
    const orgs = (await auth.api.listOrganizations({ headers: request.headers })) as unknown as OrganizationDTO[] | null
    return orgs ?? []
  } catch {
    return []
  }
})
