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
  DialogTrigger,
} from '#/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '#/components/ui/empty'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '#/components/ui/sidebar'
import { Skeleton } from '#/components/ui/skeleton'
import { Textarea } from '#/components/ui/textarea'
import { agentKeys, agentsQueryOptions, createAgentMutationOptions, deleteAgentMutationOptions } from '#/lib/agents.queries'
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
          <AgentsHeader />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
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

function AgentsHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
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
    </header>
  )
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

  const [createOpen, setCreateOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState<{ _id: string; name: string } | null>(null)

  const createMutation = useMutation({
    ...createAgentMutationOptions(organizationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: agentKeys.list(organizationId) })
      setCreateOpen(false)
      toast.success('Agent created')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to create agent'),
  })

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
        <AgentsHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
              <p className="text-sm text-muted-foreground">
                {organizationName} · {agents?.length ?? 0} agents
              </p>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  Create agent
                </Button>
              </DialogTrigger>
              <AgentFormDialog
                title="Create agent"
                description="Create a new agent for this organization."
                submitLabel="Create"
                isPending={createMutation.isPending}
                onSubmit={(values) => createMutation.mutate(values)}
                onClose={() => setCreateOpen(false)}
              />
            </Dialog>
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
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  Create agent
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

function AgentFormDialog({
  title,
  description,
  submitLabel,
  initialValues,
  isPending,
  onSubmit,
  onClose,
}: {
  title: string
  description: string
  submitLabel: string
  initialValues?: { name: string; description: string; content: string }
  isPending: boolean
  onSubmit: (values: { name: string; description: string; content: string }) => void
  onClose: () => void
}) {
  const [name, setName] = React.useState(initialValues?.name ?? '')
  const [desc, setDesc] = React.useState(initialValues?.description ?? '')
  const [content, setContent] = React.useState(initialValues?.content ?? '')

  React.useEffect(() => {
    setName(initialValues?.name ?? '')
    setDesc(initialValues?.description ?? '')
    setContent(initialValues?.content ?? '')
  }, [initialValues])

  const canSubmit = name.trim() && desc.trim() && content.trim()

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({ name: name.trim(), description: desc.trim(), content: content.trim() })
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="agent-name">Name</Label>
          <Input id="agent-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jarvis" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent-desc">Description</Label>
          <Input id="agent-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Helpful assistant for workflows" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent-content">Content</Label>
          <Textarea
            id="agent-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="You are a helpful agent..."
            className="min-h-[140px]"
            required
          />
          <p className="text-xs text-muted-foreground">System prompt / instructions for the agent.</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit || isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
