import { FactoryDefinitionSchema, type FactoryDefinition } from "./definition/index.js";

export class FactoryValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(`Invalid factory definition:\n- ${issues.join("\n- ")}`);
    this.name = "FactoryValidationError";
  }
}

export function validateFactoryDefinition(definition: FactoryDefinition): void {
  const shape = FactoryDefinitionSchema.safeParse(definition);
  if (!shape.success) {
    throw new FactoryValidationError(
      shape.error.issues.map((issue) => `${issue.path.join(".") || "definition"}: ${issue.message}`)
    );
  }
  const issues: string[] = [];

  const repositoryKeys = collectKeys(definition.repositories, "repository", issues);
  const agentKeys = collectKeys(definition.agents, "agent", issues);
  collectKeys(definition.automations, "automation", issues);

  for (const repository of definition.repositories) {
    requireText(repository.connectionId, `repositories.${repository.key}.connectionId`, issues);
    requireText(
      repository.source.repositoryId,
      `repositories.${repository.key}.source.repositoryId`,
      issues
    );
    requireText(repository.display.owner, `repositories.${repository.key}.display.owner`, issues);
    requireText(repository.display.name, `repositories.${repository.key}.display.name`, issues);
  }

  for (const agent of definition.agents) {
    requireText(agent.name, `agents.${agent.key}.name`, issues);
    requireText(agent.agentId, `agents.${agent.key}.agentId`, issues);
    rejectDuplicates(agent.skillIds, `agents.${agent.key}.skillIds`, issues);
  }

  for (const automation of definition.automations) {
    requireText(automation.name, `automations.${automation.key}.name`, issues);
    if (!agentKeys.has(automation.agentKey)) {
      issues.push(`automations.${automation.key}.agentKey references an unknown agent`);
    }
    validateReferences(
      automation.repositoryKeys,
      repositoryKeys,
      `automations.${automation.key}.repositoryKeys`,
      issues
    );
    rejectDuplicates(automation.skillIds, `automations.${automation.key}.skillIds`, issues);

    collectKeys(automation.triggers, `automations.${automation.key}.trigger`, issues);
    for (const trigger of automation.triggers) {
      validateReferences(
        trigger.repositoryKeys,
        repositoryKeys,
        `automations.${automation.key}.triggers.${trigger.key}.repositoryKeys`,
        issues
      );
      for (const repositoryKey of trigger.repositoryKeys) {
        const repository = definition.repositories.find(
          (candidate) => candidate.key === repositoryKey
        );
        if (repository && repository.connectionId !== trigger.source.connectionId) {
          issues.push(
            `automations.${automation.key}.triggers.${trigger.key} source connection does not match repository ${repositoryKey}`
          );
        }
      }
    }
  }

  if (issues.length) throw new FactoryValidationError(issues);
}

export function validateFactoryForActivation(definition: FactoryDefinition): void {
  validateFactoryDefinition(definition);
  const issues: string[] = [];

  if (!definition.repositories.length) issues.push("at least one repository is required");
  if (!definition.agents.length) issues.push("at least one assigned agent is required");
  if (!definition.automations.some((automation) => automation.enabled)) {
    issues.push("at least one enabled automation is required");
  }

  for (const automation of definition.automations) {
    if (!automation.enabled) continue;
    if (!automation.repositoryKeys.length)
      issues.push(`automations.${automation.key} requires a repository`);
    if (!automation.triggers.length)
      issues.push(`automations.${automation.key} requires a trigger`);
    for (const trigger of automation.triggers) {
      if (!trigger.repositoryKeys.length) {
        issues.push(
          `automations.${automation.key}.triggers.${trigger.key} requires a source repository`
        );
      }
    }
  }

  if (issues.length) throw new FactoryValidationError(issues);
}

function collectKeys(items: Array<{ key: string }>, label: string, issues: string[]): Set<string> {
  const keys = new Set<string>();
  for (const item of items) {
    if (!item.key.trim()) issues.push(`${label} key is required`);
    if (keys.has(item.key)) issues.push(`${label} key ${item.key} is duplicated`);
    keys.add(item.key);
  }
  return keys;
}

function requireText(value: string, path: string, issues: string[]): void {
  if (!value.trim()) issues.push(`${path} is required`);
}

function rejectDuplicates(values: string[], path: string, issues: string[]): void {
  if (new Set(values).size !== values.length) issues.push(`${path} contains duplicates`);
}

function validateReferences(
  values: string[],
  available: Set<string>,
  path: string,
  issues: string[]
): void {
  rejectDuplicates(values, path, issues);
  for (const value of values) {
    if (!available.has(value)) issues.push(`${path} references unknown repository ${value}`);
  }
}
