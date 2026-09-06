import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { MongoClient, ObjectId } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  EXTERNAL_CONNECTIONS_COLLECTION,
  InstallationAlreadyBoundError,
  getExternalConnectionById,
  listExternalConnections,
  revokeExternalConnection,
  upsertVerifiedGitHubInstallation,
} from './external-connections.js';
import {
  EXTERNAL_RESOURCES_COLLECTION,
  listExternalResources,
  markExternalResourcesRemoved,
  synchronizeGitHubRepositoryResources,
} from './external-resources.js';
import {
  INSTALLATION_INTENTS_COLLECTION,
  claimInstallationOAuthState,
  consumeInstallationSetupState,
  createInstallationIntent,
  markInstallationIntentComplete,
} from './installation-intents.js';
import { ensureIntegrationIndexes } from './integration-indexes.js';

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: ReturnType<MongoClient['db']>;

const orgA = new ObjectId();
const orgB = new ObjectId();
const userA = new ObjectId();
const userB = new ObjectId();
const connectionInput = {
  installationId: '12345',
  name: 'octo-org',
  account: { externalId: '99', login: 'octo-org', type: 'organization' as const },
  grants: {
    repositorySelection: 'selected' as const,
    permissions: { contents: 'write' as const },
    events: ['push'],
  },
};

function repository(externalId: string, name: string) {
  return {
    externalId,
    locator: { owner: 'octo-org', name, fullName: `octo-org/${name}` },
    display: {
      url: `https://github.com/octo-org/${name}`,
      defaultBranch: 'main',
      private: true,
    },
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  db = client.db('integrations-test');
  await ensureIntegrationIndexes(db);
});

afterAll(async () => {
  await client.close();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([
    db.collection(EXTERNAL_CONNECTIONS_COLLECTION).deleteMany({}),
    db.collection(EXTERNAL_RESOURCES_COLLECTION).deleteMany({}),
    db.collection(INSTALLATION_INTENTS_COLLECTION).deleteMany({}),
  ]);
});

describe('GitHub integration persistence', () => {
  test('consumes setup and OAuth states once for the same user and organization', async () => {
    const ctx = { organizationId: orgA, userId: userA };
    const created = await createInstallationIntent(
      db,
      {
        installStateHash: 'install-hash',
        returnTo: '/settings/integrations',
        expiresAt: new Date(Date.now() + 60_000),
      },
      ctx
    );
    expect(created.status).toBe('awaiting_setup');
    expect(
      await consumeInstallationSetupState(
        db,
        'install-hash',
        {
          candidateInstallationId: '12345',
          oauthStateHash: 'oauth-hash',
          pkceVerifierCiphertext: 'encrypted-verifier',
        },
        { organizationId: orgA, userId: userB }
      )
    ).toBeNull();

    const consumed = await consumeInstallationSetupState(
      db,
      'install-hash',
      {
        candidateInstallationId: '12345',
        oauthStateHash: 'oauth-hash',
        pkceVerifierCiphertext: 'encrypted-verifier',
      },
      ctx
    );
    expect(consumed?.status).toBe('awaiting_oauth');
    expect(
      await consumeInstallationSetupState(
        db,
        'install-hash',
        {
          candidateInstallationId: '12345',
          oauthStateHash: 'other-hash',
          pkceVerifierCiphertext: 'other-verifier',
        },
        ctx
      )
    ).toBeNull();

    const claimed = await claimInstallationOAuthState(db, 'oauth-hash', ctx);
    expect(claimed?.status).toBe('processing');
    expect(claimed?.pkceVerifierCiphertext).toBe('encrypted-verifier');
    expect(await claimInstallationOAuthState(db, 'oauth-hash', ctx)).toBeNull();
    expect((await markInstallationIntentComplete(db, created._id, ctx))?.status).toBe('completed');
  });

  test('upserts an installation for its organization and rejects cross-org binding', async () => {
    const first = await upsertVerifiedGitHubInstallation(db, connectionInput, {
      organizationId: orgA,
      userId: userA,
    });
    const updated = await upsertVerifiedGitHubInstallation(
      db,
      { ...connectionInput, name: 'renamed' },
      { organizationId: orgA, userId: userB }
    );
    expect(updated._id).toBe(first._id);
    expect(updated.name).toBe('renamed');
    expect(updated.editedBy).toBe(userB.toHexString());
    expect((await listExternalConnections(db, orgA)).length).toBe(1);
    expect((await listExternalConnections(db, orgB)).length).toBe(0);

    await expect(
      upsertVerifiedGitHubInstallation(db, connectionInput, {
        organizationId: orgB,
        userId: userB,
      })
    ).rejects.toBeInstanceOf(InstallationAlreadyBoundError);
  });

  test('synchronizes repositories and marks missing resources removed', async () => {
    const connection = await upsertVerifiedGitHubInstallation(db, connectionInput, {
      organizationId: orgA,
      userId: userA,
    });
    await synchronizeGitHubRepositoryResources(
      db,
      connection._id,
      [repository('1', 'one'), repository('2', 'two')],
      orgA
    );
    const reconciled = await synchronizeGitHubRepositoryResources(
      db,
      connection._id,
      [repository('2', 'two-renamed')],
      orgA
    );
    expect(reconciled.find((resource) => resource.externalId === '1')?.status).toBe('removed');
    expect(reconciled.find((resource) => resource.externalId === '2')?.locator.name).toBe(
      'two-renamed'
    );
    expect(await listExternalResources(db, orgB, connection._id)).toEqual([]);
    await expect(
      synchronizeGitHubRepositoryResources(db, connection._id, [], orgB)
    ).rejects.toThrow('not found for organization');
  });

  test('revokes a connection and its resources within the organization', async () => {
    const connection = await upsertVerifiedGitHubInstallation(db, connectionInput, {
      organizationId: orgA,
      userId: userA,
    });
    await synchronizeGitHubRepositoryResources(db, connection._id, [repository('1', 'one')], orgA);

    expect(await getExternalConnectionById(db, connection._id, orgB)).toBeNull();
    expect(
      await revokeExternalConnection(db, connection._id, {
        organizationId: orgB,
        userId: userB,
      })
    ).toBeNull();
    expect(await markExternalResourcesRemoved(db, orgB, connection._id)).toBe(0);

    const revoked = await revokeExternalConnection(db, connection._id, {
      organizationId: orgA,
      userId: userB,
    });
    expect(revoked?.status).toBe('revoked');
    expect(revoked?.editedBy).toBe(userB.toHexString());
    expect(await markExternalResourcesRemoved(db, orgA, connection._id)).toBe(1);
    expect((await listExternalResources(db, orgA, connection._id))[0]?.status).toBe('removed');
  });

  test('creates the required integration indexes', async () => {
    const connectionIndexes = await db.collection(EXTERNAL_CONNECTIONS_COLLECTION).indexes();
    const resourceIndexes = await db.collection(EXTERNAL_RESOURCES_COLLECTION).indexes();
    const intentIndexes = await db.collection(INSTALLATION_INTENTS_COLLECTION).indexes();

    expect(
      connectionIndexes.find((index) => index.name === 'provider_installation_unique')?.unique
    ).toBe(true);
    expect(
      resourceIndexes.find((index) => index.name === 'connection_kind_external_unique')?.unique
    ).toBe(true);
    expect(
      intentIndexes.find((index) => index.name === 'provider_oauth_state_unique')
        ?.partialFilterExpression
    ).toEqual({
      oauthStateHash: { $type: 'string' },
    });
    expect(
      intentIndexes.find((index) => index.name === 'intent_expiry_ttl')?.expireAfterSeconds
    ).toBe(0);
  });
});
