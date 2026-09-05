import { z } from 'zod';
import { ExecutionOverridesSchema } from '../execution/index.js';

export const FactoryAgentSchema = z.strictObject({
  key: z.string().trim().min(1),
  name: z.string().trim().min(1),
  agentId: z.string().trim().min(1),
  skillIds: z.array(z.string().trim().min(1)).default([]),
  execution: ExecutionOverridesSchema.optional(),
});

export type FactoryAgent = z.infer<typeof FactoryAgentSchema>;
