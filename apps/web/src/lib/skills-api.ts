import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from '#/lib/auth'
import { getDb } from '#/lib/db'
import {
  createSkill as dbCreateSkill,
  deleteSkill as dbDeleteSkill,
  getSkillById as dbGetSkillById,
  getSkills as dbGetSkills,
  updateSkill as dbUpdateSkill,
} from '@ex-machina/db'

async function requireSessionAndOrg() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) throw new Error('Unauthorized')
  const organizationId =
    (session.session as { activeOrganizationId?: string | null })?.activeOrganizationId ??
    (session as unknown as { activeOrganizationId?: string | null })?.activeOrganizationId ??
    null
  if (!organizationId) throw new Error('No active organization')
  return { session, organizationId }
}

// Org is derived server-side — FE does not send it
export const listSkillsServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { organizationId } = await requireSessionAndOrg()
  const db = getDb()
  return dbGetSkills(db, organizationId)
})

export const getSkillServerFn = createServerFn({ method: 'GET' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { organizationId } = await requireSessionAndOrg()
    const db = getDb()
    const skill = await dbGetSkillById(db, data.id, organizationId)
    if (!skill) throw new Error('Skill not found')
    return skill
  })

export const createSkillServerFn = createServerFn({ method: 'POST' })
  .validator((data: { name: string; description: string; content: string }) => data)
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireSessionAndOrg()
    const db = getDb()
    return dbCreateSkill(db, data, { userId: session.user.id, organizationId })
  })

export const updateSkillServerFn = createServerFn({ method: 'POST' })
  .validator((data: { id: string; name?: string; description?: string; content?: string }) => data)
  .handler(async ({ data }) => {
    const { session, organizationId } = await requireSessionAndOrg()
    const { id, ...input } = data
    const db = getDb()
    const updated = await dbUpdateSkill(db, id, input, { userId: session.user.id, organizationId })
    if (!updated) throw new Error('Skill not found')
    return updated
  })

export const deleteSkillServerFn = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { organizationId } = await requireSessionAndOrg()
    const db = getDb()
    const ok = await dbDeleteSkill(db, data.id, organizationId)
    if (!ok) throw new Error('Skill not found')
    return { success: true as const }
  })
