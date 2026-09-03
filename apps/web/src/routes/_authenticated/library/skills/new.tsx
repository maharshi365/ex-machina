import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save, Sparkles } from 'lucide-react'
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
import { getActiveOrganizationServerFn } from '#/lib/org-api'
import { createSkillServerFn } from '#/lib/skills-api'
import { skillKeys } from '#/lib/skills.queries'

export const Route = createFileRoute('/_authenticated/library/skills/new')({
  loader: async () => {
    const activeOrg = await getActiveOrganizationServerFn()
    return { activeOrg }
  },
  component: SkillCreatePage,
})

function SkillCreatePage() {
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
            <BreadcrumbItem className="hidden md:block"><BreadcrumbLink asChild><Link to="/library/skills">Library</Link></BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="hidden md:block"><BreadcrumbLink asChild><Link to="/library/skills">Skills</Link></BreadcrumbLink></BreadcrumbItem>
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

  const nameError = React.useMemo(() => {
    if (!name) return null
    if (name.length > 64) return 'Max 64'
    if (!/^[a-z0-9-]+$/.test(name)) return 'Only a-z0-9-'
    if (name.startsWith('-') || name.endsWith('-')) return 'No start/end -'
    if (name.includes('--')) return 'No --'
    if (name.includes('<') || name.includes('>')) return 'No XML'
    const lower = name.toLowerCase()
    if (lower.includes('anthropic') || lower.includes('claude')) return 'No reserved words'
    return null
  }, [name])

  const descTooLong = desc.length > 1024

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string; content: string }) => createSkillServerFn({ data }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: skillKeys.list(organizationId) })
      toast.success('Skill created')
      navigate({ to: '/library/skills/$skillId', params: { skillId: data._id } })
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to create'),
  })

  const canSubmit = name.trim() && desc.trim() && content.trim() && !nameError && !descTooLong

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/library/skills"><ArrowLeft className="size-4" /></Link></Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Sparkles className="size-5" />New skill</h1>
              <p className="text-sm text-muted-foreground">{organizationName} · SKILL.md spec · full-page editor</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Create skill</CardTitle>
                <CardDescription>Frontmatter `name`/`description` + body `content` (SKILL.md). Long content fully visible.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <div className="space-y-2">
                  <Label htmlFor="new-name">Name *</Label>
                  <Input id="new-name" value={name} onChange={(e) => setName(e.target.value.toLowerCase())} placeholder="pdf-processing" maxLength={64} />
                  <p className="text-xs text-muted-foreground">1-64 a-z0-9- ; no --, no start/end -, no anthropic/claude, no &lt;&gt;</p>
                  {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                  {!nameError && name && <p className="text-xs text-emerald-600">✓ spec-compliant</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-desc">Description *</Label>
                  <Textarea
                    id="new-desc"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Extract text and tables from PDFs... Use when working with PDFs."
                    className="min-h-[90px]"
                    maxLength={1024}
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">What it does + when to use (primary trigger)</span>
                    <span className={descTooLong ? 'text-destructive' : 'text-muted-foreground'}>{desc.length}/1024</span>
                  </div>
                </div>
                <div className="space-y-2 flex-1 flex flex-col">
                  <Label htmlFor="new-content">Content · SKILL.md body (long)</Label>
                  <Textarea
                    id="new-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={"# PDF Processing\n\n## Instructions\n..."}
                    className="min-h-[60vh] flex-1 font-mono text-sm leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground">{content.length} chars · full-page editor · &lt;500 lines ideal</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" asChild><Link to="/library/skills">Cancel</Link></Button>
                  <Button onClick={() => createMutation.mutate({ name: name.trim(), description: desc.trim(), content: content.trim() })} disabled={!canSubmit || createMutation.isPending}>
                    {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Create & edit
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardHeader><CardTitle className="text-sm">Spec</CardTitle></CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>• Level 1: name/desc always in context (~100 tokens)</p>
                <p>• Level 2: body when triggered</p>
                <p>• Full height here for long SKILL.md.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
