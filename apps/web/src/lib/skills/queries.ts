import { queryOptions } from '@tanstack/react-query'
import {
  createSkillServerFn,
  deleteSkillServerFn,
  getSkillServerFn,
  listSkillsServerFn,
  updateSkillServerFn,
} from './server.js'

export const skillKeys = {
  all: ['skills'] as const,
  byOrg: (organizationId: string) => [...skillKeys.all, 'org', organizationId] as const,
  lists: (organizationId: string) => [...skillKeys.byOrg(organizationId), 'list'] as const,
  list: (organizationId: string) => [...skillKeys.lists(organizationId)] as const,
  details: (organizationId: string) => [...skillKeys.byOrg(organizationId), 'detail'] as const,
  detail: (organizationId: string, id: string) => [...skillKeys.details(organizationId), id] as const,
}

export function skillsQueryOptions(organizationId: string) {
  return queryOptions({
    queryKey: skillKeys.list(organizationId),
    queryFn: () => listSkillsServerFn(),
  })
}

export function skillQueryOptions(organizationId: string, id: string) {
  return queryOptions({
    queryKey: skillKeys.detail(organizationId, id),
    queryFn: () => getSkillServerFn({ data: { id } }),
  })
}

// orgId only for cache invalidation; server derives org from session
export function createSkillMutationOptions(_organizationId: string) {
  return {
    mutationFn: (data: { name: string; description: string; content: string }) => createSkillServerFn({ data }),
  } as const
}

export function updateSkillMutationOptions(_organizationId: string) {
  return {
    mutationFn: (data: { id: string; name?: string; description?: string; content?: string }) => updateSkillServerFn({ data }),
  } as const
}

export function deleteSkillMutationOptions(_organizationId: string) {
  return {
    mutationFn: (data: { id: string }) => deleteSkillServerFn({ data }),
  } as const
}
