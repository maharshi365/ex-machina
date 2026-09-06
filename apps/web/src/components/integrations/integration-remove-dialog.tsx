import { ExternalLink, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { IntegrationRow } from './integrations-table';

export function IntegrationRemoveDialog({
  connection,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  connection: IntegrationRow | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={connection !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {connection?.account.login}?</DialogTitle>
          <DialogDescription>
            Ex Machina will uninstall the GitHub App from this account and remove access to its
            repositories. This integration can be added again later.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          If automatic uninstall fails, remove the app in GitHub settings and try again.
        </p>
        <DialogFooter>
          {connection && (
            <Button variant="outline" asChild>
              <a
                href={`https://github.com/settings/installations/${connection.auth.installationId}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="size-4" />
                GitHub settings
              </a>
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Remove integration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
