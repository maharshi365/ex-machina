import { useQuery } from '@tanstack/react-query';
import { Plug, Plus } from 'lucide-react';
import * as React from 'react';

import { DataTable } from '@/components/ui/app-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import { integrationsQueryOptions } from '@/lib/integrations/queries';

import { getIntegrationColumns, type IntegrationRow } from './integrations-table';
import { IntegrationDetailsDialog } from './integration-details-dialog';
import { IntegrationSetupDialog } from './integration-setup-dialog';

export function ConnectedInstallations({
  organizationId,
  canManage,
}: {
  organizationId: string;
  canManage: boolean;
}) {
  const {
    data: connections,
    isLoading,
    error,
  } = useQuery(integrationsQueryOptions(organizationId));
  const githubConnections =
    connections?.filter((connection) => connection.provider === 'github') ?? [];

  const [selected, setSelected] = React.useState<IntegrationRow | null>(null);
  const [setupOpen, setSetupOpen] = React.useState(false);

  const columns = React.useMemo(() => getIntegrationColumns(setSelected), []);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Connected installations</h2>
        <Button size="sm" onClick={() => setSetupOpen(true)}>
          <Plus className="size-4" />
          Add integration
        </Button>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Failed to load integrations</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : String(error)}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : githubConnections.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
            <Plug className="size-5" />
            No GitHub installations connected yet.
          </CardContent>
        </Card>
      ) : (
        <TooltipProvider>
          <DataTable
            columns={columns}
            data={githubConnections}
            emptyMessage="No GitHub installations connected yet."
          />
          <IntegrationDetailsDialog
            connection={selected}
            onOpenChange={(open) => !open && setSelected(null)}
          />
        </TooltipProvider>
      )}
      <IntegrationSetupDialog canManage={canManage} open={setupOpen} onOpenChange={setSetupOpen} />
    </div>
  );
}
