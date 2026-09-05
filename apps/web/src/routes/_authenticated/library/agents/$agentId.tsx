import { createFileRoute } from '@tanstack/react-router';

import { AgentEditPage } from '@/components/agents/agent-edit-page';
import { agentQueryOptions } from '@/lib/agents/queries';
import { getAgentServerFn } from '@/lib/agents/server';
import { getActiveOrganizationServerFn } from '@/lib/organizations/server';

export const Route = createFileRoute('/_authenticated/library/agents/$agentId')({
  loader: async ({ context, params }) => {
    const activeOrg = await getActiveOrganizationServerFn();
    if (activeOrg) {
      await context.queryClient
        .ensureQueryData(agentQueryOptions(activeOrg.id, params.agentId))
        .catch(() => {});
    }
    let serverAgent: Awaited<ReturnType<typeof getAgentServerFn>> | null = null;
    if (activeOrg) {
      try {
        serverAgent = await getAgentServerFn({ data: { id: params.agentId } });
      } catch {
        serverAgent = null;
      }
    }
    return { activeOrg, serverAgent };
  },
  component: AgentEditRoute,
});

function AgentEditRoute() {
  const { agentId } = Route.useParams();
  const { activeOrg } = Route.useLoaderData();
  return <AgentEditPage activeOrg={activeOrg} agentId={agentId} />;
}
