import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bot, Loader2, Save } from 'lucide-react';
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
import { agentKeys } from '@/lib/agents/queries';
import { createAgentServerFn } from '@/lib/agents/server';
import type { OrganizationDTO } from '@/lib/organizations/server';

import { AgentContentField, AgentDescriptionField, AgentNameField } from './agent-form-fields';

export function AgentNewPage({ activeOrg }: { activeOrg: OrganizationDTO | null }) {
  if (!activeOrg) {
    return (
      <Page>
        <NoOrganizationCard />
      </Page>
    );
  }

  return <Form organizationId={activeOrg.id} organizationName={activeOrg.name} />;
}

function Form({
  organizationId,
  organizationName,
}: {
  organizationId: string;
  organizationName: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [content, setContent] = React.useState('');

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string; content: string }) =>
      createAgentServerFn({ data }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: agentKeys.list(organizationId) });
      toast.success('Agent created');
      navigate({ to: '/library/agents/$agentId', params: { agentId: data._id } });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to create'),
  });

  const canSubmit = name.trim() && desc.trim() && content.trim();

  return (
    <Page className="flex h-svh flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-0 min-h-0 overflow-hidden">
        <Page.Header
          className="mx-0"
          actions={
            <>
              <Button variant="ghost" asChild>
                <Link to="/library/agents">
                  <ArrowLeft className="size-4" />
                  Back
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/library/agents">Cancel</Link>
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
            </>
          }
        >
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">Library</BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link to="/library/agents">Agents</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>New</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <span className="hidden items-center gap-2 md:flex">
            <span className="text-muted-foreground">·</span>
            <Bot className="size-4 text-muted-foreground" />
            <span className="truncate text-sm font-medium">{organizationName}</span>
          </span>
        </Page.Header>

        <Page.Content className="gap-4 overflow-auto">
          <Card className="flex flex-1 flex-col overflow-hidden">
            <CardHeader className="shrink-0">
              <CardTitle>New agent</CardTitle>
              <CardDescription>
                Content fills remaining height — page fits in viewport, no extra scroll.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4 min-h-0 overflow-hidden p-4">
              <div className="grid gap-4 sm:grid-cols-2 shrink-0">
                <AgentNameField value={name} onChange={setName} id="new-name" />
                <AgentDescriptionField
                  value={desc}
                  onChange={setDesc}
                  id="new-desc"
                  placeholder="Helpful assistant for workflows"
                />
              </div>
              <AgentContentField value={content} onChange={setContent} id="new-content" />
            </CardContent>
          </Card>
        </Page.Content>
      </div>
    </Page>
  );
}
