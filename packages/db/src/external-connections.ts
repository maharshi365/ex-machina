import type { Collection, Db, ObjectId, WithId } from 'mongodb';
import { toObjectId } from './types.js';
import type { WithStringId } from './types.js';

export const EXTERNAL_CONNECTIONS_COLLECTION = 'external_connections';

export type ExternalConnectionStatus = 'pending' | 'active' | 'suspended' | 'error' | 'revoked';

export type ExternalConnectionSchema = {
  organizationId: ObjectId;
  provider: 'github';
  version: 1;
  name: string;
  status: ExternalConnectionStatus;
  account: {
    externalId: string;
    login: string;
    type: 'user' | 'organization';
    avatarUrl?: string;
  };
  auth: {
    strategy: 'github_app';
    installationId: string;
  };
  grants: {
    repositorySelection: 'all' | 'selected';
    permissions: Record<string, 'read' | 'write'>;
    events: string[];
  };
  lastSyncedAt?: Date;
  lastError?: { code: string; message: string; at: Date };
  createdBy: ObjectId;
  editedBy: ObjectId;
  createdAt: Date;
  editedAt: Date;
};

export type ExternalConnection = WithId<ExternalConnectionSchema>;

type ExternalConnectionDTOBase = Omit<
  ExternalConnectionSchema,
  | 'organizationId'
  | 'createdBy'
  | 'editedBy'
  | 'createdAt'
  | 'editedAt'
  | 'lastSyncedAt'
  | 'lastError'
> & {
  organizationId: string;
  createdBy: string;
  editedBy: string;
  createdAt: string;
  editedAt: string;
  lastSyncedAt?: string;
  lastError?: { code: string; message: string; at: string };
};

export type ExternalConnectionDTO = WithStringId<ExternalConnectionDTOBase>;

export type UpsertVerifiedGitHubInstallationInput = Pick<
  ExternalConnectionSchema,
  'name' | 'account' | 'grants'
> & {
  installationId: string;
  status?: ExternalConnectionStatus;
  lastSyncedAt?: Date;
};

export class InstallationAlreadyBoundError extends Error {
  readonly code = 'INSTALLATION_ALREADY_BOUND';

  constructor(
    readonly installationId: string,
    options?: ErrorOptions
  ) {
    super(
      `GitHub installation ${installationId} is already bound to another organization`,
      options
    );
    this.name = 'InstallationAlreadyBoundError';
  }
}

export function toExternalConnectionDTO(connection: ExternalConnection): ExternalConnectionDTO {
  return {
    _id: connection._id.toHexString(),
    organizationId: connection.organizationId.toHexString(),
    provider: connection.provider,
    version: connection.version,
    name: connection.name,
    status: connection.status,
    account: connection.account,
    auth: connection.auth,
    grants: connection.grants,
    ...(connection.lastSyncedAt && { lastSyncedAt: connection.lastSyncedAt.toISOString() }),
    ...(connection.lastError && {
      lastError: { ...connection.lastError, at: connection.lastError.at.toISOString() },
    }),
    createdBy: connection.createdBy.toHexString(),
    editedBy: connection.editedBy.toHexString(),
    createdAt: connection.createdAt.toISOString(),
    editedAt: connection.editedAt.toISOString(),
  };
}

export function getExternalConnectionsCollection(db: Db): Collection<ExternalConnectionSchema> {
  return db.collection<ExternalConnectionSchema>(EXTERNAL_CONNECTIONS_COLLECTION);
}

export async function listExternalConnections(
  db: Db,
  organizationId: string | ObjectId
): Promise<ExternalConnectionDTO[]> {
  const connections = await getExternalConnectionsCollection(db)
    .find({ organizationId: toObjectId(organizationId) })
    .sort({ editedAt: -1 })
    .toArray();
  return connections.map(toExternalConnectionDTO);
}

export async function getExternalConnectionById(
  db: Db,
  connectionId: string | ObjectId,
  organizationId: string | ObjectId
): Promise<ExternalConnectionDTO | null> {
  const connection = await getExternalConnectionsCollection(db).findOne({
    _id: toObjectId(connectionId),
    organizationId: toObjectId(organizationId),
  });
  return connection ? toExternalConnectionDTO(connection) : null;
}

export async function revokeExternalConnection(
  db: Db,
  connectionId: string | ObjectId,
  ctx: { userId: string | ObjectId; organizationId: string | ObjectId }
): Promise<ExternalConnectionDTO | null> {
  const connection = await getExternalConnectionsCollection(db).findOneAndUpdate(
    {
      _id: toObjectId(connectionId),
      organizationId: toObjectId(ctx.organizationId),
    },
    {
      $set: {
        status: 'revoked',
        editedBy: toObjectId(ctx.userId),
        editedAt: new Date(),
      },
      $unset: { lastError: '' },
    },
    { returnDocument: 'after' }
  );
  return connection ? toExternalConnectionDTO(connection) : null;
}

export async function upsertVerifiedGitHubInstallation(
  db: Db,
  input: UpsertVerifiedGitHubInstallationInput,
  ctx: { userId: string | ObjectId; organizationId: string | ObjectId }
): Promise<ExternalConnectionDTO> {
  if (!input.installationId) throw new Error('installationId is required');

  const collection = getExternalConnectionsCollection(db);
  const organizationId = toObjectId(ctx.organizationId);
  const userId = toObjectId(ctx.userId);
  const installationFilter = {
    provider: 'github' as const,
    'auth.installationId': input.installationId,
  };
  const now = new Date();
  const update = {
    name: input.name,
    status: input.status ?? ('active' as const),
    account: input.account,
    grants: input.grants,
    ...(input.lastSyncedAt && { lastSyncedAt: input.lastSyncedAt }),
    editedBy: userId,
    editedAt: now,
  };

  const existing = await collection.findOne(installationFilter);
  if (existing) {
    if (!existing.organizationId.equals(organizationId)) {
      throw new InstallationAlreadyBoundError(input.installationId);
    }
    const updated = await collection.findOneAndUpdate(
      { _id: existing._id, organizationId },
      { $set: update, $unset: { lastError: '' } },
      { returnDocument: 'after' }
    );
    if (!updated) {
      throw new Error('External connection disappeared while updating');
    }
    return toExternalConnectionDTO(updated);
  }

  const doc: ExternalConnectionSchema = {
    organizationId,
    provider: 'github',
    version: 1,
    name: input.name,
    status: input.status ?? 'active',
    account: input.account,
    auth: { strategy: 'github_app', installationId: input.installationId },
    grants: input.grants,
    ...(input.lastSyncedAt && { lastSyncedAt: input.lastSyncedAt }),
    createdBy: userId,
    editedBy: userId,
    createdAt: now,
    editedAt: now,
  };

  try {
    const result = await collection.insertOne(doc);
    return toExternalConnectionDTO({ _id: result.insertedId, ...doc });
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 11000)) throw error;
    const raced = await collection.findOne(installationFilter);
    if (!raced || !raced.organizationId.equals(organizationId)) {
      throw new InstallationAlreadyBoundError(input.installationId, { cause: error });
    }
    const updated = await collection.findOneAndUpdate(
      { _id: raced._id, organizationId },
      { $set: update, $unset: { lastError: '' } },
      { returnDocument: 'after' }
    );
    if (!updated) {
      throw new Error('External connection disappeared while updating', { cause: error });
    }
    return toExternalConnectionDTO(updated);
  }
}

export function createExternalConnectionsRepository(db: Db, organizationId: string | ObjectId) {
  const orgId = toObjectId(organizationId);
  return {
    listExternalConnections: () => listExternalConnections(db, orgId),
    getExternalConnectionById: (connectionId: string | ObjectId) =>
      getExternalConnectionById(db, connectionId, orgId),
    revokeExternalConnection: (connectionId: string | ObjectId, userId: string | ObjectId) =>
      revokeExternalConnection(db, connectionId, { userId, organizationId: orgId }),
    upsertVerifiedGitHubInstallation: (
      input: UpsertVerifiedGitHubInstallationInput,
      userId: string | ObjectId
    ) => upsertVerifiedGitHubInstallation(db, input, { userId, organizationId: orgId }),
    collection: getExternalConnectionsCollection(db),
    db,
    organizationId: orgId,
  };
}
