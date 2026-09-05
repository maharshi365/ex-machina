import { createFileRoute } from '@tanstack/react-router';
import { continueGitHubInstallation } from '@/lib/integrations/github';
import { requireIntegrationSession } from '@/lib/integrations/session';

export const Route = createFileRoute('/api/integrations/github/setup')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const session = await requireIntegrationSession(request, { requireAdmin: true });
          const url = new URL(request.url);
          const state = url.searchParams.get('state');
          const installationId = url.searchParams.get('installation_id');
          if (!state || !installationId) throw new Error('Missing GitHub installation parameters');
          const location = await continueGitHubInstallation({ ...session, state, installationId });
          return Response.redirect(location, 303);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unable to continue GitHub setup';
          const location = new URL('/library/integrations', request.url);
          location.searchParams.set('github', 'error');
          location.searchParams.set('message', message);
          return Response.redirect(location, 303);
        }
      },
    },
  },
});
