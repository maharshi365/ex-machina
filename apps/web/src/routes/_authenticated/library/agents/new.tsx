import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Bot, Loader2, Save } from 'lucide-react'
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
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '#/components/ui/sidebar'
import { Textarea } from '#/components/ui/textarea'
import { agentKeys } from '#/lib/agents.queries'
import { createAgentServerFn } from '#/lib/agents-api'
import { getActiveOrganizationServerFn } from '#/lib/org-api'

export const Route = createFileRoute('/_authenticated/library/agents/new')({
  loader: async () => {
    const activeOrg = await getActiveOrganizationServerFn()
    return { activeOrg }
  },
  component: AgentCreatePage,
})

function AgentCreatePage() {
  const { activeOrg } = Route.useLoaderData()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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

  return <Form organizationId={activeOrg.id} organizationName={activeOrg.name} queryClient={queryClient} navigate={navigate} />
}

function Form({
  organizationId,
  organizationName,
  queryClient,
  navigate,
}: {
  organizationId: string
  organizationName: string
  queryClient: ReturnType<typeof useQueryClient>
  navigate: ReturnType<typeof useNavigate>
}) {
  const [name, setName] = React.useState('')
  const [desc, setDesc] = React.useState('')
  const [content, setContent] = React.useState('')

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string; content: string }) => createAgentServerFn({ data }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: agentKeys.list(organizationId) })
      toast.success('Agent created')
      navigate({ to: '/library/agents/$agentId', params: { agentId: data._id } })
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to create'),
  })

  const canSubmit = name.trim() && desc.trim() && content.trim()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex h-svh flex-col overflow-hidden">
        <div className="flex flex-1 flex-col gap-0 min-h-0 overflow-hidden">
          <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block"><BreadcrumbLink asChild><Link to="/library/agents">Agents</Link></BreadcrumbLink></BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem><BreadcrumbPage>New</BreadcrumbPage></BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <span className="hidden items-center gap-2 md:flex">
                <span className="text-muted-foreground">·</span>
                <Bot className="size-4 text-muted-foreground" />
                <span className="truncate text-sm font-medium">{organizationName}</span>
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" asChild><Link to="/library/agents"><ArrowLeft className="size-4" />Back</Link></Button>
              <Button variant="outline" asChild><Link to="/library/agents">Cancel</Link></Button>
              <Button onClick={() => createMutation.mutate({ name: name.trim(), description: desc.trim(), content: content.trim() })} disabled={!canSubmit || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Create
              </Button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
            <Card className="flex flex-1 flex-col overflow-hidden">
              <CardHeader className="shrink-0">
                <CardTitle>New agent</CardTitle>
                <CardDescription>Content fills remaining height — page fits in viewport, no extra scroll.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 min-h-0 overflow-hidden p-4">
                <div className="grid gap-4 sm:grid-cols-2 shrink-0">
                  <div className="space-y-2">
                    <Label htmlFor="new-name">Name</Label>
                    <Input id="new-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jarvis" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-desc">Description</Label>
                    <Input id="new-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Helpful assistant for workflows" />
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 min-h-0">
                  <Label htmlFor="new-content">Content · long prompt</Label>
                  <Textarea
                    id="new-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="You are a helpful agent... (paste long instructions, markdown, examples)"
                    className="flex-1 min-h-[280px] overflow-auto font-mono text-sm leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground shrink-0">{content.length} chars · scroll inside textarea · controls stay at top</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
