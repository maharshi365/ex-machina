import { useQuery } from '@tanstack/react-query'
import { Github, Plug, Server } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { integrationsQueryOptions } from '@/lib/integrations/queries'

export function ConnectedInstallations({ organizationId }: { organizationId: string }) {
  const { data: connections, isLoading, error } = useQuery(integrationsQueryOptions(organizationId))
  const githubConnections =
    connections?.filter((connection) => connection.provider === 'github') ?? []

  return (
    <div>
      <h2 className="mb-3 text-sm font-medium">Connected installations</h2>
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Failed to load integrations</CardTitle>
            <CardDescription>{error instanceof Error ? error.message : String(error)}</CardDescription>
          </CardHeader>
        </Card>
      ) : githubConnections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
            <Plug className="size-5" />
            No GitHub installations connected yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {githubConnections.map((connection) => {
            const activeRepositories = connection.resources.filter(
              (resource) => resource.status === 'active',
            )
            return (
              <Card key={connection._id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Github className="size-5" />
                      <div>
                        <CardTitle>{connection.account.login}</CardTitle>
                        <CardDescription>{connection.account.type} installation</CardDescription>
                      </div>
                    </div>
                    <Badge variant={connection.status === 'active' ? 'default' : 'secondary'}>
                      {connection.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <Server className="size-4" />
                    {activeRepositories.length}{' '}
                    {activeRepositories.length === 1 ? 'repository' : 'repositories'}
                  </p>
                  {activeRepositories.length > 0 && (
                    <p className="line-clamp-2 font-mono text-xs">
                      {activeRepositories.map((resource) => resource.locator.fullName).join(', ')}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
