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
      await context.queryClient.ensureQueryData(agentQueryOptions(activeOrg.id, params.agentId)).catch(() => {})
    }
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
        <SidebarInset className="flex h-svh flex-col overflow-hidden">
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
      <SidebarInset className="flex h-svh flex-col overflow-hidden">
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-background px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem><BreadcrumbLink asChild><Link to="/library/agents">Agents</Link></BreadcrumbLink></BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbPage className="font-mono text-xs truncate max-w-[180px]">{agent.name}</BreadcrumbPage></BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
                <span>·</span><span className="truncate">{organizationName}</span>
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" asChild><Link to="/library/agents"><ArrowLeft className="size-4" />Back</Link></Button>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="size-4" />Delete</Button>
              <Button onClick={() => updateMutation.mutate({ name: name.trim(), description: desc.trim(), content: content.trim() })} disabled={!canSave}>
                {updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save
              </Button>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-auto p-4">
            <Card className="flex flex-1 flex-col overflow-hidden">
              <CardHeader className="shrink-0">
                <CardTitle className="flex items-center gap-2"><Bot className="size-5" />Edit agent</CardTitle>
                <CardDescription className="font-mono text-xs">{agent._id} · edited {new Date(agent.editedAt).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 min-h-0 overflow-hidden">
                <div className="grid gap-4 sm:grid-cols-2 shrink-0">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jarvis" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-desc">Description</Label>
                    <Input id="edit-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Helpful assistant..." />
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 min-h-0">
                  <Label htmlFor="edit-content">Content · long prompt</Label>
                  <Textarea
                    id="edit-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="You are a helpful agent..."
                    className="flex-1 min-h-[280px] overflow-auto font-mono text-sm leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground shrink-0">{content.length} chars · fits in viewport · scroll inside textarea</p>
                </div>
              </CardContent>
            </Card>
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
