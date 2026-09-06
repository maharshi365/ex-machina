import { Pencil, Trash2 } from 'lucide-react';
import type { SkillDTO } from '@ex-machina/db';

import { createAppColumnHelper } from '@/components/ui/app-table';
import { RowActions } from '@/components/ui/row-actions';

const columnHelper = createAppColumnHelper<SkillDTO>();

export function getSkillColumns(onDelete: (skill: SkillDTO) => void) {
  return columnHelper.columns([
    columnHelper.accessor('name', {
      header: 'Name',
      meta: { headClassName: 'w-48', cellClassName: 'w-48' },
      cell: (ctx) => (
        <span className="block truncate font-mono text-[13px] font-medium" title={ctx.getValue()}>
          {ctx.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      cell: (ctx) => (
        <ctx.cell.CellText
          fallback="No description"
          className="max-w-none whitespace-normal line-clamp-2"
        />
      ),
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
      meta: { headClassName: 'w-24 text-right', cellClassName: 'w-24' },
      cell: (ctx) => {
        const skill = ctx.row.original;
        return (
          <RowActions
            actions={[
              {
                label: 'Edit skill',
                icon: Pencil,
                to: '/library/skills/$skillId',
                params: { skillId: skill._id },
              },
              {
                label: 'Delete skill',
                icon: Trash2,
                variant: 'destructive',
                onClick: () => onDelete(skill),
              },
            ]}
          />
        );
      },
    }),
  ]);
}
