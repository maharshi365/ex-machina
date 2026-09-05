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
import { getActiveOrganizationServerFn } from '#/lib/organizations/server'
import { createSkillServerFn } from '#/lib/skills/server'
import { skillKeys } from '#/lib/skills/queries'

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
      <SidebarInset className="flex h-svh flex-col overflow-hidden">
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block"><BreadcrumbLink asChild><Link to="/library/skills">Skills</Link></BreadcrumbLink></BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem><BreadcrumbPage>New</BreadcrumbPage></BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
                <Sparkles className="size-3" />
                <span className="truncate">{organizationName}</span>
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" asChild><Link to="/library/skills"><ArrowLeft className="size-4" />Back</Link></Button>
              <Button variant="outline" asChild><Link to="/library/skills">Cancel</Link></Button>
              <Button onClick={() => createMutation.mutate({ name: name.trim(), description: desc.trim(), content: content.trim() })} disabled={!canSubmit || createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Create
              </Button>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-auto p-4">
            <Card className="flex flex-1 flex-col overflow-hidden">
              <CardHeader className="shrink-0">
                <CardTitle>New skill</CardTitle>
                <CardDescription>Frontmatter name/description + body content (SKILL.md) — fits in viewport.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 min-h-0 overflow-hidden">
                <div className="space-y-2 shrink-0">
                  <Label htmlFor="new-name">Name *</Label>
                  <Input id="new-name" value={name} onChange={(e) => setName(e.target.value.toLowerCase())} placeholder="pdf-processing" maxLength={64} />
                  <p className="text-xs text-muted-foreground">1-64 a-z0-9- ; no --, no start/end -, no anthropic/claude, no &lt;&gt;</p>
                  {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                  {!nameError && name && <p className="text-xs text-emerald-600">✓ spec-compliant</p>}
                </div>
                <div className="space-y-2 shrink-0">
                  <Label htmlFor="new-desc">Description *</Label>
                  <Textarea
                    id="new-desc"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Extract text and tables from PDFs... Use when working with PDFs."
                    className="min-h-[80px]"
                    maxLength={1024}
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">What it does + when to use (primary trigger)</span>
                    <span className={descTooLong ? 'text-destructive' : 'text-muted-foreground'}>{desc.length}/1024</span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 min-h-0">
                  <Label htmlFor="new-content">Content · SKILL.md body (long)</Label>
                  <Textarea
                    id="new-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={"# PDF Processing\n\n## Instructions\n..."}
                    className="flex-1 min-h-[240px] overflow-auto font-mono text-sm leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground shrink-0">{content.length} chars · fits in screen · scroll inside textarea</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
