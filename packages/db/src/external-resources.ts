import type { Collection, Db, ObjectId, WithId } from 'mongodb';
import { getExternalConnectionsCollection } from './external-connections.js';
import { toObjectId } from './types.js';
import type { WithStringId } from './types.js';

export const EXTERNAL_RESOURCES_COLLECTION = 'external_resources';

export type ExternalResourceSchema = {
  organizationId: ObjectId;
  connectionId: ObjectId;
  provider: 'github';
  kind: 'repository';
  externalId: string;
  status: 'active' | 'removed';
  locator: { owner: string; name: string; fullName: string };
  display: { url: string; defaultBranch: string; private: boolean };
  permissions?: { admin: boolean; push: boolean; pull: boolean };
  providerUpdatedAt?: Date;
  lastSyncedAt: Date;
};

export type ExternalResource = WithId<ExternalResourceSchema>;

type ExternalResourceDTOBase = Omit<
  ExternalResourceSchema,
  'organizationId' | 'connectionId' | 'providerUpdatedAt' | 'lastSyncedAt'
> & {
  organizationId: string;
  connectionId: string;
  providerUpdatedAt?: string;
  lastSyncedAt: string;
};

export type ExternalResourceDTO = WithStringId<ExternalResourceDTOBase>;

export type GitHubRepositoryResourceInput = Pick<
  ExternalResourceSchema,
  'externalId' | 'locator' | 'display' | 'permissions' | 'providerUpdatedAt'
>;

export function toExternalResourceDTO(resource: ExternalResource): ExternalResourceDTO {
  return {
    _id: resource._id.toHexString(),
    organizationId: resource.organizationId.toHexString(),
    connectionId: resource.connectionId.toHexString(),
    provider: resource.provider,
    kind: resource.kind,
    externalId: resource.externalId,
    status: resource.status,
    locator: resource.locator,
    display: resource.display,
    ...(resource.permissions && { permissions: resource.permissions }),
    ...(resource.providerUpdatedAt && {
      providerUpdatedAt: resource.providerUpdatedAt.toISOString(),
    }),
    lastSyncedAt: resource.lastSyncedAt.toISOString(),
  };
}

export function getExternalResourcesCollection(db: Db): Collection<ExternalResourceSchema> {
  return db.collection<ExternalResourceSchema>(EXTERNAL_RESOURCES_COLLECTION);
}

export async function listExternalResources(
  db: Db,
  organizationId: string | ObjectId,
  connectionId: string | ObjectId
): Promise<ExternalResourceDTO[]> {
  const resources = await getExternalResourcesCollection(db)
    .find({
      organizationId: toObjectId(organizationId),
      connectionId: toObjectId(connectionId),
    })
    .sort({ 'locator.fullName': 1 })
    .toArray();
  return resources.map(toExternalResourceDTO);
}

export async function synchronizeGitHubRepositoryResources(
  db: Db,
  connectionId: string | ObjectId,
  resources: GitHubRepositoryResourceInput[],
  organizationId: string | ObjectId,
  syncedAt = new Date()
): Promise<ExternalResourceDTO[]> {
  const orgId = toObjectId(organizationId);
  const connId = toObjectId(connectionId);
  const connection = await getExternalConnectionsCollection(db).findOne({
    _id: connId,
    organizationId: orgId,
    provider: 'github',
  });
  if (!connection) throw new Error('External connection not found for organization');

  const collection = getExternalResourcesCollection(db);
  const externalIds = resources.map((resource) => resource.externalId);
  if (new Set(externalIds).size !== externalIds.length) {
    throw new Error('Repository resource externalIds must be unique');
  }

  if (resources.length > 0) {
    await collection.bulkWrite(
      resources.map((resource) => ({
        updateOne: {
          filter: {
            organizationId: orgId,
            connectionId: connId,
            kind: 'repository' as const,
            externalId: resource.externalId,
          },
          update: {
            $set: {
              organizationId: orgId,
              provider: 'github' as const,
              status: 'active' as const,
              locator: resource.locator,
              display: resource.display,
              ...(resource.permissions && { permissions: resource.permissions }),
              ...(resource.providerUpdatedAt && { providerUpdatedAt: resource.providerUpdatedAt }),
              lastSyncedAt: syncedAt,
            },
            $setOnInsert: {
              connectionId: connId,
              kind: 'repository' as const,
              externalId: resource.externalId,
            },
            ...((!resource.permissions || !resource.providerUpdatedAt) && {
              $unset: {
                ...(!resource.permissions && { permissions: '' }),
                ...(!resource.providerUpdatedAt && { providerUpdatedAt: '' }),
              },
            }),
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );
  }

  await collection.updateMany(
    {
      organizationId: orgId,
      connectionId: connId,
      kind: 'repository',
      externalId: { $nin: externalIds },
    },
    { $set: { status: 'removed', lastSyncedAt: syncedAt } }
  );
  return listExternalResources(db, orgId, connId);
}

export async function markExternalResourcesRemoved(
  db: Db,
  organizationId: string | ObjectId,
  connectionId: string | ObjectId,
  removedAt = new Date()
): Promise<number> {
  const result = await getExternalResourcesCollection(db).updateMany(
    {
      organizationId: toObjectId(organizationId),
      connectionId: toObjectId(connectionId),
      status: 'active',
    },
    { $set: { status: 'removed', lastSyncedAt: removedAt } }
  );
  return result.modifiedCount;
}

export function createExternalResourcesRepository(db: Db, organizationId: string | ObjectId) {
  const orgId = toObjectId(organizationId);
  return {
    listExternalResources: (connectionId: string | ObjectId) =>
      listExternalResources(db, orgId, connectionId),
    synchronizeGitHubRepositoryResources: (
      connectionId: string | ObjectId,
      resources: GitHubRepositoryResourceInput[],
      syncedAt?: Date
    ) => synchronizeGitHubRepositoryResources(db, connectionId, resources, orgId, syncedAt),
    markExternalResourcesRemoved: (connectionId: string | ObjectId, removedAt?: Date) =>
      markExternalResourcesRemoved(db, orgId, connectionId, removedAt),
    collection: getExternalResourcesCollection(db),
    db,
    organizationId: orgId,
  };
}
