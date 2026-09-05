import { z } from 'zod';

export const ModelDefinitionSchema = z.strictObject({
  provider: z.string().trim().min(1),
  modelId: z.string().trim().min(1),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type ModelDefinition = z.infer<typeof ModelDefinitionSchema>;
