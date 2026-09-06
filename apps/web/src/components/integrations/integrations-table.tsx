import { Copy, ExternalLink, Eye, Github } from 'lucide-react';
import { toast } from 'sonner';
import type { ExternalConnectionDTO, ExternalResourceDTO } from '@ex-machina/db';

import { createAppColumnHelper } from '@/components/ui/app-table';
import { Badge } from '@/components/ui/badge';
import { RowActions } from '@/components/ui/row-actions';

export type IntegrationRow = ExternalConnectionDTO & {
  resources: ExternalResourceDTO[];
};

const columnHelper = createAppColumnHelper<IntegrationRow>();

type ConnectionStatus = ExternalConnectionDTO['status'];

function statusBadgeClassName(status: ConnectionStatus): string | undefined {
  switch (status) {
    case 'active':
      return 'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
    case 'pending':
      return 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300';
    case 'error':
      return undefined; // destructive variant below
    case 'suspended':
    case 'revoked':
      return undefined; // secondary variant below
  }
}

export function IntegrationStatusBadge({ status }: { status: ConnectionStatus }) {
  if (status === 'error')
    return (
      <Badge variant="destructive" className="capitalize">
        {status}
      </Badge>
    );
  if (status === 'suspended' || status === 'revoked')
    return (
      <Badge variant="secondary" className="capitalize">
        {status}
      </Badge>
    );
  return <Badge className={`capitalize ${statusBadgeClassName(status) ?? ''}`}>{status}</Badge>;
}

export function getIntegrationColumns(onView: (connection: IntegrationRow) => void) {
  return columnHelper.columns([
    columnHelper.accessor('account', {
      header: 'Installation',
      meta: { headClassName: 'w-56', cellClassName: 'w-56' },
      cell: (ctx) => {
        const account = ctx.getValue();
        return (
          <span className="flex items-center gap-2 font-medium">
            <Github className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate" title={account.login}>
              {account.login}
            </span>
            <span className="shrink-0 text-xs font-normal text-muted-foreground">
              {account.type}
            </span>
          </span>
        );
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      meta: { headClassName: 'w-28', cellClassName: 'w-28' },
      cell: (ctx) => <IntegrationStatusBadge status={ctx.getValue()} />,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      meta: { headClassName: 'w-36', cellClassName: 'w-36' },
      cell: (ctx) => <ctx.cell.CellDateTime />,
    }),
    columnHelper.accessor('editedAt', {
      header: 'Updated',
      meta: { headClassName: 'w-36', cellClassName: 'w-36' },
      cell: (ctx) => <ctx.cell.CellDateTime />,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      meta: { headClassName: 'w-32 text-right', cellClassName: 'w-32' },
      cell: (ctx) => {
        const connection = ctx.row.original;
        return (
          <RowActions
            actions={[
              {
                label: 'View installation details',
                icon: Eye,
                onClick: () => onView(connection),
              },
              {
                label: 'Open installation settings on GitHub',
                icon: ExternalLink,
                href: `https://github.com/settings/installations/${connection.auth.installationId}`,
              },
              {
                label: 'Copy installation ID',
                icon: Copy,
                onClick: () => {
                  void navigator.clipboard
                    ?.writeText(connection.auth.installationId)
                    .then(() => toast.success('Installation ID copied'))
                    .catch(() => toast.error('Failed to copy installation ID'));
                },
              },
            ]}
          />
        );
      },
    }),
  ]);
}
