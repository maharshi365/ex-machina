import { ArrowRight, Building2, Loader2 } from 'lucide-react';

import { createAppColumnHelper, DataTable } from '@/components/ui/app-table';
import { Button } from '@/components/ui/button';

import type { Organization } from './types';
import { CreateOrganizationDialog } from './create-organization-dialog';

const columnHelper = createAppColumnHelper<Organization>();

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
  onSelect,
  selectingId,
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
  onSelect: (id: string) => void;
  selectingId: string | null;
}) {
  const columns = columnHelper.columns([
    columnHelper.accessor('name', {
      header: 'Organization',
      cell: (ctx) => {
        const organization = ctx.row.original;
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <Building2 className="size-4 text-muted-foreground" />
            </div>
            <span className="truncate font-medium" title={organization.name}>
              {organization.name}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor('slug', {
      header: 'Slug',
      meta: { headClassName: 'w-48', cellClassName: 'w-48' },
      cell: (ctx) => <span className="text-muted-foreground">/{ctx.getValue()}</span>,
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      meta: { headClassName: 'w-36', cellClassName: 'w-36' },
      cell: (ctx) => <ctx.cell.CellDateTime />,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      meta: { headClassName: 'w-28 text-right', cellClassName: 'w-28 text-right' },
      cell: (ctx) => {
        const organization = ctx.row.original;
        const isSelecting = selectingId === organization.id;
        return (
          <Button
            size="sm"
            variant="outline"
            disabled={selectingId !== null}
            onClick={() => onSelect(organization.id)}
          >
            {isSelecting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            Select
          </Button>
        );
      },
    }),
  ]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Organizations</h2>
          <p className="text-sm text-muted-foreground">Select a workspace to continue.</p>
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
      </div>
      <DataTable columns={columns} data={organizations} emptyMessage="No organizations yet." />
    </section>
  );
}
