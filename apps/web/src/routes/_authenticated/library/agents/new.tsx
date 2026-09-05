import { createFileRoute } from '@tanstack/react-router'

import { AgentNewPage } from '@/components/agents/agent-new-page'
import { getActiveOrganizationServerFn } from '@/lib/organizations/server'

export const Route = createFileRoute('/_authenticated/library/agents/new')({
  loader: async () => {
    const activeOrg = await getActiveOrganizationServerFn()
    return { activeOrg }
  },
  component: AgentNewRoute,
})

function AgentNewRoute() {
  const { activeOrg } = Route.useLoaderData()
  return <AgentNewPage activeOrg={activeOrg} />
}
