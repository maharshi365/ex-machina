import { z } from 'zod';

export const ModelDefinitionSchema = z.strictObject({
  provider: z.string().trim().min(1),
  modelId: z.string().trim().min(1),
});

export type ModelDefinition = z.infer<typeof ModelDefinitionSchema>;
