import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { useState } from 'react'
import { toast } from 'sonner'
import { Building2, Mail, Plus, Users, LogOut, Check, X, Loader2 } from 'lucide-react'

import { auth } from '#/lib/auth/server'
import { authClient } from '#/lib/auth/client'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Badge } from '#/components/ui/badge'
import { Separator } from '#/components/ui/separator'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'

type Organization = {
  id: string
  name: string
  slug: string
  createdAt: Date | string
  logo?: string | null
}

type Invitation = {
  id: string
  organizationId: string
  organizationName?: string
  email: string
  role: string
  status: string
  expiresAt: Date | string
  inviterId: string
}

const getOnboardingData = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) {
    // let beforeLoad handle redirect; return empty
    return { organizations: [] as Organization[], invitations: [] as Invitation[], user: null }
  }

  let organizations: Organization[] = []
  try {
    const orgs = await auth.api.listOrganizations({ headers: request.headers })
    organizations = (orgs as Organization[]) ?? []
  } catch {
    organizations = []
  }

  let invitations: Invitation[] = []
  try {
    // better-auth exposes listUserInvitations for pending invites by email
    const api = auth.api as unknown as {
      listUserInvitations?: (opts: { headers: Headers }) => Promise<Invitation[]>
    }
    if (api.listUserInvitations) {
      invitations = (await api.listUserInvitations({ headers: request.headers })) ?? []
    } else {
      invitations = []
    }
  } catch {
    invitations = []
  }

  // filter pending only (server already does, but double-check)
  invitations = invitations.filter((inv) => inv.status === 'pending')

  return {
    organizations,
    invitations,
    user: session.user as { id: string; name: string; email: string; image?: string | null },
  }
})

export const Route = createFileRoute('/_authenticated/onboarding')({
  loader: async () => await getOnboardingData(),
  component: OnboardingPage,
})

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function OnboardingPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const user = data.user ?? session?.user

  const organizations = data.organizations
  const invitations = data.invitations

  const [createOpen, setCreateOpen] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  const hasOrgs = organizations.length > 0
  const hasInvites = invitations.length > 0

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
      setOrgName('')
      setOrgSlug('')
      await router.invalidate()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create organization'
      // fallback to alert if sonner not configured
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
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Building2 className="size-4" />
            </div>
            ex-machina
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
              {user.name?.[0]?.toUpperCase() ?? user.email[0]?.toUpperCase()}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void authClient.signOut()}
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 md:py-12">
        {/* Intro */}
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {user.name?.split(' ')[0] ?? 'there'} 👋</h1>
          <p className="mt-2 text-muted-foreground">
            Get started by creating an organization or accepting a pending invitation.
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          {/* Left: Organizations */}
          <div className="lg:col-span-3 space-y-6">
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
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="size-4" />
                      New organization
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create organization</DialogTitle>
                      <DialogDescription>
                        Create a new organization. You will be the owner.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateOrg} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="org-name">Organization name</Label>
                        <Input
                          id="org-name"
                          placeholder="Acme Inc."
                          value={orgName}
                          onChange={(e) => {
                            setOrgName(e.target.value)
                            if (!orgSlug || orgSlug === slugify(orgName)) {
                              setOrgSlug(slugify(e.target.value))
                            }
                          }}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="org-slug">Slug</Label>
                        <Input
                          id="org-slug"
                          placeholder="acme-inc"
                          value={orgSlug}
                          onChange={(e) => setOrgSlug(slugify(e.target.value))}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Used in URLs. Lowercase, letters, numbers and hyphens only.
                        </p>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isCreating}>
                          {isCreating && <Loader2 className="size-4 animate-spin" />}
                          Create
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
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
                      <Button variant="ghost" size="sm" className="mt-2" onClick={() => setCreateOpen(true)}>
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
                      Create your first organization to start collaborating. You can also accept an invitation
                      if someone has invited you.
                    </p>

                    <form onSubmit={handleCreateOrg} className="mx-auto mt-6 max-w-sm space-y-3 text-left">
                      <div className="space-y-2">
                        <Label htmlFor="inline-name">Organization name</Label>
                        <Input
                          id="inline-name"
                          placeholder="Acme Inc."
                          value={orgName}
                          onChange={(e) => {
                            setOrgName(e.target.value)
                            if (!orgSlug || orgSlug === slugify(orgName)) {
                              setOrgSlug(slugify(e.target.value))
                            }
                          }}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inline-slug">Slug</Label>
                        <Input
                          id="inline-slug"
                          placeholder="acme-inc"
                          value={orgSlug}
                          onChange={(e) => setOrgSlug(slugify(e.target.value))}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isCreating}>
                        {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                        Create organization
                      </Button>
                    </form>
                  </div>
                )}
              </CardContent>
            </Card>

            {hasOrgs && (
              <div className="flex justify-end">
                <Button asChild>
                  <Link to="/dashboard">Continue to dashboard →</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Right: Invitations */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="size-5 text-muted-foreground" />
                  Pending invites
                  {hasInvites && (
                    <Badge variant="secondary" className="ml-2">
                      {invitations.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Invitations sent to <span className="font-medium text-foreground">{user.email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasInvites ? (
                  <div className="space-y-3">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="rounded-lg border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {inv.organizationName ?? inv.organizationId}
                            </p>
                            <p className="text-xs text-muted-foreground">Invited as {inv.role}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Expires {new Date(inv.expiresAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="shrink-0 capitalize">
                            {inv.status}
                          </Badge>
                        </div>
                        <Separator className="my-3" />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1"
                            disabled={acceptingId === inv.id || rejectingId === inv.id}
                            onClick={() => void handleAccept(inv.id)}
                          >
                            {acceptingId === inv.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Check className="size-4" />
                            )}
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            disabled={acceptingId === inv.id || rejectingId === inv.id}
                            onClick={() => void handleReject(inv.id)}
                          >
                            {rejectingId === inv.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <X className="size-4" />
                            )}
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <Mail className="mx-auto size-8 text-muted-foreground/50" />
                    <p className="mt-3 text-sm font-medium">No pending invites</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      When someone invites you to an organization, it will appear here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-sm">What happens next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Create an organization to get your own workspace.</p>
                <p>• Accept an invitation to join a teammate&apos;s organization.</p>
                <p>• Once you have an organization you can go to the dashboard.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
