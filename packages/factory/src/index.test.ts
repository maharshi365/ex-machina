import { describe, expect, test } from 'bun:test';
import {
  FactoryValidationError,
  defineFactory,
  resolveAutomationExecution,
  resolveAutomationSkillIds,
  validateFactoryForActivation,
  type FactoryDefinitionInput,
} from './index.js';

function input(): FactoryDefinitionInput {
  return {
    name: 'Pull request factory',
    executionDefaults: {
      model: { provider: 'openai', modelId: 'gpt-5' },
      harness: { type: 'opencode', version: 1 },
      sandbox: { provider: 'aws', version: 1, image: { id: 'typescript' } },
    },
    repositories: [
      {
        key: 'app',
        connectionId: 'github-installation-1',
        source: { provider: 'github', version: 1, repositoryId: '123' },
        display: { owner: 'acme', name: 'app', defaultBranch: 'main' },
      },
    ],
    agents: [
      {
        key: 'reviewer',
        name: 'Reviewer',
        agentId: 'library-agent-1',
      },
    ],
    automations: [
      {
        key: 'review-pr',
        name: 'Review pull requests',
        enabled: true,
        agentKey: 'reviewer',
        repositoryKeys: ['app'],
        triggers: [
          {
            key: 'opened',
            source: { provider: 'github', version: 1, connectionId: 'github-installation-1' },
            event: 'pull_request.opened',
            repositoryKeys: ['app'],
          },
        ],
        execution: {
          model: { provider: 'anthropic', modelId: 'claude-sonnet-4' },
        },
      },
    ],
  };
}

describe('factory definition', () => {
  test('adds the platform schema version and resolves inheritance', () => {
    const definition = defineFactory(input());
    const automation = definition.automations[0]!;

    expect(definition.schemaVersion).toBe(1);
    expect(definition.agents[0]!.skillIds).toEqual([]);
    expect(automation.skillIds).toEqual([]);
    expect(resolveAutomationExecution(definition, automation).model.provider).toBe('anthropic');
    expect(resolveAutomationExecution(definition, automation).harness.type).toBe('opencode');
    expect(resolveAutomationSkillIds(automation)).toEqual([]);
    expect(() => validateFactoryForActivation(definition)).not.toThrow();
  });

  test('rejects broken local references', () => {
    const value = input();
    value.automations[0]!.repositoryKeys = ['missing'];

    expect(() => defineFactory(value)).toThrow(FactoryValidationError);
  });

  test('uses strict Zod schemas at the portable boundary', () => {
    const value = input();
    const withUnknownField = { ...value, unknown: true };

    expect(() => defineFactory(withUnknownField)).toThrow();
  });

  test('allows a structural draft but rejects its activation', () => {
    const value = input();
    value.repositories = [];
    value.agents = [];
    value.automations = [];
    const definition = defineFactory(value);

    expect(() => validateFactoryForActivation(definition)).toThrow(FactoryValidationError);
  });
});
