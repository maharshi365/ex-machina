import { z } from 'zod';

export const SandboxDefinitionSchema = z.strictObject({
  provider: z.literal('aws'),
  version: z.literal(1),
  image: z.strictObject({
    id: z.string().trim().min(1),
  }),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type SandboxDefinition = z.infer<typeof SandboxDefinitionSchema>;
