import { z } from 'zod';
import { ExecutionDefinitionSchema } from '../execution/index.js';
import { FactoryAgentSchema } from './agent.js';
import { FactoryAutomationSchema } from './automation.js';
import { FactoryRepositorySchema } from './repository.js';

export * from './agent.js';
export * from './automation.js';
export * from './github-trigger.js';
export * from './repository.js';

export const FACTORY_SCHEMA_VERSION = 1 as const;

export type FactorySchemaVersion = typeof FACTORY_SCHEMA_VERSION;

export const FactoryDefinitionSchema = z.strictObject({
  schemaVersion: z.literal(FACTORY_SCHEMA_VERSION),
  name: z.string().trim().min(1),
  description: z.string().optional(),
  executionDefaults: ExecutionDefinitionSchema,
  repositories: z.array(FactoryRepositorySchema),
  agents: z.array(FactoryAgentSchema),
  automations: z.array(FactoryAutomationSchema),
});

export const FactoryDefinitionInputSchema = FactoryDefinitionSchema.omit({ schemaVersion: true });

export type FactoryDefinition = z.infer<typeof FactoryDefinitionSchema>;
export type FactoryDefinitionInput = z.input<typeof FactoryDefinitionInputSchema>;
