import { z } from 'zod';

export const HarnessDefinitionSchema = z.strictObject({
  type: z.literal('opencode'),
  version: z.literal(1),
});

export type HarnessDefinition = z.infer<typeof HarnessDefinitionSchema>;
