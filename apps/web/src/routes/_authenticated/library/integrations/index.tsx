import { createFileRoute } from '@tanstack/react-router';

import { IntegrationsPage } from '@/components/integrations/integrations-page';
import { integrationsQueryOptions } from '@/lib/integrations/queries';
import { canManageIntegrationsServerFn } from '@/lib/integrations/server';
import { getActiveOrganizationServerFn } from '@/lib/organizations/server';

type IntegrationSearch = { github?: 'connected' | 'error'; message?: string };

export const Route = createFileRoute('/_authenticated/library/integrations/')({
  validateSearch: (search: Record<string, unknown>): IntegrationSearch => ({
    github: search.github === 'connected' || search.github === 'error' ? search.github : undefined,
    message: typeof search.message === 'string' ? search.message : undefined,
  }),
  loader: async ({ context }) => {
    const [activeOrg, canManage] = await Promise.all([
      getActiveOrganizationServerFn(),
      canManageIntegrationsServerFn(),
    ]);
    if (activeOrg) {
      await context.queryClient.ensureQueryData(integrationsQueryOptions(activeOrg.id));
    }
    return { activeOrg, canManage };
  },
  component: IntegrationsRoute,
});

function IntegrationsRoute() {
  const { activeOrg, canManage } = Route.useLoaderData();
  const search = Route.useSearch();
  return <IntegrationsPage activeOrg={activeOrg} canManage={canManage} search={search} />;
}
