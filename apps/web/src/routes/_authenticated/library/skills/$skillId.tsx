import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save, Sparkles, Trash2 } from 'lucide-react'
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
import { getActiveOrganizationServerFn } from '#/lib/org-api'
import { deleteSkillServerFn, getSkillServerFn, updateSkillServerFn } from '#/lib/skills-api'
import { skillKeys, skillQueryOptions } from '#/lib/skills.queries'

export const Route = createFileRoute('/_authenticated/library/skills/$skillId')({
  loader: async ({ context, params }) => {
    const activeOrg = await getActiveOrganizationServerFn()
    if (activeOrg) {
      await context.queryClient.ensureQueryData(skillQueryOptions(activeOrg.id, params.skillId)).catch(() => {})
    }
    let serverSkill: Awaited<ReturnType<typeof getSkillServerFn>> | null = null
    if (activeOrg) {
      try {
        serverSkill = await getSkillServerFn({ data: { id: params.skillId } })
      } catch {
        serverSkill = null
      }
    }
    return { activeOrg, serverSkill }
  },
  component: SkillEditPage,
})

function SkillEditPage() {
  const { skillId } = Route.useParams()
  const loaderData = Route.useLoaderData() as { activeOrg: { id: string; name: string } | null }
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

  return <SkillEditManager organizationId={activeOrg.id} organizationName={activeOrg.name} skillId={skillId} queryClient={queryClient} navigate={navigate} />
}

function SkillEditManager({
  organizationId,
  organizationName,
  skillId,
  queryClient,
  navigate,
}: {
  organizationId: string
  organizationName: string
  skillId: string
  queryClient: ReturnType<typeof useQueryClient>
  navigate: ReturnType<typeof useNavigate>
}) {
  const { data: skill, isLoading, error } = useQuery(skillQueryOptions(organizationId, skillId))
  const [name, setName] = React.useState('')
  const [desc, setDesc] = React.useState('')
  const [content, setContent] = React.useState('')
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  React.useEffect(() => {
    if (skill) {
      setName(skill.name)
      setDesc(skill.description)
      setContent(skill.content)
    }
  }, [skill])

  const nameError = React.useMemo(() => {
    if (!name) return null
    if (name.length > 64) return 'Max 64 characters'
    if (!/^[a-z0-9-]+$/.test(name)) return 'Only lowercase a-z, 0-9, hyphens'
    if (name.startsWith('-') || name.endsWith('-')) return 'Must not start/end with hyphen'
    if (name.includes('--')) return 'No consecutive hyphens'
    if (name.includes('<') || name.includes('>')) return 'No XML tags'
    const lower = name.toLowerCase()
    if (lower.includes('anthropic') || lower.includes('claude')) return 'No reserved words (anthropic/claude)'
    return null
  }, [name])

  const descTooLong = desc.length > 1024
  const canSave = name.trim() && desc.trim() && content.trim() && !nameError && !descTooLong

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; description: string; content: string }) =>
      updateSkillServerFn({ data: { id: skillId, ...data } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: skillKeys.list(organizationId) })
      await queryClient.invalidateQueries({ queryKey: skillKeys.detail(organizationId, skillId) })
      toast.success('Skill saved')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to save'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteSkillServerFn({ data: { id: skillId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: skillKeys.list(organizationId) })
      toast.success('Skill deleted')
      void navigate({ to: '/library/skills' })
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

  if (error || !skill) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="p-4">
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Skill not found</CardTitle>
                <CardDescription>{error instanceof Error ? error.message : 'This skill does not exist or you do not have access.'}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline"><Link to="/library/skills"><ArrowLeft className="size-4" /> Back to skills</Link></Button>
              </CardContent>
            </Card>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

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
                  <BreadcrumbItem><BreadcrumbLink asChild><Link to="/library/skills">Skills</Link></BreadcrumbLink></BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbPage className="font-mono text-xs truncate max-w-[160px]">{skill.name}</BreadcrumbPage></BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
                <span>·</span><Sparkles className="size-3" /><span className="truncate">{organizationName}</span>
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="ghost" asChild><Link to="/library/skills"><ArrowLeft className="size-4" />Back</Link></Button>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="size-4" />Delete</Button>
              <Button
                onClick={() => updateMutation.mutate({ name: name.trim(), description: desc.trim(), content: content.trim() })}
                disabled={!canSave || updateMutation.isPending}
              >
                {updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save
              </Button>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-auto p-4">
            <Card className="flex flex-1 flex-col overflow-hidden">
              <CardHeader className="shrink-0">
                <CardTitle className="flex items-center gap-2"><Sparkles className="size-5" />{skill.name}</CardTitle>
                <CardDescription className="font-mono text-xs">{skill._id} · edited {new Date(skill.editedAt).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 min-h-0 overflow-hidden">
                <div className="space-y-2 shrink-0">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase())}
                    placeholder="pdf-processing"
                    maxLength={64}
                  />
                  <p className="text-xs text-muted-foreground">1-64 a-z0-9- ; no --, no start/end -, no anthropic/claude, no &lt;&gt;</p>
                  {nameError && <p className="text-xs text-destructive">{nameError}</p>}
                  {!nameError && name && <p className="text-xs text-emerald-600">✓ spec-compliant</p>}
                </div>
                <div className="space-y-2 shrink-0">
                  <Label htmlFor="edit-desc">Description *</Label>
                  <Textarea
                    id="edit-desc"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Extract text and tables from PDFs... Use when working with PDFs."
                    className="min-h-[80px]"
                    maxLength={1024}
                  />
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">What it does + when to use (primary trigger).</span>
                    <span className={descTooLong ? 'text-destructive' : 'text-muted-foreground'}>{desc.length}/1024</span>
                  </div>
                  {(desc.includes('<') || desc.includes('>')) && <p className="text-xs text-destructive">No XML tags</p>}
                </div>
                <div className="flex flex-1 flex-col gap-2 min-h-0">
                  <Label htmlFor="edit-content">Content · SKILL.md body (long)</Label>
                  <Textarea
                    id="edit-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={"# PDF Processing\n\n## Instructions\n..."}
                    className="flex-1 min-h-[260px] overflow-auto font-mono text-sm leading-relaxed"
                  />
                  <p className="text-xs text-muted-foreground shrink-0">{content.length} chars · fits in screen · scroll inside textarea</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete {skill.name}?</DialogTitle>
                <DialogDescription>This will remove the SKILL.md from {organizationName}.</DialogDescription>
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
