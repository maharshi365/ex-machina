import { Link } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Plus } from 'lucide-react';
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
import { agentKeys, agentsQueryOptions, deleteAgentMutationOptions } from '@/lib/agents/queries';
import type { OrganizationDTO } from '@/lib/organizations/server';

import { AgentDeleteDialog } from './agent-delete-dialog';
import { getAgentColumns } from './agents-table';

export function AgentsPage({ activeOrg }: { activeOrg: OrganizationDTO | null }) {
  if (!activeOrg) {
    return (
      <Page>
        <NoOrganizationCard description="Create or select an organization to manage agents." />
      </Page>
    );
  }

  return <AgentsManager organizationId={activeOrg.id} organizationName={activeOrg.name} />;
}

function AgentsManager({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const queryClient = useQueryClient();
  const { data: agents, isLoading, error } = useQuery(agentsQueryOptions(organizationId));

  const [deleting, setDeleting] = React.useState<{ _id: string; name: string } | null>(null);

  const deleteMutation = useMutation({
    ...deleteAgentMutationOptions(organizationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: agentKeys.list(organizationId) });
      setDeleting(null);
      toast.success('Agent deleted');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to delete agent'),
  });

  const columns = React.useMemo(() => getAgentColumns((agent) => setDeleting(agent)), []);

  return (
    <Page>
      <Page.Content>
        <Page.Header
          actions={
            <Button asChild>
              <Link to="/library/agents/new">
                <Plus className="size-4" />
                Create agent
              </Link>
            </Button>
          }
        >
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">Library</BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Agents</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Page.Header>

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
              <CardTitle className="text-destructive">Failed to load agents</CardTitle>
              <CardDescription>
                {error instanceof Error ? error.message : String(error)}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : !agents || agents.length === 0 ? (
          <Empty className="border bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bot />
              </EmptyMedia>
              <EmptyTitle>No agents yet</EmptyTitle>
              <EmptyDescription>
                Create your first agent to automate workflows. Agents are scoped to{' '}
                {organizationName}.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link to="/library/agents/new">
                  <Plus className="size-4" />
                  Create agent
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <TooltipProvider>
            <DataTable columns={columns} data={agents} emptyMessage="No agents found." />
          </TooltipProvider>
        )}

        {deleting && (
          <AgentDeleteDialog
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            agentName={deleting.name}
            organizationName={organizationName}
            isPending={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate({ id: deleting._id })}
          />
        )}
      </Page.Content>
    </Page>
  );
}
