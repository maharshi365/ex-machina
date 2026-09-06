import { ExternalLink, Github } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { IntegrationStatusBadge, type IntegrationRow } from './integrations-table';

function formatDateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function IntegrationDetailsDialog({
  connection,
  onOpenChange,
}: {
  connection: IntegrationRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const activeResources = connection?.resources.filter((r) => r.status === 'active') ?? [];

  return (
    <Dialog open={connection !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {connection && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Github className="size-5 text-muted-foreground" />
                {connection.account.login}
                <IntegrationStatusBadge status={connection.status} />
              </DialogTitle>
              <DialogDescription>
                {connection.account.type} installation · {activeResources.length}{' '}
                {activeResources.length === 1 ? 'repository' : 'repositories'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <Fact label="Installation ID">
                <span className="font-mono text-[13px]">{connection.auth.installationId}</span>
              </Fact>
              <Fact label="Repository access">
                <span className="capitalize">{connection.grants.repositorySelection}</span>
              </Fact>
              <Fact label="Connected">{formatDateTime(connection.createdAt)}</Fact>
              <Fact label="Last updated">{formatDateTime(connection.editedAt)}</Fact>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Repositories</p>
              {activeResources.length === 0 ? (
                <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                  No repositories synchronized yet.
                </p>
              ) : (
                <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-1">
                  {activeResources.map((resource) => (
                    <li
                      key={resource._id}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
                    >
                      <a
                        href={resource.display.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-w-0 items-center gap-1.5 font-mono text-[13px] hover:underline"
                      >
                        <span className="truncate" title={resource.locator.fullName}>
                          {resource.locator.fullName}
                        </span>
                        <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
                      </a>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <Badge variant="outline" className="font-normal">
                          {resource.display.private ? 'Private' : 'Public'}
                        </Badge>
                        <Badge variant="secondary" className="font-mono font-normal">
                          {resource.display.defaultBranch}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
