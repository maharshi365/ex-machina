# Integration System Design

Status: proposed v0.1

This document defines the operational integration boundary that is deliberately
outside `FactoryDefinition`. GitHub is the first provider, but the boundary is
designed around provider capabilities rather than GitHub-specific application
services.

## Goals

- Connect an external account once and reuse it across factories in one
  organization.
- Receive, authenticate, persist, deduplicate, and retry webhook deliveries.
- Route one external event to zero or more active factory automations.
- Give a factory short-lived, least-privilege access to its declared
  repositories.
- Support source-control actions, initially checkout, branch push, and pull
  request creation.
- Preserve a compact normalized event and enough processing history to replay
  and diagnose a delivery.
- Add providers without adding provider credentials or SDK types to
  `@ex-machina/factory`.

## Non-goals

- Exactly-once execution. The system provides at-least-once processing and
  idempotent effects.
- Storing installation access tokens. They are short-lived runtime material.
- Allowing a factory definition to request permissions that an organization did
  not grant when connecting the provider.
- Registering a separate webhook for every factory or repository.

## Boundaries

```text
GitHub App
  |
  | one app-level webhook
  v
Webhook ingress -> verify + normalize -> durable delivery inbox -> factory dispatcher
                                                               -> lifecycle handler

FactoryDefinition --references--> connection + external repository IDs
Factory run        --uses-------> provider capability interfaces
                                      |
                                      v
                              short-lived GitHub token
```

`@ex-machina/factory` remains portable. Its existing `connectionId`, stable
`repositoryId`, provider/version discriminants, and normalized trigger names are
the correct integration-facing contract. It must not import MongoDB, Octokit,
webhook payload types, or credential types.

Operational records belong in `@ex-machina/db`. Provider protocol code belongs
in a new `@ex-machina/integrations` package. Start with
`src/providers/github`; split providers into separate packages only when their
dependency or release boundaries justify it. The web app owns HTTP routes,
session authorization, dependency construction, and worker startup.

## Provider Capabilities

Avoid one growing interface that every integration must implement. Register
small capabilities by provider and version:

```ts
type IntegrationKey = { provider: string; version: number };

type WebhookData = {
  actor?: { id: string; login: string };
  number?: number; // issue, pull request, or workflow run number
  branch?: string;
  baseBranch?: string;
  headSha?: string;
  beforeSha?: string;
  labels?: string[];
  draft?: boolean;
  workflow?: { id: string; name: string; conclusion?: string };
};

type NormalizedWebhook = {
  event: string; // e.g. "pull_request.opened"
  occurredAt?: string;
  installationId?: string;
  accountId?: string;
  repositoryId?: string;
  data: WebhookData;
};

interface WebhookProvider {
  verify(request: { headers: Headers; rawBody: Uint8Array }): Promise<boolean>;
  normalize(request: { headers: Headers; payload: unknown }): NormalizedWebhook;
}

interface ConnectionProvider {
  completeSetup(input: unknown): Promise<VerifiedExternalAccount>;
  syncResources(connection: ExternalConnection): Promise<ExternalResource[]>;
}

interface SourceControlProvider {
  createCredential(input: {
    connection: ExternalConnection;
    repositoryIds: string[];
    permissions: SourceControlPermissions;
  }): Promise<EphemeralCredential>;
  createPullRequest(input: CreatePullRequestInput): Promise<ExternalPullRequest>;
}
```

Application services select a capability from a registry using the
provider/version discriminant. Factory execution depends on
`SourceControlProvider`, not on a GitHub client.

## Persistence

All organization-owned queries must include `organizationId`, matching the
existing agent and skill repositories.

### External Connections

One connection represents one authorization grant, which for GitHub is one App
installation.

```ts
type ExternalConnection = {
  _id: ObjectId;
  organizationId: ObjectId;
  provider: "github";
  version: 1;
  name: string;
  status: "pending" | "active" | "suspended" | "error" | "revoked";
  account: {
    externalId: string; // stable GitHub account ID
    login: string; // display only; it can change
    type: "user" | "organization";
    avatarUrl?: string;
  };
  auth: {
    strategy: "github_app";
    installationId: string;
  };
  grants: {
    repositorySelection: "all" | "selected";
    permissions: Record<string, "read" | "write">;
    events: string[];
  };
  lastSyncedAt?: Date;
  lastError?: { code: string; message: string; at: Date };
  createdBy: ObjectId;
  editedBy: ObjectId;
  createdAt: Date;
  editedAt: Date;
};
```

The installation ID is authorization metadata, not a credential. The GitHub
App private key, client secret, and webhook secrets live in the deployment
secret manager. No access token is persisted.

An installation may be bound to only one platform organization. Enforce a
global unique index on `{ provider, "auth.installationId" }`; the existing
organization/account uniqueness alone would allow a cross-tenant duplicate.

### External Resources

Maintain a synchronized projection of resources authorized by a connection.
For GitHub v1 these are repositories.

```ts
type ExternalResource = {
  _id: ObjectId;
  organizationId: ObjectId;
  connectionId: ObjectId;
  provider: "github";
  kind: "repository";
  externalId: string; // GitHub repository ID; stable across rename/transfer
  status: "active" | "removed";
  locator: { owner: string; name: string; fullName: string };
  display: { url: string; defaultBranch: string; private: boolean };
  permissions?: { admin: boolean; push: boolean; pull: boolean };
  providerUpdatedAt?: Date;
  lastSyncedAt: Date;
};
```

Factories copy mutable display fields for portability but identify a repository
with `connectionId + source.repositoryId`. Factory activation verifies that an
active resource projection with that pair exists. Repository selection changes
mark removed resources inactive and prevent new runs; they do not rewrite saved
factory definitions or historical run snapshots.

### Installation Intents

An installation intent binds a browser flow to an authenticated user and
organization.

```ts
type InstallationIntent = {
  _id: ObjectId;
  provider: "github";
  organizationId: ObjectId;
  userId: ObjectId;
  installStateHash: string;
  oauthStateHash?: string;
  pkceVerifierCiphertext?: string;
  candidateInstallationId?: string;
  returnTo: string;
  status: "awaiting_setup" | "awaiting_oauth" | "processing" | "completed" | "failed" | "expired";
  createdAt: Date;
  expiresAt: Date;
};
```

Store only hashes of random state values. PKCE requires the original verifier at
token exchange, so encrypt it with an application key or keep it in a sealed,
HTTP-only, same-site browser cookie. Expire intents after 10 minutes, transition
each phase atomically, and validate `returnTo` against local paths to avoid open
redirects.

### Webhook Deliveries

The delivery is both the audit record and durable inbox.

```ts
type WebhookDelivery = {
  _id: ObjectId;
  source: {
    provider: "github";
    version: 1;
    deliveryId: string; // X-GitHub-Delivery
    event: string; // normalized event, e.g. pull_request.opened
    installationId?: string;
    accountId?: string;
    repositoryId?: string;
  };
  organizationId?: ObjectId; // absent until an installation is mapped
  connectionId?: ObjectId;
  receivedAt: Date;
  verifiedAt: Date;
  occurredAt?: Date;
  data: WebhookData;
  processing: {
    status: "pending" | "processing" | "processed" | "ignored" | "retry" | "dead_letter";
    attempts: number;
    availableAt: Date; // next retry time or processing lease expiry
    leaseExpiresAt?: Date;
    processedAt?: Date;
    outcome?: { reason: string };
    error?: { code: string; message: string; at: Date };
  };
  expiresAt?: Date;
};
```

GitHub v1 has exactly one canonical event per delivery. Do not wrap `data` in an
array or create a second event identifier. If a future provider sends a batch,
its adapter should create individually addressable delivery records or introduce
a new versioned storage shape rather than complicating every provider now.

The delivery's `source`, timestamps, and `data` are immutable after insertion;
only connection resolution, processing state, and retention metadata may change.

`data` is produced before insertion from an explicit allowlist. It contains only
stable identifiers and values needed for routing, trigger filters, and the run's
initial context. Do not retain the raw request body, full issue or PR bodies,
commit lists, diffs, comments, repository objects, installation objects, or
other provider fields. Agents fetch any additional GitHub state they need using
the run's authorized connection and repository references.

Enforce a maximum serialized delivery size well below MongoDB's 16 MB document
limit, initially 1 MB. Normalization must truncate bounded string/list fields or
reject its own output before insertion. Because the normalized shape is
platform-controlled and intentionally small, there is no GridFS or external
payload storage path. Retention remains an explicit product policy. Unmatched
deliveries can expire after 30 days. A delivery referenced by a run must live at
least as long as that run: run creation removes or extends `expiresAt` in the
same transaction as the run insert, and run deletion may restore an expiry only
when no other run references the delivery.

Do not persist every inbound header. Persist only provider identifiers and
useful diagnostics such as the user agent and hook ID. Never persist the
signature header as a credential substitute.

### Factory Trigger Routes

Do not query nested factory definitions for every delivery. Compile active
triggers into routing records when a factory is activated or updated.

```ts
type FactoryTriggerRoute = {
  _id: ObjectId;
  organizationId: ObjectId;
  provider: string;
  providerVersion: number;
  connectionId: ObjectId;
  resourceKind: "repository";
  resourceExternalId: string;
  event: string;
  factoryId: ObjectId;
  factoryRevision: number;
  automationKey: string;
  triggerKey: string;
  filters?: Record<string, unknown>;
  enabled: boolean;
  createdAt: Date;
};
```

Activation validates connections/resources and, in one MongoDB transaction,
stores an immutable factory revision, advances the current factory record, and
replaces routes for the new revision. Production MongoDB must therefore support
transactions (Atlas or a replica set). Disabling a factory disables or removes
its routes. A route always carries the revision it was compiled from, and the
dispatcher loads that immutable revision when creating the run snapshot. A
worker that read an old route can still finish safely because its referenced
revision remains available.

### Runs And External Actions

Create one run candidate per matched route. A unique key on
`{ webhookDeliveryId, factoryId, factoryRevision, automationKey, triggerKey }`
makes fan-out idempotent. The run references the canonical immutable delivery;
it does not copy the delivery's source or data into its snapshot. The run worker
loads the delivery by `webhookDeliveryId` when execution starts.

Runs are themselves a durable queue with pending, processing, retry, completed,
failed, and cancelled states plus `availableAt`, lease, and attempt fields. Run
workers atomically claim pending/retry records and reclaim expired leases. A
message broker may notify workers of run IDs, but recovery always scans durable
claimable runs. This closes the crash window between candidate insertion and
queue publication.

Record externally visible effects separately:

```ts
type ExternalAction = {
  _id: ObjectId;
  organizationId: ObjectId;
  runId: ObjectId;
  idempotencyKey: string; // e.g. "create-pr:payments-api"
  provider: "github";
  kind: "branch_push" | "pull_request_create" | "comment_create";
  status: "pending" | "processing" | "retry" | "succeeded" | "failed";
  requestSummary: Record<string, unknown>;
  result?: { externalId: string; url?: string };
  attempts: number;
  availableAt: Date;
  leaseExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
```

Use a unique `{ runId, idempotencyKey }` index. Workers claim actions atomically,
recover expired leases, and reconcile provider state before every retry. On
ambiguous provider timeouts, reconcile by deterministic branch/head identifiers
before retrying.

## Required Indexes

```text
external_connections unique: { provider: 1, "auth.installationId": 1 }
external_connections:        { organizationId: 1, status: 1, editedAt: -1 }
external_connections:        { organizationId: 1, provider: 1, "account.externalId": 1, status: 1 }
external_resources unique:   { connectionId: 1, kind: 1, externalId: 1 }
external_resources:          { organizationId: 1, connectionId: 1, status: 1 }
installation_intents unique: { provider: 1, installStateHash: 1 }
installation_intents unique: { provider: 1, oauthStateHash: 1 } (partial)
installation_intents TTL:    { expiresAt: 1 }
webhook_deliveries unique:   { "source.provider": 1, "source.deliveryId": 1 }
webhook worker:              { "processing.status": 1, "processing.availableAt": 1 }
webhook retention TTL:       { expiresAt: 1 }
factory_trigger_routes:      { provider: 1, connectionId: 1, resourceExternalId: 1,
                               event: 1, enabled: 1 }
factory_trigger_routes uniq: { factoryId: 1, factoryRevision: 1, automationKey: 1,
                               triggerKey: 1, resourceExternalId: 1 }
factory_runs unique:         { webhookDeliveryId: 1, factoryId: 1, factoryRevision: 1,
                               automationKey: 1, triggerKey: 1 }
factory_runs worker:         { status: 1, availableAt: 1 }
external_actions unique:     { runId: 1, idempotencyKey: 1 }
external_actions worker:     { status: 1, availableAt: 1 }
```

## GitHub App Registration

Register one GitHub App per deployment environment. Development, staging, and
production should not share webhook secrets, private keys, callbacks, or
installations.

Initial repository permissions:

- Metadata: read, implicit but list it in operational documentation.
- Contents: read and write, required to clone/fetch and push a branch.
- Pull requests: read and write, required to inspect and create PRs.
- Issues: read if the current `issues.*` triggers are enabled; write only when
  factories need issue or PR comments/labels.
- Actions: read if `workflow_run.completed` is enabled.
- Workflows: do not request initially. Add write only if factories are allowed
  to modify files under `.github/workflows`.

Subscribe the App webhook to:

- `installation` and `installation_repositories` for connection lifecycle and
  resource synchronization.
- `issues`, `pull_request`, `pull_request_review`, `push`, and `workflow_run` to
  cover the current factory trigger schema.

GitHub App permissions control both available APIs and subscribable events, so
permission additions require an installation owner to approve updated grants.
Connections remain non-active for the new capability until that approval is
observed.

Deployment secrets:

```text
GITHUB_APP_ID
GITHUB_APP_CLIENT_ID
GITHUB_APP_CLIENT_SECRET
GITHUB_APP_PRIVATE_KEY (prefer a secret-manager reference)
GITHUB_WEBHOOK_SECRET_CURRENT
GITHUB_WEBHOOK_SECRET_PREVIOUS (only during rotation)
GITHUB_APP_SLUG
```

Use the current webhook secret first and the previous secret only during a
bounded rotation window. Compare HMAC values in constant time.

## Secure Installation Flow

GitHub warns that the `installation_id` sent to a setup URL can be spoofed. Do
not bind an installation merely because it appears in callback query params.
Use an explicit setup-then-OAuth flow; do not enable GitHub's automatic
"Request user authorization during installation" option because it removes the
setup URL and prevents the application from initiating PKCE with its own state.

1. An authenticated organization owner calls
   `POST /api/integrations/github/install`.
2. The server checks platform organization permission, creates an
   `InstallationIntent`, and redirects to
   `https://github.com/apps/{slug}/installations/new?state={random}`.
3. GitHub returns to `/api/integrations/github/setup`. Validate the install
   state and current platform session, record the untrusted candidate
   `installation_id`, generate a new OAuth state and PKCE pair, transition to
   `awaiting_oauth`, and redirect to GitHub's user authorization endpoint.
4. GitHub returns the code to `/api/integrations/github/oauth/callback`.
   Validate the OAuth state and same platform session, atomically transition the
   intent to `processing`, and exchange the one-time code and PKCE verifier for
   a GitHub user access token.
5. Use that user token to call GitHub's user-installations APIs and verify the
   candidate installation is accessible to the user who completed the flow.
   Fetch the installation itself using App authentication as a second check.
6. Discard the user token. It is not needed for normal operation and must not be
   stored.
7. Upsert the connection with the verified account and grant snapshot. Reject a
   global installation-ID conflict rather than silently transferring it between
   platform organizations.
8. Mint an installation token in memory, list accessible repositories, and
   upsert `external_resources`.
9. Mark the connection active and redirect to the validated local `returnTo`.

Installation webhooks can arrive before the browser callback. Persist them even
when no connection is known, then reconcile them after the callback creates the
connection. This avoids ordering assumptions between GitHub's webhook and
browser delivery paths. Connection creation requeues ignored lifecycle
deliveries for that installation ID.

Lifecycle handling:

- `installation.created` or new permission approval: refresh grant and resource
  projections.
- `installation_repositories.added/removed`: update only affected resources,
  then schedule a full reconciliation.
- `installation.suspend`: set `suspended`; stop new runs and token minting.
- `installation.unsuspend`: refresh and restore `active` if grants are valid.
- `installation.deleted`: set `revoked`, mark resources removed, and disable
  routing. Preserve audit records.

Webhook order is not authoritative. A transition toward `active`, including
unsuspend and repository add, must first fetch current installation state and
accessible repositories with App authentication. A `revoked` tombstone is not
reversed by an older delivery; only a new, user-verified installation flow can
replace it. Periodic reconciliation repairs missed or reordered lifecycle
events.

## Webhook Ingress And Processing

The public endpoint is `POST /api/webhooks/github`. It has no platform session
authentication; the webhook HMAC is its authentication.

Request path:

1. Read the raw bytes once and enforce content type/body limits.
2. Validate `X-Hub-Signature-256` over those exact bytes before JSON parsing.
3. Require `X-GitHub-Delivery` and `X-GitHub-Event`.
4. Parse and normalize JSON into the canonical delivery source and compact
   `data` allowlist.
5. Check the normalized delivery's serialized size and discard the raw bytes and
   parsed provider object.
6. Insert a pending delivery using the provider delivery ID unique index.
7. If it is a duplicate, return success without enqueueing another delivery.
8. Return `202` promptly. Never run a factory or call GitHub on the request path.

Invalid signatures return `401` and are not persisted with their untrusted
payload. Malformed authenticated payloads may be persisted as dead-letter
metadata with `data: {}`, but the provider payload is still discarded. Avoid
logging payloads because source code, issue text, and user data can be sensitive.

The delivery collection itself can be the initial queue. Workers claim records
with atomic `findOneAndUpdate`, a lease, attempt count, exponential backoff, and
jitter. A production queue can later carry only delivery IDs; MongoDB remains
the source of truth. Retry transient provider/database failures, dead-letter
permanent schema errors, and expose an operator replay command that resets a
delivery to pending without changing its identity.

## Event Normalization And Routing

During ingress, the GitHub adapter converts transport names into the existing
factory event names and selects only the normalized fields defined above.
Examples:

```text
issues + opened                    -> issues.opened
pull_request + opened              -> pull_request.opened
pull_request + closed + merged     -> pull_request.merged
pull_request + closed + not merged -> pull_request.closed
pull_request_review + submitted    -> pull_request.review_submitted
push                               -> push
workflow_run + completed           -> workflow_run.completed
```

`pull_request.closed` means closed without merge. A merged delivery emits only
`pull_request.merged`; emitting both would unexpectedly start two runs when a
factory declares both triggers.

For each normalized delivery:

1. Resolve the connection from the signed installation ID.
2. Handle installation lifecycle events even though they are not factory
   triggers.
3. Query enabled routes by provider, connection, repository ID, and event.
4. Evaluate trigger filters with AND semantics across filter categories and OR
   semantics within one category, as specified by `FactoryDefinition`.
5. Insert idempotent, claimable run candidates; optionally publish their IDs as
   wake-up notifications.
6. Mark the delivery processed after all candidates are durably recorded.

Branches, labels, actors, draft state, workflow name, and conclusion are retained
only when needed by supported filters. `paths` requires provider enrichment: PR
webhooks do not contain the complete changed-file set, and the normalized push
event deliberately omits commit lists. The dispatcher fetches changed
files/compare data with an installation client only when a candidate route has a
path filter and retries on transient API failure. It does not persist that file
list on the delivery. Agents independently fetch the repository context needed
for their work. Path patterns use minimatch-style globs with "any changed path
matches" semantics.

Factory validation must reject filters that cannot apply to an event. The v1
compatibility matrix is:

```text
issues.*                       labels, actors
pull_request.*                 baseBranches, labels, actors, paths, draft
pull_request.review_submitted  baseBranches, labels, actors, paths, draft
push                           branches, actors, paths
workflow_run.completed         branches, actors, workflowNames, conclusions
```

`branches` means the pushed/workflow head branch; `baseBranches` means the PR
base branch. A supported filter whose source field is absent does not match.
Unsupported event/filter combinations fail factory activation rather than being
silently ignored.

Events for unknown installations, removed repositories, unsupported actions,
or deliveries with no routes are `ignored`, not failed. Store a machine-readable
reason.

## Runtime GitHub Access

Use installation authentication for all automated work. An App JWT is used only
to mint an installation access token. Installation tokens expire after one hour;
mint them just in time and restrict them to the run's declared repository IDs
and required permissions.

Tokens must never enter a factory definition, run snapshot, database document,
prompt, or log. Pass them to the sandbox through an ephemeral secret channel.
For Git over HTTPS, prefer a credential helper or transient HTTP authorization
header over embedding the token in a clone URL, which is easily leaked in
process output and Git config. Revoke sandbox access at run completion where
possible and let the short token lifetime provide the final bound.

Before minting a token, the run service rechecks:

- Connection is active and belongs to the run organization.
- Every requested repository appears in the run snapshot and is still active.
- The factory automation declares every writable repository key.
- Requested permissions do not exceed the operation or installation grant.

## Pull Request Creation

Use a deterministic branch such as
`ex-machina/{factoryId}/{runId}` and an `ExternalAction` idempotency key. The
basic operation is:

1. Resolve the target repository from the run snapshot and reauthorize it.
2. Mint a repository-scoped installation token with Contents write and Pull
   requests write.
3. Fetch/checkout the requested base commit, make changes, and push the
   deterministic branch.
4. Persist the successful branch push action and resulting commit SHA.
5. Create the PR with the deterministic head and requested base.
6. Persist the PR number, node ID, and URL before reporting success.

On retry, first find an existing PR by head/base across all PR states, including
closed PRs, and inspect the deterministic branch. Do not create a second PR
after a timeout with an unknown result. A repository should optionally require
human review through branch protection; the App should not request bypass
permissions in the initial version.

Repositories listed in an automation trigger and repositories writable by that
automation are intentionally different sets. Trigger routing uses
`trigger.repositoryKeys`; credentials and PR authorization use the
automation's `repositoryKeys`.

## Application API

Authenticated organization APIs:

```text
POST   /api/integrations/github/install
GET    /api/integrations/github/setup
GET    /api/integrations/github/oauth/callback
GET    /api/integrations/connections
GET    /api/integrations/connections/:id/resources
POST   /api/integrations/connections/:id/sync
DELETE /api/integrations/connections/:id
```

The delete operation revokes the platform binding and attempts to direct the
user to GitHub to uninstall or revoke the App; deleting a local record alone
does not uninstall a GitHub App. Prefer status transitions and retained audit
records over hard deletion.

Public provider ingress:

```text
POST /api/webhooks/github
```

Server functions and route handlers must derive organization/user identity from
the Better Auth session. They must never accept `organizationId` or `userId` as
trusted mutation fields. Require an organization owner/admin role for install,
resync, and disconnect operations.

## GitHub References

- [About the setup URL](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-setup-url)
- [Generating a user access token for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
- [Generating an installation access token](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
- [Choosing permissions for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app)
- [Webhook events and payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads)
