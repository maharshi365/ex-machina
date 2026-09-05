import { Link } from '@tanstack/react-router';
import { Building2, Loader2, Plus, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import type { Organization } from './types';
import { CreateOrganizationDialog, OrganizationFormFields } from './create-organization-dialog';

export function OrganizationsCard({
  organizations,
  createOpen,
  setCreateOpen,
  orgName,
  orgSlug,
  setOrgName,
  setOrgSlug,
  isCreating,
  onCreate,
}: {
  organizations: Organization[];
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  orgName: string;
  orgSlug: string;
  setOrgName: (v: string) => void;
  setOrgSlug: (v: string) => void;
  isCreating: boolean;
  onCreate: (e: React.FormEvent) => void;
}) {
  const hasOrgs = organizations.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5 text-muted-foreground" />
            Your organizations
          </CardTitle>
          <CardDescription>
            {hasOrgs
              ? `You belong to ${organizations.length} organization${organizations.length > 1 ? 's' : ''}.`
              : 'You are not a member of any organization yet.'}
          </CardDescription>
        </div>
        <CreateOrganizationDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          orgName={orgName}
          orgSlug={orgSlug}
          setOrgName={setOrgName}
          setOrgSlug={setOrgSlug}
          isCreating={isCreating}
          onSubmit={onCreate}
        />
      </CardHeader>

      <CardContent>
        {hasOrgs ? (
          <div className="grid gap-3">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">{org.name}</p>
                    <p className="text-xs text-muted-foreground">/{org.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    owner
                  </Badge>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/dashboard">Open</Link>
                  </Button>
                </div>
              </div>
            ))}

            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground">Need another workspace?</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="size-4" />
                Create organization
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-background border">
              <Building2 className="size-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">No organizations yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first organization to start collaborating. You can also accept an
              invitation if someone has invited you.
            </p>

            <form onSubmit={onCreate} className="mx-auto mt-6 max-w-sm space-y-3 text-left">
              <OrganizationFormFields
                orgName={orgName}
                orgSlug={orgSlug}
                setOrgName={setOrgName}
                setOrgSlug={setOrgSlug}
                idPrefix="inline"
              />
              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Create organization
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
