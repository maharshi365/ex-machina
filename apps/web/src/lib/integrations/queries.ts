import { queryOptions } from "@tanstack/react-query";
import { listIntegrationsServerFn } from "./server.js";

export const integrationKeys = {
  all: ["integrations"] as const,
  list: (organizationId: string) => [...integrationKeys.all, organizationId] as const,
};

export function integrationsQueryOptions(organizationId: string) {
  return queryOptions({
    queryKey: integrationKeys.list(organizationId),
    queryFn: () => listIntegrationsServerFn(),
  });
}
