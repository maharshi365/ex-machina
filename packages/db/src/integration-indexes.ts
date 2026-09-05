import type { Db } from "mongodb";
import { getExternalConnectionsCollection } from "./external-connections.js";
import { getExternalResourcesCollection } from "./external-resources.js";
import { getInstallationIntentsCollection } from "./installation-intents.js";

export async function ensureIntegrationIndexes(db: Db): Promise<void> {
  await Promise.all([
    getExternalConnectionsCollection(db).createIndexes([
      {
        key: { provider: 1, "auth.installationId": 1 },
        name: "provider_installation_unique",
        unique: true,
      },
      {
        key: { organizationId: 1, status: 1, editedAt: -1 },
        name: "organization_status_edited",
      },
      {
        key: { organizationId: 1, provider: 1, "account.externalId": 1, status: 1 },
        name: "organization_provider_account_status",
      },
    ]),
    getExternalResourcesCollection(db).createIndexes([
      {
        key: { connectionId: 1, kind: 1, externalId: 1 },
        name: "connection_kind_external_unique",
        unique: true,
      },
      {
        key: { organizationId: 1, connectionId: 1, status: 1 },
        name: "organization_connection_status",
      },
    ]),
    getInstallationIntentsCollection(db).createIndexes([
      {
        key: { provider: 1, installStateHash: 1 },
        name: "provider_install_state_unique",
        unique: true,
      },
      {
        key: { provider: 1, oauthStateHash: 1 },
        name: "provider_oauth_state_unique",
        unique: true,
        partialFilterExpression: { oauthStateHash: { $type: "string" } },
      },
      { key: { expiresAt: 1 }, name: "intent_expiry_ttl", expireAfterSeconds: 0 },
    ]),
  ]);
}
