import { z } from 'zod';

export const GithubTriggerEventSchema = z.enum([
  'issues.opened',
  'issues.closed',
  'issues.labeled',
  'pull_request.opened',
  'pull_request.closed',
  'pull_request.merged',
  'pull_request.ready_for_review',
  'pull_request.reopened',
  'pull_request.synchronize',
  'pull_request.labeled',
  'pull_request.review_submitted',
  'push',
  'workflow_run.completed',
]);

export type GithubTriggerEvent = z.infer<typeof GithubTriggerEventSchema>;

const stringList = z.array(z.string().trim().min(1));

export const GithubTriggerSchema = z.strictObject({
  key: z.string().trim().min(1),
  source: z.strictObject({
    provider: z.literal('github'),
    version: z.literal(1),
    connectionId: z.string().trim().min(1),
  }),
  event: GithubTriggerEventSchema,
  repositoryKeys: stringList,
  filters: z
    .strictObject({
      branches: stringList.optional(),
      baseBranches: stringList.optional(),
      labels: stringList.optional(),
      actors: stringList.optional(),
      paths: stringList.optional(),
      draft: z.boolean().optional(),
      workflowNames: stringList.optional(),
      conclusions: stringList.optional(),
    })
    .optional(),
});

export type GithubTrigger = z.infer<typeof GithubTriggerSchema>;
