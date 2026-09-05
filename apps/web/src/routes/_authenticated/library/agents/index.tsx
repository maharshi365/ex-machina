import { createFileRoute } from '@tanstack/react-router'

import { AgentsPage } from '#/components/agents/agents-page'
import { agentsQueryOptions } from '#/lib/agents/queries'
import { getActiveOrganizationServerFn } from '#/lib/organizations/server'

export const Route = createFileRoute('/_authenticated/library/agents/')({
  loader: async ({ context }) => {
    const activeOrg = await getActiveOrganizationServerFn()
    if (activeOrg) {
      await context.queryClient.ensureQueryData(agentsQueryOptions(activeOrg.id))
    }
    return { activeOrg }
  },
  component: AgentsRoute,
})

function AgentsRoute() {
  const { activeOrg } = Route.useLoaderData()
  return <AgentsPage activeOrg={activeOrg} />
}
