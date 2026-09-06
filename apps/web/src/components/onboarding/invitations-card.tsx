import { Check, Loader2, X } from 'lucide-react';

import { createAppColumnHelper, DataTable } from '@/components/ui/app-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { Invitation } from './types';

const columnHelper = createAppColumnHelper<Invitation>();

export function InvitationsCard({
  invitations,
  userEmail,
  acceptingId,
  rejectingId,
  onAccept,
  onReject,
}: {
  invitations: Invitation[];
  userEmail: string;
  acceptingId: string | null;
  rejectingId: string | null;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const columns = columnHelper.columns([
    columnHelper.accessor('organizationName', {
      header: 'Organization',
      cell: (ctx) => (
        <span
          className="block truncate font-medium"
          title={ctx.getValue() ?? ctx.row.original.organizationId}
        >
          {ctx.getValue() ?? ctx.row.original.organizationId}
        </span>
      ),
    }),
    columnHelper.accessor('role', {
      header: 'Role',
      meta: { headClassName: 'w-28', cellClassName: 'w-28' },
      cell: (ctx) => (
        <Badge variant="secondary" className="capitalize">
          {ctx.getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor('expiresAt', {
      header: 'Expires',
      meta: { headClassName: 'w-36', cellClassName: 'w-36' },
      cell: (ctx) => <ctx.cell.CellDateTime />,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      meta: { headClassName: 'w-44 text-right', cellClassName: 'w-44 text-right' },
      cell: (ctx) => {
        const invitation = ctx.row.original;
        const isPending = acceptingId === invitation.id || rejectingId === invitation.id;
        return (
          <div className="flex justify-end gap-2">
            <Button size="sm" disabled={isPending} onClick={() => onAccept(invitation.id)}>
              {acceptingId === invitation.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => onReject(invitation.id)}
            >
              {rejectingId === invitation.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
              Decline
            </Button>
          </div>
        );
      },
    }),
  ]);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">Pending invitations</h2>
        <p className="text-sm text-muted-foreground">Invitations sent to {userEmail}.</p>
      </div>
      <DataTable columns={columns} data={invitations} emptyMessage="No pending invitations." />
    </section>
  );
}
