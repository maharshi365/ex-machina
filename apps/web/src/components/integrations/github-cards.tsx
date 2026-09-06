import { Check, ExternalLink, Github, LockKeyhole } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function GitHubConnectCard({
  canManage,
  hasConnections,
}: {
  canManage: boolean;
  hasConnections: boolean;
}) {
  return (
    <Card className="overflow-hidden bg-card text-card-foreground shadow-sm">
      <CardHeader className="border-b bg-muted/40">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Github className="size-6" />
            </div>
            <div>
              <CardTitle>GitHub App</CardTitle>
              <CardDescription className="mt-1">
                Connect repositories to your factory library.
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary">Official</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Install the ex-machina GitHub App, choose repository access, and return here
          automatically. Access tokens are short-lived and are never stored.
        </p>
        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
          <span className="flex items-center gap-2">
            <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
            Repository metadata
          </span>
          <span className="flex items-center gap-2">
            <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
            Branch changes
          </span>
          <span className="flex items-center gap-2">
            <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
            Pull requests
          </span>
        </div>
        <form method="post" action="/api/integrations/github/install">
          <input type="hidden" name="returnTo" value="/library/integrations" />
          <Button type="submit" disabled={!canManage}>
            <Github className="size-4" />
            {hasConnections ? 'Add another installation' : 'Connect GitHub'}
            <ExternalLink className="size-3" />
          </Button>
        </form>
        {!canManage && (
          <p className="text-xs text-muted-foreground">
            An organization owner or admin must connect GitHub.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function InstallationSecurityCard() {
  return (
    <Card>
      <CardHeader>
        <LockKeyhole className="size-5 text-muted-foreground" />
        <CardTitle>Installation security</CardTitle>
        <CardDescription>
          The setup is verified against both your GitHub user and the GitHub App.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>OAuth uses PKCE and one-time state values that expire after 10 minutes.</p>
        <p>Only repositories selected during GitHub installation are synchronized.</p>
      </CardContent>
    </Card>
  );
}
