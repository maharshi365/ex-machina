import { Check, Loader2, Mail, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import type { Invitation } from './types'

export function InvitationsCard({
  invitations,
  userEmail,
  acceptingId,
  rejectingId,
  onAccept,
  onReject,
}: {
  invitations: Invitation[]
  userEmail: string
  acceptingId: string | null
  rejectingId: string | null
  onAccept: (id: string) => void
  onReject: (id: string) => void
}) {
  const hasInvites = invitations.length > 0

  return (
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
          Invitations sent to <span className="font-medium text-foreground">{userEmail}</span>
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
                    onClick={() => onAccept(inv.id)}
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
                    onClick={() => onReject(inv.id)}
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
  )
}

export function NextStepsCard() {
  return (
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
  )
}
