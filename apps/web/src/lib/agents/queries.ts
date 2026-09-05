import { queryOptions } from '@tanstack/react-query'
import {
  createAgentServerFn,
  deleteAgentServerFn,
  getAgentServerFn,
  listAgentsServerFn,
  updateAgentServerFn,
} from './server.js'

// ---------------------------------------------------------------------------
// Query Key Factory — org-scoped for better caching & isolation
// ---------------------------------------------------------------------------

export const agentKeys = {
  all: ['agents'] as const,
  byOrg: (organizationId: string) => [...agentKeys.all, 'org', organizationId] as const,
  lists: (organizationId: string) => [...agentKeys.byOrg(organizationId), 'list'] as const,
  list: (organizationId: string) => [...agentKeys.lists(organizationId)] as const,
  details: (organizationId: string) => [...agentKeys.byOrg(organizationId), 'detail'] as const,
  detail: (organizationId: string, id: string) => [...agentKeys.details(organizationId), id] as const,
}

// ---------------------------------------------------------------------------
// Query Options — org-scoped
// TanStack Start: use in route `loader` via `queryClient.ensureQueryData`
// ---------------------------------------------------------------------------

export function agentsQueryOptions(organizationId: string) {
  return queryOptions({
    queryKey: agentKeys.list(organizationId),
    // org is resolved server-side via auth middleware; FE passes no orgId
    queryFn: () => listAgentsServerFn(),
  })
}

export function agentQueryOptions(organizationId: string, id: string) {
  return queryOptions({
    queryKey: agentKeys.detail(organizationId, id),
    queryFn: () => getAgentServerFn({ data: { id } }),
  })
}

// ---------------------------------------------------------------------------
// Mutation helpers — FE does not send organizationId.
// Server derives it from session.activeOrganizationId (auth middleware).
// organizationId is only needed here to scope invalidation via queryKeys.
// ---------------------------------------------------------------------------

export function createAgentMutationOptions(_organizationId: string) {
  return {
    mutationFn: (data: { name: string; description: string; content: string }) =>
      createAgentServerFn({ data }),
  } as const
}

export function updateAgentMutationOptions(_organizationId: string) {
  return {
    mutationFn: (data: { id: string; name?: string; description?: string; content?: string }) =>
      updateAgentServerFn({ data }),
  } as const
}

export function deleteAgentMutationOptions(_organizationId: string) {
  return {
    mutationFn: (data: { id: string }) => deleteAgentServerFn({ data }),
  } as const
}
