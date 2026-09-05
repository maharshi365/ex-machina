import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save, Sparkles, Trash2 } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { AuthenticatedShell } from '@/components/layout/authenticated-shell';
import { NoOrganizationCard } from '@/components/layout/no-organization-card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import type { OrganizationDTO } from '@/lib/organizations/server';
import { deleteSkillServerFn, updateSkillServerFn } from '@/lib/skills/server';
import { skillKeys, skillQueryOptions } from '@/lib/skills/queries';

import { SkillContentField, SkillDescriptionField, SkillNameField } from './skill-form-fields';
import { validateSkillName } from './skill-validation';

export function SkillEditPage({
  activeOrg,
  skillId,
}: {
  activeOrg: OrganizationDTO | null;
  skillId: string;
}) {
  if (!activeOrg) {
    return (
      <AuthenticatedShell>
        <NoOrganizationCard />
      </AuthenticatedShell>
    );
  }

  return (
    <SkillEditManager
      organizationId={activeOrg.id}
      organizationName={activeOrg.name}
      skillId={skillId}
    />
  );
}

function SkillEditManager({
  organizationId,
  organizationName,
  skillId,
}: {
  organizationId: string;
  organizationName: string;
  skillId: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: skill, isLoading, error } = useQuery(skillQueryOptions(organizationId, skillId));
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [content, setContent] = React.useState('');
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  React.useEffect(() => {
    if (skill) {
      setName(skill.name);
      setDesc(skill.description);
      setContent(skill.content);
    }
  }, [skill]);

  const nameError = React.useMemo(() => validateSkillName(name), [name]);
  const descTooLong = desc.length > 1024;
  const canSave = name.trim() && desc.trim() && content.trim() && !nameError && !descTooLong;

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; description: string; content: string }) =>
      updateSkillServerFn({ data: { id: skillId, ...data } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: skillKeys.list(organizationId) });
      await queryClient.invalidateQueries({ queryKey: skillKeys.detail(organizationId, skillId) });
      toast.success('Skill saved');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSkillServerFn({ data: { id: skillId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: skillKeys.list(organizationId) });
      toast.success('Skill deleted');
      void navigate({ to: '/library/skills' });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to delete'),
  });

  if (isLoading) {
    return (
      <AuthenticatedShell insetClassName="flex h-svh flex-col overflow-hidden">
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[60vh] w-full" />
        </div>
      </AuthenticatedShell>
    );
  }

  if (error || !skill) {
    return (
      <AuthenticatedShell>
        <div className="p-4">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Skill not found</CardTitle>
              <CardDescription>
                {error instanceof Error
                  ? error.message
                  : 'This skill does not exist or you do not have access.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link to="/library/skills">
                  <ArrowLeft className="size-4" /> Back to skills
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedShell>
    );
  }

  return (
    <AuthenticatedShell insetClassName="flex h-svh flex-col overflow-hidden">
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/library/skills">Skills</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-mono text-xs truncate max-w-40">
                    {skill.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
              <span>·</span>
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
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Delete
            </Button>
            <Button
              onClick={() =>
                updateMutation.mutate({
                  name: name.trim(),
                  description: desc.trim(),
                  content: content.trim(),
                })
              }
              disabled={!canSave || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Save
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-auto p-4">
          <Card className="flex flex-1 flex-col overflow-hidden">
            <CardHeader className="shrink-0">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-5" />
                {skill.name}
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                {skill._id} · edited {new Date(skill.editedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 min-h-0 overflow-hidden">
              <SkillNameField value={name} onChange={setName} error={nameError} id="edit-name" />
              <SkillDescriptionField value={desc} onChange={setDesc} id="edit-desc" />
              <SkillContentField value={content} onChange={setContent} id="edit-content" />
            </CardContent>
          </Card>
        </div>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {skill.name}?</DialogTitle>
              <DialogDescription>
                This will remove the SKILL.md from {organizationName}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedShell>
  );
}
