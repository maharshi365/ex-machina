# Factory Data Schema

Status: proposed v0.2
Factory schema version: `1`

## Decisions

- The portable `FactoryDefinition` is the canonical configuration shape. MongoDB wraps it with platform identity, lifecycle, revision, and audit data.
- Library agents and skills are live references. An edit is used by the next run. Every run must snapshot the resolved agent, skills, definition revision, event, and execution configuration.
- A factory assigns named local agents. Automations target those assignment keys rather than global library IDs.
- Runtime inheritance is `factory defaults -> assigned agent -> automation`. A supplied `model`, `harness`, or `sandbox` block replaces that whole inherited block. Adapter `config` objects are never implicitly deep-merged.
- Agent and automation `skillIds` are always present. They default to `[]`; an automation's list is authoritative for that automation.
- Every automation explicitly lists its writable repository targets. Every trigger explicitly lists its event-source repositories. Those lists may differ.
- Multiple triggers on an automation use OR semantics. Filters within one trigger use AND semantics; values within one filter use OR semantics.
- Secrets, webhook deliveries, registrations, run state, and credentials are not factory configuration.

## Boundary

```text
ExternalConnection (stored separately, reusable, owns authorization metadata)
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
    provider: "github";
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
    config?: Record<string, unknown>;
  };
  harness: {
    type: "opencode";
    version: 1;
    config?: Record<string, unknown>;
  };
  sandbox: {
    provider: "aws";
    version: 1;
    image: { id: string };
    config?: Record<string, unknown>;
  };
};
```

An image is a platform catalog ID such as `typescript` or `python`, not an arbitrary Docker image. The catalog resolves it to an immutable image digest when a run starts. This lets the platform patch defaults while the run snapshot retains the exact digest used.

### GitHub Trigger v1

```ts
type GithubTrigger = {
  key: string;
  source: {
    provider: "github";
    version: 1;
    connectionId: string;
  };
  event:
    | "issues.opened"
    | "issues.closed"
    | "issues.labeled"
    | "pull_request.opened"
    | "pull_request.closed"
    | "pull_request.merged"
    | "pull_request.ready_for_review"
    | "pull_request.reopened"
    | "pull_request.synchronize"
    | "pull_request.labeled"
    | "pull_request.review_submitted"
    | "push"
    | "workflow_run.completed";
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

Provider and version form a discriminant. New providers add union members rather than weakening the entire schema to `Record<string, unknown>`. Provider-owned `config` remains appropriate for harness, model, and sandbox adapters where the core only passes validated settings through.

## Persistence Boundary

```ts
type StoredFactory = {
  _id: ObjectId;
  organizationId: ObjectId;
  status: "draft" | "active" | "disabled";
  revision: number;
  definition: FactoryDefinition; // portable and persistence-agnostic
  createdBy: ObjectId;
  editedBy: ObjectId;
  createdAt: Date;
  editedAt: Date;
};
```

`StoredFactory` belongs in `@ex-machina/db`, not `@ex-machina/factory`. The factory package exports only the portable definition and never exposes MongoDB `_id`, `ObjectId`, dates, audit fields, or persistence lifecycle metadata.

`schemaVersion` identifies the platform-owned definition shape. A database `revision` is unrelated: it increments on every successful mutation and supports optimistic concurrency (`update where _id + organizationId + revision`).

The server does not accept `_id`, `organizationId`, audit fields, `revision`, or a caller-selected schema version in create/update inputs. `defineFactory()` supplies the current schema version for code-authored definitions. Raw JSON/YAML imports must declare a supported version so a parser can select the correct migration and validator.

## External Connections

Connections are reusable and separate because one GitHub App installation can serve multiple factories.

```ts
type ExternalConnection = {
  _id: ObjectId;
  organizationId: ObjectId;
  provider: "github";
  version: 1;
  name: string;
  status: "pending" | "active" | "error" | "revoked";
  account: {
    externalId: string;
    login: string;
    displayName?: string;
  };
  auth: {
    strategy: "github_app";
    installationId: string;
  };
  createdBy: ObjectId;
  editedBy: ObjectId;
  createdAt: Date;
  editedAt: Date;
};
```

No access token, private key, webhook secret, LLM API key, or sandbox credential belongs in this document. It contains only secret-manager lookup metadata.

## Example As Code

```ts
import { defineFactory } from "@ex-machina/factory";

export default defineFactory({
  name: "Payments PR review",
  description: "Reviews pull requests for the payments services",
  executionDefaults: {
    model: { provider: "openai", modelId: "gpt-5" },
    harness: { type: "opencode", version: 1 },
    sandbox: { provider: "aws", version: 1, image: { id: "typescript" } },
  },
  repositories: [
    {
      key: "api",
      connectionId: "github-installation-1",
      source: { provider: "github", version: 1, repositoryId: "987654" },
      display: { owner: "acme", name: "payments-api", defaultBranch: "main" },
    },
  ],
  agents: [
    {
      key: "reviewer",
      name: "Payments reviewer",
      agentId: "library-agent-123",
      skillIds: ["library-skill-security", "library-skill-typescript"],
    },
  ],
  automations: [
    {
      key: "review-pr",
      name: "Review new pull requests",
      enabled: true,
      agentKey: "reviewer",
      repositoryKeys: ["api"],
      initialPrompt: "Review this pull request and post actionable findings.",
      triggers: [
        {
          key: "opened",
          source: { provider: "github", version: 1, connectionId: "github-installation-1" },
          event: "pull_request.opened",
          repositoryKeys: ["api"],
          filters: { baseBranches: ["main"], draft: false },
        },
        {
          key: "ready",
          source: { provider: "github", version: 1, connectionId: "github-installation-1" },
          event: "pull_request.ready_for_review",
          repositoryKeys: ["api"],
          filters: { baseBranches: ["main"] },
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
- Referenced connections, agents, and skills exist in the same organization.
- Connections are active and authorize every referenced external repository.
- Models, images, harnesses, and provider configs are currently supported.

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
  eventId: string;
  eventPayload: unknown;
  resolvedAgent: { id: ObjectId; editedAt: Date; content: string };
  resolvedSkills: Array<{ id: ObjectId; editedAt: Date; content: string }>;
  resolvedExecution: ExecutionDefinition & { sandboxImageDigest: string };
  repositoryRefs: Array<{ key: string; externalId: string; commit?: string }>;
};
```

This snapshot is mandatory because library references intentionally resolve to latest at run start.

## Indexes

```text
external_connections unique: { organizationId: 1, provider: 1, "account.externalId": 1 }
factories:                   { organizationId: 1, editedAt: -1 }
factories:                   { organizationId: 1, status: 1 }
factories dispatch:          { "definition.automations.triggers.source.connectionId": 1, status: 1 }
```

Webhook delivery deduplication requires a separate unique provider delivery index, not a field on the factory.

## Deliberately Deferred

- Integration installation flows and token minting.
- Webhook registration, normalization, delivery deduplication, and retry policy.
- Sandbox provider config beyond AWS v1 and image catalog IDs.
- Secret references and runtime permission policy.
- Immutable library revisions; live references plus run snapshots are the selected initial behavior.
- JSON Schema generation and config-as-code loading. The portable contract avoids coupling these to MongoDB.
