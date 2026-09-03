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
          <Header />
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

function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block"><BreadcrumbLink asChild><Link to="/library/agents">Library</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="hidden md:block"><BreadcrumbLink asChild><Link to="/library/agents">Agents</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem><BreadcrumbPage>New</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
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
      <SidebarInset>
        <Header />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/library/agents"><ArrowLeft className="size-4" /></Link></Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Bot className="size-5" />New agent</h1>
              <p className="text-sm text-muted-foreground">{organizationName} · full-page editor for long content</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Create agent</CardTitle>
                <CardDescription>All fields required. Content is the system prompt — use full height for long instructions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <div className="space-y-2">
                  <Label htmlFor="new-name">Name</Label>
                  <Input id="new-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jarvis" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-desc">Description</Label>
                  <Input id="new-desc" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Helpful assistant for workflows" />
                </div>
                <div className="space-y-2 flex-1 flex flex-col">
                  <Label htmlFor="new-content">Content · long prompt</Label>
                  <Textarea
                    id="new-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="You are a helpful agent... (paste long instructions, markdown, examples)"
                    className="min-h-[60vh] flex-1 font-mono text-sm leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground">{content.length} chars · scrollable · ideal for long content</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" asChild><Link to="/library/agents">Cancel</Link></Button>
                  <Button onClick={() => createMutation.mutate({ name: name.trim(), description: desc.trim(), content: content.trim() })} disabled={!canSubmit || createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Create & edit
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardHeader><CardTitle className="text-sm">Tips</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <p>• You’re creating in <b>{organizationName}</b> (org derived server-side).</p>
                <p>• Content is fully visible here — no dialog clipping.</p>
                <p>• After create you’ll be taken to the edit page where you can continue refining.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
