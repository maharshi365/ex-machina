import { Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

import { authClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import type { Invitation, Organization, OnboardingUser } from './types'
import { slugify } from './utils'
import { OnboardingHeader } from './onboarding-header'
import { useOrganizationForm } from './create-organization-dialog'
import { OrganizationsCard } from './organizations-card'
import { InvitationsCard, NextStepsCard } from './invitations-card'

export function OnboardingPage({
  organizations,
  invitations,
  user: initialUser,
}: {
  organizations: Organization[]
  invitations: Invitation[]
  user: OnboardingUser | null
}) {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const user = initialUser ?? session?.user

  const [createOpen, setCreateOpen] = useState(false)
  const { orgName, orgSlug, setOrgName, setOrgSlug, reset } = useOrganizationForm()
  const [isCreating, setIsCreating] = useState(false)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  const hasOrgs = organizations.length > 0

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault()
    const name = orgName.trim()
    const slug = slugify(orgSlug || orgName)
    if (!name || !slug) return
    setIsCreating(true)
    try {
      const res = await authClient.organization.create({ name, slug })
      if ((res as { error?: { message?: string } })?.error) {
        const msg = (res as { error: { message: string } }).error.message
        throw new Error(msg)
      }
      setCreateOpen(false)
      reset()
      await router.invalidate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create organization'
      try {
        toast.error(message)
      } catch {
        alert(message)
      }
    } finally {
      setIsCreating(false)
    }
  }

  async function handleAccept(invitationId: string) {
    setAcceptingId(invitationId)
    try {
      const res = await authClient.organization.acceptInvitation({ invitationId })
      if ((res as { error?: { message?: string } })?.error) {
        throw new Error((res as { error: { message: string } }).error.message)
      }
      await router.invalidate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to accept invitation'
      try {
        toast.error(message)
      } catch {
        alert(message)
      }
    } finally {
      setAcceptingId(null)
    }
  }

  async function handleReject(invitationId: string) {
    setRejectingId(invitationId)
    try {
      const res = await authClient.organization.rejectInvitation({ invitationId })
      if ((res as { error?: { message?: string } })?.error) {
        throw new Error((res as { error: { message: string } }).error.message)
      }
      await router.invalidate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject invitation'
      try {
        toast.error(message)
      } catch {
        alert(message)
      }
    } finally {
      setRejectingId(null)
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <OnboardingHeader user={user} />

      <main className="mx-auto max-w-5xl px-6 py-8 md:py-12">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {user.name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="mt-2 text-muted-foreground">
            Get started by creating an organization or accepting a pending invitation.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
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
            />

            {hasOrgs && (
              <div className="flex justify-end">
                <Button asChild>
                  <Link to="/dashboard">Continue to dashboard →</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <InvitationsCard
              invitations={invitations}
              userEmail={user.email}
              acceptingId={acceptingId}
              rejectingId={rejectingId}
              onAccept={(id) => void handleAccept(id)}
              onReject={(id) => void handleReject(id)}
            />
            <NextStepsCard />
          </div>
        </div>
      </main>
    </div>
  )
}
