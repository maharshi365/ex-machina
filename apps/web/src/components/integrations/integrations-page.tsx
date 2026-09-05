import { useQuery } from '@tanstack/react-query'
import * as React from 'react'
import { toast } from 'sonner'

import type { OrganizationDTO } from '@/lib/organizations/server'
import { integrationsQueryOptions } from '@/lib/integrations/queries'

import { GitHubConnectCard, InstallationSecurityCard } from './github-cards'
import { ConnectedInstallations } from './connected-installations'
import { IntegrationsShell } from './integrations-shell'

export type IntegrationSearch = { github?: 'connected' | 'error'; message?: string }

export function IntegrationsPage({
  activeOrg,
  canManage,
  search,
}: {
  activeOrg: OrganizationDTO | null
  canManage: boolean
  search: IntegrationSearch
}) {
  React.useEffect(() => {
    if (search.github === 'connected') toast.success('GitHub connected')
    if (search.github === 'error') toast.error(search.message ?? 'GitHub setup failed')
  }, [search.github, search.message])

  if (!activeOrg) {
    return <IntegrationsShell noOrg />
  }

  return <IntegrationManager organizationId={activeOrg.id} canManage={canManage} />
}

function IntegrationManager({
  organizationId,
  canManage,
}: {
  organizationId: string
  canManage: boolean
}) {
  const { data: connections } = useQuery(integrationsQueryOptions(organizationId))
  const githubConnections =
    connections?.filter((connection) => connection.provider === 'github') ?? []

  return (
    <IntegrationsShell>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <GitHubConnectCard canManage={canManage} hasConnections={githubConnections.length > 0} />
        <InstallationSecurityCard />
      </div>

      <ConnectedInstallations organizationId={organizationId} />
    </IntegrationsShell>
  )
}
