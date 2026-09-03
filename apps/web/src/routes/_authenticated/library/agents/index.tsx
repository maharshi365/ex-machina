import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, Pencil, Plus, Trash2, Loader2, Building2, Sparkles } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { AppSidebar } from '#/components/app-sidebar'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '#/components/ui/sidebar'
import { Skeleton } from '#/components/ui/skeleton'
import { agentKeys, agentsQueryOptions, deleteAgentMutationOptions } from '#/lib/agents.queries'
import { getActiveOrganizationServerFn } from '#/lib/org-api'

export const Route = createFileRoute('/_authenticated/library/agents/')({
  loader: async ({ context }) => {
    const activeOrg = await getActiveOrganizationServerFn()
    if (activeOrg) {
      await context.queryClient.ensureQueryData(agentsQueryOptions(activeOrg.id))
    }
    return { activeOrg }
  },
  component: AgentsPage,
})

function AgentsPage() {
  const { activeOrg } = Route.useLoaderData()
  const queryClient = useQueryClient()

  if (!activeOrg) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-4 p-4">
            <Card className="border-dashed">
              <CardHeader className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full border bg-muted">
                  <Building2 className="size-6 text-muted-foreground" />
                </div>
                <CardTitle>No active organization</CardTitle>
                <CardDescription>Create or select an organization to manage agents.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button asChild>
                  <Link to="/onboarding">Go to onboarding</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return <AgentsManager organizationId={activeOrg.id} organizationName={activeOrg.name} queryClient={queryClient} />
}

function AgentsManager({
  organizationId,
  organizationName,
  queryClient,
}: {
  organizationId: string
  organizationName: string
  queryClient: ReturnType<typeof useQueryClient>
}) {
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="-ml-1" />
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
            </div>
            <Button asChild>
              <Link to="/library/agents/new">
                <Plus className="size-4" />
                Create agent
              </Link>
            </Button>
          </div>

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
                <EmptyDescription>Create your first agent to automate workflows. Agents are scoped to {organizationName}.</EmptyDescription>
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
                        <CardDescription className="truncate">{agent.description || 'No description'}</CardDescription>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        <Sparkles className="size-3" />
                        agent
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    <div className="rounded-md bg-muted p-3">
                      <p className="line-clamp-4 whitespace-pre-wrap text-sm">{agent.content || 'No content'}</p>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>ID: <span className="font-mono">{agent._id.slice(0, 8)}…</span></p>
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
                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => setDeleting(agent)}>
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Delete confirm */}
          <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
            {deleting && (
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete {deleting.name}?</DialogTitle>
                  <DialogDescription>This action cannot be undone. The agent will be removed from {organizationName}.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteMutation.isPending}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={() => deleteMutation.mutate({ id: deleting._id })} disabled={deleteMutation.isPending}>
                    {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            )}
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
