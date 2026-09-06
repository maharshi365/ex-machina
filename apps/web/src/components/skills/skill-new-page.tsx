import { Link, useNavigate } from '@tanstack/react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
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
import { createSkillServerFn } from '@/lib/skills/server';
import { skillKeys } from '@/lib/skills/queries';

import { SkillContentField, SkillDescriptionField, SkillNameField } from './skill-form-fields';
import { validateSkillName } from './skill-validation';

export function SkillNewPage({ organizationId }: { organizationId: string | null }) {
  if (!organizationId) {
    return (
      <Page>
        <NoOrganizationCard />
      </Page>
    );
  }
  return <Form organizationId={organizationId} />;
}

function Form({ organizationId }: { organizationId: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [content, setContent] = React.useState('');

  const nameError = React.useMemo(() => validateSkillName(name), [name]);
  const descTooLong = desc.length > 1024;

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string; content: string }) =>
      createSkillServerFn({ data }),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: skillKeys.list(organizationId) });
      toast.success('Skill created');
      navigate({ to: '/library/skills/$skillId', params: { skillId: data._id } });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to create'),
  });

  const canSubmit = name.trim() && desc.trim() && content.trim() && !nameError && !descTooLong;

  return (
    <Page className="flex h-svh flex-col overflow-hidden">
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <Page.Header
          className="mx-0"
          actions={
            <>
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
            </>
          }
        >
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">Library</BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
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
        </Page.Header>

        <Page.Content className="overflow-auto">
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
        </Page.Content>
      </div>
    </Page>
  );
}
