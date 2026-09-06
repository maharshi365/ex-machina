import {
  createPaginatedRowModel,
  createTableHook,
  rowPaginationFeature,
  tableFeatures,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils.ts';
import type { ColumnDef, RowData } from '@tanstack/react-table';

// ---------------------------------------------------------------------------
// Shared TanStack Table v9 setup.
// `createTableHook` is the v9 API for registering reusable cell / table
// components once and reusing them across all library tables.
// ---------------------------------------------------------------------------

const appFeatures = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

// Optional per-column presentation hints, passed via column `meta`.
// Fixed-width columns keep tables aligned while one flexible column
// (e.g. description) takes the remaining space.
export type ColumnLayoutMeta = {
  headClassName?: string;
  cellClassName?: string;
};

function getLayoutMeta(meta: unknown): ColumnLayoutMeta {
  if (typeof meta !== 'object' || meta === null) return {};
  const { headClassName, cellClassName } = meta as Partial<ColumnLayoutMeta>;
  return {
    ...(typeof headClassName === 'string' ? { headClassName } : {}),
    ...(typeof cellClassName === 'string' ? { cellClassName } : {}),
  };
}

function CellText({ fallback = '—', className }: { fallback?: string; className?: string }) {
  const cell = useCellContext<string | null | undefined>();
  const value = cell.getValue();
  return (
    <span className={cn('block max-w-64 truncate', className)} title={value ?? undefined}>
      {value || fallback}
    </span>
  );
}

function CellDateTime() {
  const cell = useCellContext<string | null | undefined>();
  const value = cell.getValue();
  if (!value) return <span className="text-muted-foreground">—</span>;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className="whitespace-nowrap text-muted-foreground tabular-nums"
      title={date.toLocaleString()}
    >
      {date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}
    </span>
  );
}

function TablePagination() {
  const table = useTableContext();
  const { pageIndex } = table.state.pagination;
  const pageCount = table.getPageCount();
  const total = table.getCoreRowModel().rows.length;

  if (pageCount <= 1 && total <= 10) {
    return (
      <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground">
        <p>
          {total} {total === 1 ? 'row' : 'rows'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {total} {total === 1 ? 'row' : 'rows'} · Page {pageIndex + 1} of {Math.max(pageCount, 1)}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          aria-label="Go to first page"
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-20 text-center text-sm tabular-nums">
          {pageIndex + 1} / {Math.max(pageCount, 1)}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label="Go to next page"
        >
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
          aria-label="Go to last page"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export const { createAppColumnHelper, useAppTable, useCellContext, useTableContext } =
  createTableHook({
    features: appFeatures,
    cellComponents: { CellText, CellDateTime },
    tableComponents: { TablePagination },
  });

export type { AppCellContext } from '@tanstack/react-table';

// ---------------------------------------------------------------------------
// Generic paginated DataTable built on shadcn Table + the shared v9 hook.
// ---------------------------------------------------------------------------

const EMPTY_DATA: RowData[] = [];

export function DataTable<TData extends RowData>({
  columns,
  data,
  emptyMessage = 'No results.',
  pageSize = 10,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: Array<ColumnDef<typeof appFeatures, TData, any>>;
  data: TData[] | undefined;
  emptyMessage?: string;
  pageSize?: number;
}) {
  const table = useAppTable({
    columns,
    data: (data ?? EMPTY_DATA) as TData[],
    initialState: {
      pagination: { pageIndex: 0, pageSize },
    },
  });

  return (
    <table.AppTable>
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <table.AppHeader key={header.id} header={header}>
                    {() => (
                      <TableHead
                        className={getLayoutMeta(header.column.columnDef.meta).headClassName}
                      >
                        {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                      </TableHead>
                    )}
                  </table.AppHeader>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <table.AppCell key={cell.id} cell={cell}>
                      {() => (
                        <TableCell
                          className={getLayoutMeta(cell.column.columnDef.meta).cellClassName}
                        >
                          <table.FlexRender cell={cell} />
                        </TableCell>
                      )}
                    </table.AppCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <div className="border-t">
          <table.TablePagination />
        </div>
      </div>
    </table.AppTable>
  );
}
