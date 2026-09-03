import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import { getDb } from '#/lib/db'
import {
  createAgent as dbCreateAgent,
  deleteAgent as dbDeleteAgent,
  getAgentById as dbGetAgentById,
  getAgents as dbGetAgents,
  updateAgent as dbUpdateAgent,
} from '@ex-machina/db'

// ---------------------------------------------------------------------------
// Helpers — session + active organization (auth middleware)
// ---------------------------------------------------------------------------

async function requireSessionAndOrg() {
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

// ---------------------------------------------------------------------------
// Server FNs — org-scoped CRUD
// Organization is derived server-side from session (activeOrganizationId).
// FE does NOT send organizationId — prevents cross-org spoofing.
// ---------------------------------------------------------------------------

export const listAgentsServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { organizationId } = await requireSessionAndOrg()
  const db = getDb()
  return dbGetAgents(db, organizationId)
})

export const getAgentServerFn = createServerFn({ method: 'GET' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { organizationId } = await requireSessionAndOrg()
    const db = getDb()
    const agent = await dbGetAgentById(db, data.id, organizationId)
    if (!agent) throw new Error('Agent not found')
    return agent
  })

export const createAgentServerFn = createServerFn({ method: 'POST' })
  .validator((data: { name: string; description: string; content: string }) => data)
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireSessionAndOrg()
    const db = getDb()
    return dbCreateAgent(db, { name: data.name, description: data.description, content: data.content }, { userId: session.user.id, organizationId })
  })

export const updateAgentServerFn = createServerFn({ method: 'POST' })
  .validator((data: { id: string; name?: string; description?: string; content?: string }) => data)
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireSessionAndOrg()
    const { id, ...input } = data
    const db = getDb()
    const updated = await dbUpdateAgent(db, id, input, { userId: session.user.id, organizationId })
    if (!updated) throw new Error('Agent not found')
    return updated
  })

export const deleteAgentServerFn = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { organizationId } = await requireSessionAndOrg()
    const db = getDb()
    const ok = await dbDeleteAgent(db, data.id, organizationId)
    if (!ok) throw new Error('Agent not found')
    return { success: true as const }
  })
