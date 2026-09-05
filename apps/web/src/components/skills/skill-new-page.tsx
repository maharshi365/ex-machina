import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Save, Sparkles } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { AuthenticatedShell } from '@/components/layout/authenticated-shell'
import { NoOrganizationCard } from '@/components/layout/no-organization-card'
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
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import type { OrganizationDTO } from '@/lib/organizations/server'
import { createSkillServerFn } from '@/lib/skills/server'
import { skillKeys } from '@/lib/skills/queries'

import { SkillContentField, SkillDescriptionField, SkillNameField } from './skill-form-fields'
import { validateSkillName } from './skill-validation'

export function SkillNewPage({ activeOrg }: { activeOrg: OrganizationDTO | null }) {
  if (!activeOrg) {
    return (
      <AuthenticatedShell>
        <NoOrganizationCard />
      </AuthenticatedShell>
    )
  }
  return <Form organizationId={activeOrg.id} organizationName={activeOrg.name} />
}

function Form({
  organizationId,
  organizationName,
}: {
  organizationId: string
  organizationName: string
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = React.useState('')
  const [desc, setDesc] = React.useState('')
  const [content, setContent] = React.useState('')

  const nameError = React.useMemo(() => validateSkillName(name), [name])
  const descTooLong = desc.length > 1024

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string; content: string }) =>
      createSkillServerFn({ data }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: skillKeys.list(organizationId) })
      toast.success('Skill created')
      navigate({ to: '/library/skills/$skillId', params: { skillId: data._id } })
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to create'),
  })

  const canSubmit = name.trim() && desc.trim() && content.trim() && !nameError && !descTooLong

  return (
    <AuthenticatedShell insetClassName="flex h-svh flex-col overflow-hidden">
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link to="/library/skills">Skills</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>New</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
              <Sparkles className="size-3" />
              <span className="truncate">{organizationName}</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/library/skills">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/library/skills">Cancel</Link>
            </Button>
            <Button
              onClick={() =>
                createMutation.mutate({
                  name: name.trim(),
                  description: desc.trim(),
                  content: content.trim(),
                })
              }
              disabled={!canSubmit || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Create
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-auto p-4">
          <Card className="flex flex-1 flex-col overflow-hidden">
            <CardHeader className="shrink-0">
              <CardTitle>New skill</CardTitle>
              <CardDescription>
                Frontmatter name/description + body content (SKILL.md) — fits in viewport.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 min-h-0 overflow-hidden">
              <SkillNameField value={name} onChange={setName} error={nameError} id="new-name" />
              <SkillDescriptionField value={desc} onChange={setDesc} id="new-desc" />
              <SkillContentField
                value={content}
                onChange={setContent}
                id="new-content"
                minHeightClass="min-h-[240px]"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedShell>
  )
}
