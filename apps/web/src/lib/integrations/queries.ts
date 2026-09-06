import { queryOptions } from '@tanstack/react-query';
import { listIntegrationsServerFn, removeIntegrationServerFn } from './server.js';

export const integrationKeys = {
  all: ['integrations'] as const,
  list: (organizationId: string) => [...integrationKeys.all, organizationId] as const,
};

export function integrationsQueryOptions(organizationId: string) {
  return queryOptions({
    queryKey: integrationKeys.list(organizationId),
    queryFn: () => listIntegrationsServerFn(),
  });
}

export function removeIntegrationMutationOptions() {
  return {
    mutationFn: (connectionId: string) => removeIntegrationServerFn({ data: { connectionId } }),
  } as const;
}
