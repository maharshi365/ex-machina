import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Bot, Loader2, Save, Trash2 } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { AppSidebar } from '#/components/app-sidebar'
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
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '#/components/ui/sidebar'
import { Skeleton } from '#/components/ui/skeleton'
import { Textarea } from '#/components/ui/textarea'
import { agentKeys, agentQueryOptions } from '#/lib/agents.queries'
import { deleteAgentServerFn, getAgentServerFn, updateAgentServerFn } from '#/lib/agents-api'
import { getActiveOrganizationServerFn } from '#/lib/org-api'

export const Route = createFileRoute('/_authenticated/library/agents/$agentId')({
  loader: async ({ context, params }) => {
    const activeOrg = await getActiveOrganizationServerFn()
    if (activeOrg) {
      // prefetch agent — server derives org from session, but key still needs orgId for cache
      await context.queryClient.ensureQueryData(agentQueryOptions(activeOrg.id, params.agentId)).catch(() => {})
    }
    // also ensure server can fetch for SSR; fallback check via direct call for 404 handling
    let serverAgent: Awaited<ReturnType<typeof getAgentServerFn>> | null = null
    if (activeOrg) {
      try {
        serverAgent = await getAgentServerFn({ data: { id: params.agentId } })
      } catch {
        serverAgent = null
      }
    }
    return { activeOrg, serverAgent }
  },
  component: AgentEditPage,
})

function AgentEditPage() {
  const { agentId } = Route.useParams()
  const loaderData = Route.useLoaderData() as { activeOrg: { id: string; name: string } | null; serverAgent: unknown }
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const activeOrg = loaderData.activeOrg

  if (!activeOrg) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <EditHeader agentId={agentId} />
          <div className="p-4">
            <Card className="border-dashed">
              <CardHeader className="text-center">
                <CardTitle>No active organization</CardTitle>
                <CardDescription>Create an organization first.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Button asChild><Link to="/onboarding">Go to onboarding</Link></Button>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return <AgentEditManager organizationId={activeOrg.id} organizationName={activeOrg.name} agentId={agentId} queryClient={queryClient} navigate={navigate} />
}

function EditHeader({ agentId }: { agentId: string }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink asChild><Link to="/library/agents">Library</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink asChild><Link to="/library/agents">Agents</Link></BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-mono text-xs">{agentId.slice(0, 8)}…</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}

function AgentEditManager({
  organizationId,
  organizationName,
  agentId,
  queryClient,
  navigate,
}: {
  organizationId: string
  organizationName: string
  agentId: string
  queryClient: ReturnType<typeof useQueryClient>
  navigate: ReturnType<typeof useNavigate>
}) {
  const { data: agent, isLoading, error } = useQuery(agentQueryOptions(organizationId, agentId))
  const [name, setName] = React.useState('')
  const [desc, setDesc] = React.useState('')
  const [content, setContent] = React.useState('')
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  // hydrate from query
  React.useEffect(() => {
    if (agent) {
      setName(agent.name)
      setDesc(agent.description)
      setContent(agent.content)
    }
  }, [agent])

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; description: string; content: string }) =>
      updateAgentServerFn({ data: { id: agentId, ...data } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: agentKeys.list(organizationId) })
      await queryClient.invalidateQueries({ queryKey: agentKeys.detail(organizationId, agentId) })
      toast.success('Agent saved')
      void navigate({ to: '/library/agents' })
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to save'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteAgentServerFn({ data: { id: agentId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: agentKeys.list(organizationId) })
      toast.success('Agent deleted')
      void navigate({ to: '/library/agents' })
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to delete'),
  })

  if (isLoading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <EditHeader agentId={agentId} />
          <div className="p-4 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-[60vh] w-full" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (error || !agent) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <EditHeader agentId={agentId} />
          <div className="p-4">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Agent not found</CardTitle>
                <CardDescription>{error instanceof Error ? error.message : 'This agent does not exist or you do not have access.'}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline"><Link to="/library/agents"><ArrowLeft className="size-4" /> Back to agents</Link></Button>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  const canSave = name.trim() && desc.trim() && content.trim() && !updateMutation.isPending

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <EditHeader agentId={agentId} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/library/agents"><ArrowLeft className="size-4" /></Link>
              </Button>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Bot className="size-5" />{agent.name}</h1>
                <p className="text-sm text-muted-foreground">{organizationName} · {agent._id}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="size-4" />Delete</Button>
              <Button onClick={() => updateMutation.mutate({ name: name.trim(), description: desc.trim(), content: content.trim() })} disabled={!canSave}>
                {updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Edit agent</CardTitle>
                <CardDescription>Long content is fully visible here — scroll and edit with full height.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jarvis" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-desc">Description</Label>
                  <Input id="edit-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Helpful assistant..." />
                </div>
                <div className="space-y-2 flex-1 flex flex-col">
                  <Label htmlFor="edit-content">Content · long prompt / instructions</Label>
                  <Textarea
                    id="edit-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="You are a helpful agent..."
                    className="min-h-[55vh] flex-1 font-mono text-sm leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground">{content.length} chars · scrollable, full-page editor</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Organization</span><span className="font-medium">{organizationName}</span></div>
                  <Separator />
                  <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{new Date(agent.createdAt).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Edited</span><span>{new Date(agent.editedAt).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Created by</span><span className="font-mono text-xs">{agent.createdBy.slice(0, 8)}…</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Edited by</span><span className="font-mono text-xs">{agent.editedBy.slice(0, 8)}…</span></div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-sm">Tips</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                  <p>• Content is the system prompt / instructions.</p>
                  <p>• Keep description concise — it helps routing.</p>
                  <p>• Changes are org-scoped and audited via editedBy/editedAt.</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete {agent.name}?</DialogTitle>
                <DialogDescription>This cannot be undone. It will be removed from {organizationName}.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
