import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Check, ExternalLink, Github, LockKeyhole, Plug, Server } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { AppSidebar } from "#/components/app-sidebar";
import { Badge } from "#/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "#/components/ui/sidebar";
import { Skeleton } from "#/components/ui/skeleton";
import { canManageIntegrationsServerFn } from "#/lib/integrations-api";
import { integrationsQueryOptions } from "#/lib/integrations.queries";
import { getActiveOrganizationServerFn } from "#/lib/org-api";

type IntegrationSearch = { github?: "connected" | "error"; message?: string };

export const Route = createFileRoute("/_authenticated/library/integrations/")({
  validateSearch: (search: Record<string, unknown>): IntegrationSearch => ({
    github: search.github === "connected" || search.github === "error" ? search.github : undefined,
    message: typeof search.message === "string" ? search.message : undefined,
  }),
  loader: async ({ context }) => {
    const [activeOrg, canManage] = await Promise.all([
      getActiveOrganizationServerFn(),
      canManageIntegrationsServerFn(),
    ]);
    if (activeOrg) {
      await context.queryClient.ensureQueryData(integrationsQueryOptions(activeOrg.id));
    }
    return { activeOrg, canManage };
  },
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const { activeOrg, canManage } = Route.useLoaderData();
  const search = Route.useSearch();

  React.useEffect(() => {
    if (search.github === "connected") toast.success("GitHub connected");
    if (search.github === "error") toast.error(search.message ?? "GitHub setup failed");
  }, [search.github, search.message]);

  if (!activeOrg) {
    return (
      <PageShell>
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <Building2 className="mx-auto size-8 text-muted-foreground" />
            <CardTitle>No active organization</CardTitle>
            <CardDescription>
              Select an organization before connecting integrations.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link to="/onboarding">Go to onboarding</Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return <IntegrationManager organizationId={activeOrg.id} canManage={canManage} />;
}

function IntegrationManager({
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
    connections?.filter((connection) => connection.provider === "github") ?? [];

  return (
    <PageShell>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <Card className="overflow-hidden border-neutral-800 bg-neutral-950 text-white shadow-xl dark:border-neutral-700">
          <CardHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_45%)]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-lg bg-white text-black">
                  <Github className="size-6" />
                </div>
                <div>
                  <CardTitle>GitHub App</CardTitle>
                  <CardDescription className="mt-1 text-neutral-400">
                    Connect repositories to your factory library.
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-emerald-400/15 text-emerald-300">Official</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="max-w-2xl text-sm leading-6 text-neutral-300">
              Install the ex-machina GitHub App, choose repository access, and return here
              automatically. Access tokens are short-lived and are never stored.
            </p>
            <div className="grid gap-2 text-sm text-neutral-300 sm:grid-cols-3">
              <span className="flex items-center gap-2">
                <Check className="size-4 text-emerald-400" />
                Repository metadata
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4 text-emerald-400" />
                Branch changes
              </span>
              <span className="flex items-center gap-2">
                <Check className="size-4 text-emerald-400" />
                Pull requests
              </span>
            </div>
            <form method="post" action="/api/integrations/github/install">
              <input type="hidden" name="returnTo" value="/library/integrations" />
              <Button
                type="submit"
                className="bg-white text-black hover:bg-neutral-200"
                disabled={!canManage}
              >
                <Github className="size-4" />
                {githubConnections.length ? "Add another installation" : "Connect GitHub"}
                <ExternalLink className="size-3" />
              </Button>
            </form>
            {!canManage && (
              <p className="text-xs text-neutral-400">
                An organization owner or admin must connect GitHub.
              </p>
            )}
          </CardContent>
        </Card>

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
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium">Connected installations</h2>
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
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
          <div className="grid gap-3 md:grid-cols-2">
            {githubConnections.map((connection) => {
              const activeRepositories = connection.resources.filter(
                (resource) => resource.status === "active"
              );
              return (
                <Card key={connection._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Github className="size-5" />
                        <div>
                          <CardTitle>{connection.account.login}</CardTitle>
                          <CardDescription>{connection.account.type} installation</CardDescription>
                        </div>
                      </div>
                      <Badge variant={connection.status === "active" ? "default" : "secondary"}>
                        {connection.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Server className="size-4" />
                      {activeRepositories.length}{" "}
                      {activeRepositories.length === 1 ? "repository" : "repositories"}
                    </p>
                    {activeRepositories.length > 0 && (
                      <p className="line-clamp-2 font-mono text-xs">
                        {activeRepositories.map((resource) => resource.locator.fullName).join(", ")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-5 p-4 pt-0">
          <div className="sticky top-0 z-10 -mx-4 flex items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">Library</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Integrations</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
