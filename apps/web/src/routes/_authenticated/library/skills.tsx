import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Loader2, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
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
import { getActiveOrganizationServerFn } from '#/lib/org-api'
import { createSkillMutationOptions, deleteSkillMutationOptions, skillKeys, skillsQueryOptions, updateSkillMutationOptions } from '#/lib/skills.queries'
import type { SkillDTO } from '@ex-machina/db'

export const Route = createFileRoute('/_authenticated/library/skills')({
  loader: async ({ context }) => {
    const activeOrg = await getActiveOrganizationServerFn()
    if (activeOrg) {
      await context.queryClient.ensureQueryData(skillsQueryOptions(activeOrg.id))
    }
    return { activeOrg }
  },
  component: SkillsPage,
})

function SkillsPage() {
  const { activeOrg } = Route.useLoaderData()
  const queryClient = useQueryClient()

  if (!activeOrg) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SkillsHeader />
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <Card className="border-dashed">
              <CardHeader className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-full border bg-muted">
                  <Building2 className="size-6 text-muted-foreground" />
                </div>
                <CardTitle>No active organization</CardTitle>
                <CardDescription>Create or select an organization to manage skills.</CardDescription>
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

  return <SkillsManager organizationId={activeOrg.id} organizationName={activeOrg.name} queryClient={queryClient} />
}

function SkillsHeader() {
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
              <BreadcrumbPage>Skills</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}

function SkillsManager({
  organizationId,
  organizationName,
  queryClient,
}: {
  organizationId: string
  organizationName: string
  queryClient: ReturnType<typeof useQueryClient>
}) {
  const { data: skills, isLoading, error } = useQuery(skillsQueryOptions(organizationId))

  const [createOpen, setCreateOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SkillDTO | null>(null)
  const [deleting, setDeleting] = React.useState<SkillDTO | null>(null)

  const createMutation = useMutation({
    ...createSkillMutationOptions(organizationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: skillKeys.list(organizationId) })
      setCreateOpen(false)
      toast.success('Skill created')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to create skill'),
  })

  const updateMutation = useMutation({
    ...updateSkillMutationOptions(organizationId),
    onSuccess: async (_data, vars) => {
      await queryClient.invalidateQueries({ queryKey: skillKeys.list(organizationId) })
      await queryClient.invalidateQueries({ queryKey: skillKeys.detail(organizationId, vars.id) })
      setEditing(null)
      toast.success('Skill updated')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to update skill'),
  })

  const deleteMutation = useMutation({
    ...deleteSkillMutationOptions(organizationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: skillKeys.list(organizationId) })
      setDeleting(null)
      toast.success('Skill deleted')
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to delete skill'),
  })

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SkillsHeader />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
              <p className="text-sm text-muted-foreground">
                {organizationName} · {skills?.length ?? 0} skills · SKILL.md spec
              </p>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  Create skill
                </Button>
              </DialogTrigger>
              <SkillFormDialog
                title="Create skill"
                description="SKILL.md frontmatter requires spec-compliant name + description. Body is loaded progressively."
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
                <CardTitle className="text-destructive">Failed to load skills</CardTitle>
                <CardDescription>{error instanceof Error ? error.message : String(error)}</CardDescription>
              </CardHeader>
            </Card>
          ) : !skills || skills.length === 0 ? (
            <Empty className="border bg-card">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Sparkles />
                </EmptyMedia>
                <EmptyTitle>No skills yet</EmptyTitle>
                <EmptyDescription>Skills extend agent capabilities per the Agent Skills spec. They are scoped to {organizationName}.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  Create skill
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/dashboard">Go to dashboard</Link>
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {skills.map((skill) => (
                <Card key={skill._id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="truncate flex items-center gap-2">
                          <Sparkles className="size-4 text-muted-foreground shrink-0" />
                          {skill.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">{skill.description || 'No description'}</CardDescription>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        skill
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    <div className="rounded-md bg-muted p-3">
                      <p className="line-clamp-4 whitespace-pre-wrap text-sm">{skill.content || 'No content'}</p>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>ID: <span className="font-mono">{skill._id.slice(0, 8)}…</span></p>
                      <p>Created {new Date(skill.createdAt).toLocaleString()}</p>
                      <p>Edited {new Date(skill.editedAt).toLocaleString()}</p>
                    </div>
                  </CardContent>
                  <div className="flex gap-2 p-6 pt-0">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(skill)}>
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => setDeleting(skill)}>
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
            {editing && (
              <SkillFormDialog
                title="Edit skill"
                description={`Editing ${editing.name} — name must stay spec-compliant`}
                submitLabel="Save"
                isPending={updateMutation.isPending}
                initialValues={{ name: editing.name, description: editing.description, content: editing.content }}
                onSubmit={(values) => updateMutation.mutate({ id: editing._id, ...values })}
                onClose={() => setEditing(null)}
              />
            )}
          </Dialog>

          <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
            {deleting && (
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete {deleting.name}?</DialogTitle>
                  <DialogDescription>This will remove the SKILL.md and its bundled resources from {organizationName}.</DialogDescription>
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

function SkillFormDialog({
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
  const canSubmit = name.trim() && desc.trim() && content.trim() && !nameError && !descTooLong

  return (
    <DialogContent className="sm:max-w-xl">
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
          <Label htmlFor="skill-name">Name *</Label>
          <Input
            id="skill-name"
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            placeholder="pdf-processing"
            required
            maxLength={64}
          />
          <p className="text-xs text-muted-foreground">1-64 chars, lowercase a-z, 0-9, hyphens only; no --, no start/end -, no anthropic/claude, no &lt;&gt;.</p>
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          {name && !nameError && <p className="text-xs text-emerald-600">✓ spec-compliant</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="skill-desc">Description *</Label>
          <Textarea
            id="skill-desc"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Extract text and tables from PDFs, fill forms... Use when working with PDF files or when the user mentions PDFs."
            className="min-h-[90px]"
            required
            maxLength={1024}
          />
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">What it does + when to use it. Primary trigger for agents.</span>
            <span className={descTooLong ? 'text-destructive' : 'text-muted-foreground'}>{desc.length}/1024</span>
          </div>
          {(desc.includes('<') || desc.includes('>')) && <p className="text-xs text-destructive">Must not contain XML tags (&lt; &gt;)</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="skill-content">Content (SKILL.md body) *</Label>
          <Textarea
            id="skill-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"# PDF Processing\n\n## Instructions\nStep-by-step guidance for Claude...\n\n## Examples\n..."}
            className="min-h-[160px] font-mono text-sm"
            required
          />
          <p className="text-xs text-muted-foreground">Markdown instructions loaded when skill triggers (&lt;500 lines ideal). Loaded progressively — see spec levels 2/3.</p>
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
