import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

import { authClient } from '@/lib/auth/client';
import { Page } from '@/components/layout/page';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Skeleton } from '@/components/ui/skeleton';

import type { Invitation, Organization, OnboardingUser } from './types';
import { slugify } from './utils';
import { useOrganizationForm } from './create-organization-dialog';
import { OrganizationsCard } from './organizations-card';
import { InvitationsCard } from './invitations-card';

export function OnboardingPage({
  organizations,
  invitations,
  user: initialUser,
}: {
  organizations: Organization[];
  invitations: Invitation[];
  user: OnboardingUser | null;
}) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = initialUser ?? session?.user;

  const [createOpen, setCreateOpen] = useState(false);
  const { orgName, orgSlug, setOrgName, setOrgSlug, reset } = useOrganizationForm();
  const [isCreating, setIsCreating] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    const name = orgName.trim();
    const slug = slugify(orgSlug || orgName);
    if (!name || !slug) return;
    setIsCreating(true);
    try {
      const res = await authClient.organization.create({ name, slug });
      if ((res as { error?: { message?: string } })?.error) {
        const msg = (res as { error: { message: string } }).error.message;
        throw new Error(msg);
      }
      setCreateOpen(false);
      reset();
      await router.navigate({ to: '/dashboard' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create organization';
      try {
        toast.error(message);
      } catch {
        alert(message);
      }
    } finally {
      setIsCreating(false);
    }
  }

  async function handleAccept(invitationId: string) {
    setAcceptingId(invitationId);
    try {
      const res = await authClient.organization.acceptInvitation({ invitationId });
      if ((res as { error?: { message?: string } })?.error) {
        throw new Error((res as { error: { message: string } }).error.message);
      }
      const invitation = invitations.find((item) => item.id === invitationId);
      if (invitation) {
        const activeOrganization = await authClient.organization.setActive({
          organizationId: invitation.organizationId,
        });
        if ((activeOrganization as { error?: { message?: string } })?.error) {
          throw new Error((activeOrganization as { error: { message: string } }).error.message);
        }
      }
      await router.navigate({ to: '/dashboard' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept invitation';
      try {
        toast.error(message);
      } catch {
        alert(message);
      }
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleReject(invitationId: string) {
    setRejectingId(invitationId);
    try {
      const res = await authClient.organization.rejectInvitation({ invitationId });
      if ((res as { error?: { message?: string } })?.error) {
        throw new Error((res as { error: { message: string } }).error.message);
      }
      await router.invalidate();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject invitation';
      try {
        toast.error(message);
      } catch {
        alert(message);
      }
    } finally {
      setRejectingId(null);
    }
  }

  async function handleSelectOrg(organizationId: string) {
    setSelectingId(organizationId);
    try {
      const res = await authClient.organization.setActive({ organizationId });
      if ((res as { error?: { message?: string } })?.error) {
        throw new Error((res as { error: { message: string } }).error.message);
      }
      await router.navigate({ to: '/dashboard' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to select organization';
      try {
        toast.error(message);
      } catch {
        alert(message);
      }
    } finally {
      setSelectingId(null);
    }
  }

  if (!user) {
    return (
      <div className="p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    );
  }

  return (
    <Page>
      <Page.Content>
        <Page.Header>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Onboarding</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </Page.Header>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Set up your workspace</h1>
          <p className="text-muted-foreground">
            Create an organization or accept an invitation to get started.
          </p>
        </div>

        <OrganizationsCard
          organizations={organizations}
          createOpen={createOpen}
          setCreateOpen={setCreateOpen}
          orgName={orgName}
          orgSlug={orgSlug}
          setOrgName={setOrgName}
          setOrgSlug={setOrgSlug}
          isCreating={isCreating}
          onCreate={handleCreateOrg}
          onSelect={(id) => void handleSelectOrg(id)}
          selectingId={selectingId}
        />

        <InvitationsCard
          invitations={invitations}
          userEmail={user.email}
          acceptingId={acceptingId}
          rejectingId={rejectingId}
          onAccept={(id) => void handleAccept(id)}
          onReject={(id) => void handleReject(id)}
        />
      </Page.Content>
    </Page>
  );
}
