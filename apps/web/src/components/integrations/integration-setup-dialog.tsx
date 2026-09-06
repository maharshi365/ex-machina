import * as React from 'react';
import { ArrowLeft, Github, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const integrations = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Connect repositories to your factory library.',
    searchTerms: 'github repository repositories code pull requests',
  },
] as const;

export function IntegrationSetupDialog({
  canManage,
  open,
  onOpenChange,
}: {
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<(typeof integrations)[number]['id'] | null>(
    null
  );
  const selected = integrations.find((integration) => integration.id === selectedId);
  const visibleIntegrations = integrations.filter((integration) =>
    `${integration.name} ${integration.description} ${integration.searchTerms}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setQuery('');
      setSelectedId(null);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {selected ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Github className="size-5" />
                Set up {selected.name}
              </DialogTitle>
              <DialogDescription>{selected.description}</DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              GitHub configuration happens securely on GitHub. You will choose repository access
              before returning here.
            </div>
            {!canManage && (
              <p className="text-sm text-muted-foreground">
                An organization owner or admin must connect GitHub.
              </p>
            )}

            <form id="github-install" method="post" action="/api/integrations/github/install">
              <input type="hidden" name="returnTo" value="/library/integrations" />
            </form>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSelectedId(null)}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" form="github-install" disabled={!canManage}>
                <Github className="size-4" />
                Continue to GitHub
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add integration</DialogTitle>
              <DialogDescription>
                Choose a service to connect to this organization.
              </DialogDescription>
            </DialogHeader>

            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                className="pl-9"
                placeholder="Search integrations"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleIntegrations.map((integration) => (
                <button
                  key={integration.id}
                  type="button"
                  className="flex min-h-32 flex-col items-start rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
                  onClick={() => setSelectedId(integration.id)}
                >
                  <span className="mb-4 flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Github className="size-5" />
                  </span>
                  <span className="flex w-full items-center justify-between gap-2 font-medium">
                    {integration.name}
                    <Badge variant="secondary">Official</Badge>
                  </span>
                  <span className="mt-1 text-sm text-muted-foreground">
                    {integration.description}
                  </span>
                </button>
              ))}
            </div>
            {visibleIntegrations.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No integrations match "{query}".
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
