import * as React from 'react';
import { toast } from 'sonner';

import type { OrganizationDTO } from '@/lib/organizations/server';

import { ConnectedInstallations } from './connected-installations';
import { IntegrationsShell } from './integrations-shell';

export type IntegrationSearch = { github?: 'connected' | 'error'; message?: string };

export function IntegrationsPage({
  activeOrg,
  canManage,
  search,
}: {
  activeOrg: OrganizationDTO | null;
  canManage: boolean;
  search: IntegrationSearch;
}) {
  React.useEffect(() => {
    if (search.github === 'connected') toast.success('GitHub connected');
    if (search.github === 'error') toast.error(search.message ?? 'GitHub setup failed');
  }, [search.github, search.message]);

  if (!activeOrg) {
    return <IntegrationsShell noOrg />;
  }

  return <IntegrationManager organizationId={activeOrg.id} canManage={canManage} />;
}

function IntegrationManager({
  organizationId,
  canManage,
}: {
  organizationId: string;
  canManage: boolean;
}) {
  return (
    <IntegrationsShell>
      <ConnectedInstallations organizationId={organizationId} canManage={canManage} />
    </IntegrationsShell>
  );
}
