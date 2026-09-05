import { createFileRoute } from "@tanstack/react-router";
import { completeGitHubInstallation } from "#/lib/github-integration";
import { requireIntegrationSession } from "#/lib/integration-auth";

export const Route = createFileRoute("/api/integrations/github/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const session = await requireIntegrationSession(request, { requireAdmin: true });
          const url = new URL(request.url);
          const state = url.searchParams.get("state");
          const code = url.searchParams.get("code");
          if (!state || !code) throw new Error("GitHub authorization was not completed");
          const returnTo = await completeGitHubInstallation({ ...session, state, code });
          const location = new URL(returnTo, request.url);
          location.searchParams.set("github", "connected");
          return Response.redirect(location, 303);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to connect GitHub";
          const location = new URL("/library/integrations", request.url);
          location.searchParams.set("github", "error");
          location.searchParams.set("message", message);
          return Response.redirect(location, 303);
        }
      },
    },
  },
});
