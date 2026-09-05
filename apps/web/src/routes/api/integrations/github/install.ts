import { createFileRoute } from '@tanstack/react-router';
import { beginGitHubInstallation } from '@/lib/integrations/github';
import { requireIntegrationSession } from '@/lib/integrations/session';

export const Route = createFileRoute('/api/integrations/github/install')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const session = await requireIntegrationSession(request, { requireAdmin: true });
          const form = await request.formData();
          const returnTo = form.get('returnTo');
          const location = await beginGitHubInstallation({
            ...session,
            returnTo: typeof returnTo === 'string' ? returnTo : undefined,
          });
          return Response.redirect(location, 303);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unable to install GitHub App';
          return new Response(message, { status: message === 'Unauthorized' ? 401 : 403 });
        }
      },
    },
  },
});
