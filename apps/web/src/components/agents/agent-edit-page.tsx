import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bot, Loader2, Save, Trash2 } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { NoOrganizationCard } from '@/components/layout/no-organization-card';
import { Page } from '@/components/layout/page';
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
import { agentKeys, agentQueryOptions } from '@/lib/agents/queries';
import { deleteAgentServerFn, updateAgentServerFn } from '@/lib/agents/server';
import type { OrganizationDTO } from '@/lib/organizations/server';

import { AgentContentField, AgentDescriptionField, AgentNameField } from './agent-form-fields';

export function AgentEditPage({
  activeOrg,
  agentId,
}: {
  activeOrg: OrganizationDTO | null;
  agentId: string;
}) {
  if (!activeOrg) {
    return (
      <Page>
        <NoOrganizationCard />
      </Page>
    );
  }

  return (
    <AgentEditManager
      organizationId={activeOrg.id}
      organizationName={activeOrg.name}
      agentId={agentId}
    />
  );
}

function AgentEditManager({
  organizationId,
  organizationName,
  agentId,
}: {
  organizationId: string;
  organizationName: string;
  agentId: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: agent, isLoading, error } = useQuery(agentQueryOptions(organizationId, agentId));
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [content, setContent] = React.useState('');
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  React.useEffect(() => {
    if (agent) {
      setName(agent.name);
      setDesc(agent.description);
      setContent(agent.content);
    }
  }, [agent]);

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; description: string; content: string }) =>
      updateAgentServerFn({ data: { id: agentId, ...data } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: agentKeys.list(organizationId) });
      await queryClient.invalidateQueries({ queryKey: agentKeys.detail(organizationId, agentId) });
      toast.success('Agent saved');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to save'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAgentServerFn({ data: { id: agentId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: agentKeys.list(organizationId) });
      toast.success('Agent deleted');
      void navigate({ to: '/library/agents' });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to delete'),
  });

  if (isLoading) {
    return (
      <Page className="flex h-svh flex-col overflow-hidden">
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[60vh] w-full" />
        </div>
      </Page>
    );
  }

  if (error || !agent) {
    return (
      <Page>
        <div className="p-4">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Agent not found</CardTitle>
              <CardDescription>
                {error instanceof Error
                  ? error.message
                  : 'This agent does not exist or you do not have access.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link to="/library/agents">
                  <ArrowLeft className="size-4" /> Back to agents
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </Page>
    );
  }

  const canSave = name.trim() && desc.trim() && content.trim() && !updateMutation.isPending;

  return (
    <Page className="flex h-svh flex-col overflow-hidden">
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-background px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/library/agents">Agents</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-mono text-xs truncate max-w-45">
                    {agent.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <span className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
              <span>·</span>
              <span className="truncate">{organizationName}</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/library/agents">
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
              disabled={!canSave}
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
                <Bot className="size-5" />
                Edit agent
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                {agent._id} · edited {new Date(agent.editedAt).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 min-h-0 overflow-hidden">
              <div className="grid gap-4 sm:grid-cols-2 shrink-0">
                <AgentNameField value={name} onChange={setName} id="edit-name" />
                <AgentDescriptionField value={desc} onChange={setDesc} id="edit-desc" />
              </div>
              <AgentContentField value={content} onChange={setContent} id="edit-content" />
            </CardContent>
          </Card>
        </div>

        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {agent.name}?</DialogTitle>
              <DialogDescription>
                This cannot be undone. It will be removed from {organizationName}.
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
    </Page>
  );
}
