import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { AuthenticatedShell } from '@/components/layout/authenticated-shell'
import { LibraryTopBar } from '@/components/layout/library-top-bar'
import { NoOrganizationCard } from '@/components/layout/no-organization-card'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import type { OrganizationDTO } from '@/lib/organizations/server'
import { deleteSkillMutationOptions, skillKeys, skillsQueryOptions } from '@/lib/skills/queries'

import { SkillDeleteDialog } from './skill-delete-dialog'

export function SkillsPage({ activeOrg }: { activeOrg: OrganizationDTO | null }) {
  if (!activeOrg) {
    return (
      <AuthenticatedShell>
        <NoOrganizationCard description="Create or select an organization to manage skills." />
      </AuthenticatedShell>
    )
  }

  return <SkillsManager organizationId={activeOrg.id} organizationName={activeOrg.name} />
}

function SkillsManager({
  organizationId,
  organizationName,
}: {
  organizationId: string
  organizationName: string
}) {
  const queryClient = useQueryClient()
  const { data: skills, isLoading, error } = useQuery(skillsQueryOptions(organizationId))

  const [deleting, setDeleting] = React.useState<{ _id: string; name: string } | null>(null)

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
    <AuthenticatedShell>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <LibraryTopBar
          breadcrumb={
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
          }
          actions={
            <Button asChild>
              <Link to="/library/skills/new">
                <Plus className="size-4" />
                Create skill
              </Link>
            </Button>
          }
        />

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
              <EmptyDescription>
                Skills extend agent capabilities per the Agent Skills spec. They are scoped to{' '}
                {organizationName}.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link to="/library/skills/new">
                  <Plus className="size-4" />
                  Create skill
                </Link>
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
                      <CardDescription className="line-clamp-2">
                        {skill.description || 'No description'}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      skill
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="rounded-md bg-muted p-3">
                    <p className="line-clamp-4 whitespace-pre-wrap text-sm">
                      {skill.content || 'No content'}
                    </p>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>
                      ID: <span className="font-mono">{skill._id.slice(0, 8)}…</span>
                    </p>
                    <p>Created {new Date(skill.createdAt).toLocaleString()}</p>
                    <p>Edited {new Date(skill.editedAt).toLocaleString()}</p>
                  </div>
                </CardContent>
                <div className="flex gap-2 p-6 pt-0">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link to="/library/skills/$skillId" params={{ skillId: skill._id }}>
                      <Pencil className="size-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    onClick={() => setDeleting(skill)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {deleting && (
          <SkillDeleteDialog
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            skillName={deleting.name}
            organizationName={organizationName}
            isPending={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate({ id: deleting._id })}
          />
        )}
      </div>
    </AuthenticatedShell>
  )
}
