import type { FactoryAutomation, FactoryDefinition } from './definition/index.js';
import type { ExecutionDefinition } from './execution/index.js';
import { FactoryValidationError } from './validation.js';

export function resolveAutomationExecution(
  definition: FactoryDefinition,
  automation: FactoryAutomation
): ExecutionDefinition {
  const agent = definition.agents.find((candidate) => candidate.key === automation.agentKey);
  if (!agent) throw new FactoryValidationError([`unknown agent ${automation.agentKey}`]);
  return {
    ...definition.executionDefaults,
    ...agent.execution,
    ...automation.execution,
  };
}

export function resolveAutomationSkillIds(automation: FactoryAutomation): string[] {
  return [...automation.skillIds];
}
