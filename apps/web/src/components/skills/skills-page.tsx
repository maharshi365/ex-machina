import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Sparkles } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { NoOrganizationCard } from '@/components/layout/no-organization-card';
import { Page } from '@/components/layout/page';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/app-table';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { OrganizationDTO } from '@/lib/organizations/server';
import { deleteSkillMutationOptions, skillKeys, skillsQueryOptions } from '@/lib/skills/queries';

import { SkillDeleteDialog } from './skill-delete-dialog';
import { getSkillColumns } from './skills-table';

export function SkillsPage({ activeOrg }: { activeOrg: OrganizationDTO | null }) {
  if (!activeOrg) {
    return (
      <Page>
        <NoOrganizationCard description="Create or select an organization to manage skills." />
      </Page>
    );
  }

  return <SkillsManager organizationId={activeOrg.id} organizationName={activeOrg.name} />;
}

function SkillsManager({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const queryClient = useQueryClient();
  const { data: skills, isLoading, error } = useQuery(skillsQueryOptions(organizationId));

  const [deleting, setDeleting] = React.useState<{ _id: string; name: string } | null>(null);

  const deleteMutation = useMutation({
    ...deleteSkillMutationOptions(organizationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: skillKeys.list(organizationId) });
      setDeleting(null);
      toast.success('Skill deleted');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to delete skill'),
  });

  const columns = React.useMemo(() => getSkillColumns((skill) => setDeleting(skill)), []);

  return (
    <Page>
      <Page.Header
        className="static mx-0 h-16 border-0 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
        actions={
          <Button asChild>
            <Link to="/library/skills/new">
              <Plus className="size-4" />
              Create skill
            </Link>
          </Button>
        }
      >
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">Library</BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Skills</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Page.Header>
      <Page.Content>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Failed to load skills</CardTitle>
              <CardDescription>
                {error instanceof Error ? error.message : String(error)}
              </CardDescription>
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
          <TooltipProvider>
            <DataTable columns={columns} data={skills} emptyMessage="No skills found." />
          </TooltipProvider>
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
      </Page.Content>
    </Page>
  );
}
