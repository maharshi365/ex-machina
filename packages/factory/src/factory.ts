import {
  FACTORY_SCHEMA_VERSION,
  FactoryDefinitionSchema,
  type FactoryDefinition,
  type FactoryDefinitionInput,
} from './definition/index.js';
import { validateFactoryDefinition } from './validation.js';

export function defineFactory(input: FactoryDefinitionInput): FactoryDefinition {
  const definition = FactoryDefinitionSchema.parse({
    schemaVersion: FACTORY_SCHEMA_VERSION,
    ...input,
  });
  validateFactoryDefinition(definition);
  return definition;
}
