import { createFileRoute } from '@tanstack/react-router'

import { SkillNewPage } from '@/components/skills/skill-new-page'
import { getActiveOrganizationServerFn } from '@/lib/organizations/server'

export const Route = createFileRoute('/_authenticated/library/skills/new')({
  loader: async () => {
    const activeOrg = await getActiveOrganizationServerFn()
    return { activeOrg }
  },
  component: SkillNewRoute,
})

function SkillNewRoute() {
  const { activeOrg } = Route.useLoaderData()
  return <SkillNewPage activeOrg={activeOrg} />
}
