import { z } from 'zod';
import { ModelDefinitionSchema } from './model.js';
import { SandboxDefinitionSchema } from './sandbox.js';

export * from './model.js';
export * from './sandbox.js';

export const ExecutionDefinitionSchema = z.strictObject({
  model: ModelDefinitionSchema,
  sandbox: SandboxDefinitionSchema,
});

export type ExecutionDefinition = z.infer<typeof ExecutionDefinitionSchema>;

/** A supplied override replaces the complete block at that level. */
export const ExecutionOverridesSchema = ExecutionDefinitionSchema.partial();
export type ExecutionOverrides = z.infer<typeof ExecutionOverridesSchema>;
