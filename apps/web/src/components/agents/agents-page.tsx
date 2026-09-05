import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { AuthenticatedShell } from '#/components/layout/authenticated-shell'
import { LibraryTopBar } from '#/components/layout/library-top-bar'
import { NoOrganizationCard } from '#/components/layout/no-organization-card'
import { Badge } from '#/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '#/components/ui/breadcrumb'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { Skeleton } from '#/components/ui/skeleton'
import { agentKeys, agentsQueryOptions, deleteAgentMutationOptions } from '#/lib/agents/queries'
import type { OrganizationDTO } from '#/lib/organizations/server'

import { AgentDeleteDialog } from './agent-delete-dialog'

export function AgentsPage({ activeOrg }: { activeOrg: OrganizationDTO | null }) {
  if (!activeOrg) {
    return (
      <AuthenticatedShell>
        <NoOrganizationCard description="Create or select an organization to manage agents." />
      </AuthenticatedShell>
    )
  }

  return <AgentsManager organizationId={activeOrg.id} organizationName={activeOrg.name} />
}

function AgentsManager({
  organizationId,
  organizationName,
}: {
  organizationId: string
  organizationName: string
}) {
  const queryClient = useQueryClient()
  const { data: agents, isLoading, error } = useQuery(agentsQueryOptions(organizationId))

  const [deleting, setDeleting] = React.useState<{ _id: string; name: string } | null>(null)

  const deleteMutation = useMutation({
    ...deleteAgentMutationOptions(organizationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: agentKeys.list(organizationId) })
      setDeleting(null)
      toast.success('Agent deleted')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to delete agent'),
  })

  return (
    <AuthenticatedShell>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <LibraryTopBar
          breadcrumb={
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Library</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Agents</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          }
          actions={
            <Button asChild>
              <Link to="/library/agents/new">
                <Plus className="size-4" />
                Create agent
              </Link>
            </Button>
          }
        />

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Failed to load agents</CardTitle>
              <CardDescription>{error instanceof Error ? error.message : String(error)}</CardDescription>
            </CardHeader>
          </Card>
        ) : !agents || agents.length === 0 ? (
          <Empty className="border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bot />
              </EmptyMedia>
              <EmptyTitle>No agents yet</EmptyTitle>
              <EmptyDescription>
                Create your first agent to automate workflows. Agents are scoped to {organizationName}.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link to="/library/agents/new">
                  <Plus className="size-4" />
                  Create agent
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card key={agent._id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate flex items-center gap-2">
                        <Bot className="size-4 text-muted-foreground shrink-0" />
                        {agent.name}
                      </CardTitle>
                      <CardDescription className="truncate">
                        {agent.description || 'No description'}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      <Sparkles className="size-3" />
                      agent
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="rounded-md bg-muted p-3">
                    <p className="line-clamp-4 whitespace-pre-wrap text-sm">
                      {agent.content || 'No content'}
                    </p>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      ID: <span className="font-mono">{agent._id.slice(0, 8)}…</span>
                    </p>
                    <p>Created {new Date(agent.createdAt).toLocaleString()}</p>
                    <p>Edited {new Date(agent.editedAt).toLocaleString()}</p>
                  </div>
                </CardContent>
                <div className="flex gap-2 p-6 pt-0">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to="/library/agents/$agentId" params={{ agentId: agent._id }}>
                      <Pencil className="size-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => setDeleting(agent)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {deleting && (
          <AgentDeleteDialog
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            agentName={deleting.name}
            organizationName={organizationName}
            isPending={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate({ id: deleting._id })}
          />
        )}
      </div>
    </AuthenticatedShell>
  )
}
