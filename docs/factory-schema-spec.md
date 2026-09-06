# Factory Data Schema

Status: proposed v0.2
Factory schema version: `1`

## Decisions

- The portable `FactoryDefinition` is the canonical configuration shape. MongoDB wraps it with platform identity, lifecycle, revision, and audit data.
- Library agents and skills are live references. An edit is used by the next run. Every run must snapshot the resolved agent, skills, definition revision, and execution configuration, and reference the immutable webhook delivery that caused it.
- A factory assigns named local agents. Automations target those assignment keys rather than global library IDs.
- Runtime inheritance is `factory defaults -> assigned agent -> automation`. A supplied `model` or `sandbox` block replaces that whole inherited block.
- Agent and automation `skillIds` are always present. They default to `[]`; an automation's list is authoritative for that automation.
- Every automation explicitly lists its writable repository targets. Every trigger explicitly lists its event-source repositories. Those lists may differ.
- Multiple triggers on an automation use OR semantics. Filters within one trigger use AND semantics; values within one filter use OR semantics.
- Secrets, webhook deliveries, registrations, run state, and credentials are not factory configuration.

## Boundary

```text
connectionId (opaque reference resolved by the integration system)
       |
Database record (persistence concern; not part of the factory DTO)
  definition: FactoryDefinition (portable JSON / future config-as-code)
    repositories[] (checkout and write targets)
    agents[]       (named live references into the agent library)
    automations[]
      agentKey
      skillIds[]   (live references into the skill library)
      repositoryKeys[]
      triggers[]   (OR)
      execution overrides
```

Configuration describes what should run. Operational state describes what did run and belongs in separate collections.

## Portable Definition

The executable TypeScript contract is grouped under `packages/factory/src/definition` and `execution`. The root `index.ts` is only the public export surface; `factory.ts` owns `defineFactory()`. Zod schemas are colocated with each domain type so runtime validation and inferred TypeScript types cannot drift apart.

```ts
type FactoryDefinition = {
  schemaVersion: 1;
  name: string;
  description?: string;
  executionDefaults: ExecutionDefinition;
  repositories: FactoryRepository[];
  agents: FactoryAgent[];
  automations: FactoryAutomation[];
};

type FactoryRepository = {
  key: string;
  connectionId: string;
  source: {
    provider: 'github';
    version: 1;
    repositoryId: string;
  };
  display: {
    owner: string;
    name: string;
    url?: string;
    defaultBranch?: string;
  };
};

type FactoryAgent = {
  key: string;
  name: string;
  agentId: string;
  skillIds: string[];
  execution?: Partial<ExecutionDefinition>;
};

type FactoryAutomation = {
  key: string;
  name: string;
  enabled: boolean;
  agentKey: string;
  repositoryKeys: string[];
  skillIds: string[];
  initialPrompt?: string;
  triggers: FactoryTrigger[];
  execution?: Partial<ExecutionDefinition>;
};
```

Both agent and automation `skillIds` default to `[]` during parsing and are required in the resulting factory DTO. Automation skills do not implicitly inherit from the assigned agent.

### Execution

```ts
type ExecutionDefinition = {
  model: {
    provider: string;
    modelId: string;
  };
  sandbox: {
    provider: 'aws';
    version: 1;
    image: { id: string };
  };
};
```

All runs use the opencode harness. It is a fixed platform behavior, not factory configuration, so it does not appear in the definition.

An image is a platform catalog ID such as `typescript` or `python`, not an arbitrary Docker image. The catalog resolves it to an immutable image digest when a run starts. This lets the platform patch defaults while the run snapshot retains the exact digest used.

### GitHub Trigger v1

```ts
type GithubTrigger = {
  key: string;
  source: {
    provider: 'github';
    version: 1;
    connectionId: string;
  };
  event:
    | 'issues.opened'
    | 'issues.closed'
    | 'issues.labeled'
    | 'pull_request.opened'
    | 'pull_request.closed'
    | 'pull_request.merged'
    | 'pull_request.ready_for_review'
    | 'pull_request.reopened'
    | 'pull_request.synchronize'
    | 'pull_request.labeled'
    | 'pull_request.review_submitted'
    | 'push'
    | 'workflow_run.completed';
  repositoryKeys: string[];
  filters?: {
    branches?: string[];
    baseBranches?: string[];
    labels?: string[];
    actors?: string[];
    paths?: string[];
    draft?: boolean;
    workflowNames?: string[];
    conclusions?: string[];
  };
};
```

Provider and version form a discriminant. New providers add union members rather than weakening the entire schema to `Record<string, unknown>`.

## Persistence Boundary

```ts
type StoredFactory = {
  _id: ObjectId;
  organizationId: ObjectId;
  status: 'draft' | 'active' | 'disabled';
  revision: number;
  definition: FactoryDefinition; // portable and persistence-agnostic
  createdBy: ObjectId;
  editedBy: ObjectId;
  createdAt: Date;
  editedAt: Date;
};

type StoredFactoryRevision = {
  _id: ObjectId;
  factoryId: ObjectId;
  organizationId: ObjectId;
  revision: number;
  definition: FactoryDefinition;
  createdBy: ObjectId;
  createdAt: Date;
};
```

`StoredFactory` belongs in `@ex-machina/db`, not `@ex-machina/factory`. The factory package exports only the portable definition and never exposes MongoDB `_id`, `ObjectId`, dates, audit fields, or persistence lifecycle metadata.

`schemaVersion` identifies the platform-owned definition shape. A database `revision` is unrelated: it increments on every successful mutation and supports optimistic concurrency (`update where _id + organizationId + revision`).
Every successful mutation also stores an immutable `StoredFactoryRevision`. Trigger routes and run snapshots resolve that immutable revision so an event already being dispatched cannot race with a later factory edit.

The server does not accept `_id`, `organizationId`, audit fields, `revision`, or a caller-selected schema version in create/update inputs. `defineFactory()` supplies the current schema version for code-authored definitions. Raw JSON/YAML imports must declare a supported version so a parser can select the correct migration and validator.

## Integration References

The factory definition stores only opaque `connectionId` references and stable
provider resource IDs. It does not define connection records, authorization
grants, installation state, credentials, resource synchronization, webhook
storage, or provider clients. The integration system resolves and validates
those references when a factory is activated and when a run starts.

The authoritative connection and webhook models are defined in
[`integration-system-design.md`](./integration-system-design.md).

## Example As Code

```ts
import { defineFactory } from '@ex-machina/factory';

export default defineFactory({
  name: 'Payments PR review',
  description: 'Reviews pull requests for the payments services',
  executionDefaults: {
    model: { provider: 'openai', modelId: 'gpt-5' },
    sandbox: { provider: 'aws', version: 1, image: { id: 'typescript' } },
  },
  repositories: [
    {
      key: 'api',
      connectionId: 'github-installation-1',
      source: { provider: 'github', version: 1, repositoryId: '987654' },
      display: { owner: 'acme', name: 'payments-api', defaultBranch: 'main' },
    },
  ],
  agents: [
    {
      key: 'reviewer',
      name: 'Payments reviewer',
      agentId: 'library-agent-123',
      skillIds: ['library-skill-security', 'library-skill-typescript'],
    },
  ],
  automations: [
    {
      key: 'review-pr',
      name: 'Review new pull requests',
      enabled: true,
      agentKey: 'reviewer',
      repositoryKeys: ['api'],
      initialPrompt: 'Review this pull request and post actionable findings.',
      triggers: [
        {
          key: 'opened',
          source: { provider: 'github', version: 1, connectionId: 'github-installation-1' },
          event: 'pull_request.opened',
          repositoryKeys: ['api'],
          filters: { baseBranches: ['main'], draft: false },
        },
        {
          key: 'ready',
          source: { provider: 'github', version: 1, connectionId: 'github-installation-1' },
          event: 'pull_request.ready_for_review',
          repositoryKeys: ['api'],
          filters: { baseBranches: ['main'] },
        },
      ],
    },
  ],
});
```

## Validation Layers

Structural validation runs on every save:

- Zod rejects unknown fields, blank identifiers, unsupported provider/version literals, malformed URLs, and invalid nested shapes.
- Local keys are non-empty and unique within their resource list.
- Every `agentKey` and repository key resolves within the same definition.
- Reference lists contain no duplicates.
- Adapter/provider versions are supported.
- A future JSON Schema artifact can be generated from the same portable Zod boundary for editor and config-as-code tooling.

Activation validation additionally requires:

- At least one repository, assigned agent, and enabled automation.
- Every enabled automation has at least one target repository and trigger.
- Every trigger has at least one source repository.
- Every trigger uses only filters supported by its provider event.
- Referenced connections, agents, and skills exist in the same organization.
- Connections are active and authorize every referenced external repository.
- Models and images are currently supported.

An active factory update must pass activation validation atomically. Invalid config never partially replaces the last active definition.

## Lifecycle And Runs

```text
draft --activate--> active --disable--> disabled --activate--> active
```

Activation registers routing from normalized trigger descriptors. Disabling prevents new runs but retains configuration. In-flight runs continue under their snapshots unless separately cancelled.

A future run record must include at least:

```ts
type FactoryRunSnapshot = {
  factoryId: ObjectId;
  factoryRevision: number;
  schemaVersion: 1;
  automationKey: string;
  triggerKey: string;
  webhookDeliveryId: ObjectId;
  resolvedAgent: { id: ObjectId; editedAt: Date; content: string };
  resolvedSkills: Array<{ id: ObjectId; editedAt: Date; content: string }>;
  resolvedExecution: ExecutionDefinition & { sandboxImageDigest: string };
  repositoryRefs: Array<{ key: string; externalId: string; commit?: string }>;
};
```

This snapshot is mandatory because library references intentionally resolve to latest at run start. The normalized webhook is not copied into the snapshot: `webhookDeliveryId` references its canonical immutable record, which must be retained for at least the lifetime of the run.

## Indexes

```text
factories:                   { organizationId: 1, editedAt: -1 }
factories:                   { organizationId: 1, status: 1 }
factory_revisions unique:    { factoryId: 1, revision: 1 }
```

Integration indexes do not belong in the factory schema.

## Deliberately Deferred

- Integration implementation; its installation, token, webhook, routing, and retry design is specified in
  [`integration-system-design.md`](./integration-system-design.md).
- Sandbox providers beyond AWS v1 and image catalog IDs.
- Secret references and runtime permission policy.
- Immutable library revisions; live references plus run snapshots are the selected initial behavior.
- JSON Schema generation and config-as-code loading. The portable contract avoids coupling these to MongoDB.
