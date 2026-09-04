import { z } from "zod";

export const FactoryRepositorySchema = z.strictObject({
  key: z.string().trim().min(1),
  connectionId: z.string().trim().min(1),
  source: z.strictObject({
    provider: z.literal("github"),
    version: z.literal(1),
    repositoryId: z.string().trim().min(1),
  }),
  display: z.strictObject({
    owner: z.string().trim().min(1),
    name: z.string().trim().min(1),
    url: z.url().optional(),
    defaultBranch: z.string().trim().min(1).optional(),
  }),
});

export type FactoryRepository = z.infer<typeof FactoryRepositorySchema>;
