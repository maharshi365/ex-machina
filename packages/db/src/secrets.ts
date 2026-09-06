import type { Collection, Db, ObjectId, WithId } from 'mongodb';
import { MongoServerError } from 'mongodb';
import { toObjectId } from './types.js';
import type { WithStringId } from './types.js';

export const SECRETS_COLLECTION = 'secrets';

export type SecretSchema = {
  name: string;
  description: string;
  encryptedValue: string;
  organizationId: ObjectId;
  createdBy: ObjectId;
  editedBy: ObjectId;
  createdAt: Date;
  editedAt: Date;
};

export type Secret = WithId<SecretSchema>;

type SecretDTOBase = {
  name: string;
  description: string;
  organizationId: string;
  createdBy: string;
  editedBy: string;
  createdAt: string;
  editedAt: string;
};

/** Metadata-only representation. Ciphertext and plaintext never cross this boundary. */
export type SecretDTO = WithStringId<SecretDTOBase>;

export type CreateSecretInput = {
  name: string;
  description: string;
  encryptedValue: string;
};

function getCollection(db: Db): Collection<SecretSchema> {
  return db.collection<SecretSchema>(SECRETS_COLLECTION);
}

function toDTO(secret: Secret): SecretDTO {
  return {
    _id: secret._id.toHexString(),
    name: secret.name,
    description: secret.description,
    organizationId: secret.organizationId.toHexString(),
    createdBy: secret.createdBy.toHexString(),
    editedBy: secret.editedBy.toHexString(),
    createdAt: secret.createdAt.toISOString(),
    editedAt: secret.editedAt.toISOString(),
  };
}

export async function ensureSecretsIndexes(db: Db): Promise<void> {
  await getCollection(db).createIndex(
    { organizationId: 1, name: 1 },
    { unique: true, name: 'organization_secret_name_unique' }
  );
}

export async function getSecrets(db: Db, organizationId: string | ObjectId): Promise<SecretDTO[]> {
  const secrets = await getCollection(db)
    .find({ organizationId: toObjectId(organizationId) })
    .sort({ name: 1 })
    .toArray();
  return secrets.map(toDTO);
}

export async function getSecretById(
  db: Db,
  id: string | ObjectId,
  organizationId: string | ObjectId
): Promise<SecretDTO | null> {
  const secret = await getCollection(db).findOne({
    _id: toObjectId(id),
    organizationId: toObjectId(organizationId),
  });
  return secret ? toDTO(secret) : null;
}

export async function createSecret(
  db: Db,
  input: CreateSecretInput,
  ctx: { userId: string | ObjectId; organizationId: string | ObjectId }
): Promise<SecretDTO> {
  const now = new Date();
  const userId = toObjectId(ctx.userId);
  const doc: SecretSchema = {
    ...input,
    organizationId: toObjectId(ctx.organizationId),
    createdBy: userId,
    editedBy: userId,
    createdAt: now,
    editedAt: now,
  };

  try {
    const result = await getCollection(db).insertOne(doc);
    return toDTO({ _id: result.insertedId, ...doc });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new Error(`A secret named ${input.name} already exists`, { cause: error });
    }
    throw error;
  }
}

export async function rotateSecret(
  db: Db,
  id: string | ObjectId,
  encryptedValue: string,
  ctx: { userId: string | ObjectId; organizationId: string | ObjectId }
): Promise<SecretDTO | null> {
  const result = await getCollection(db).findOneAndUpdate(
    { _id: toObjectId(id), organizationId: toObjectId(ctx.organizationId) },
    {
      $set: {
        encryptedValue,
        editedBy: toObjectId(ctx.userId),
        editedAt: new Date(),
      },
    },
    { returnDocument: 'after' }
  );
  return result ? toDTO(result) : null;
}

export async function deleteSecret(
  db: Db,
  id: string | ObjectId,
  organizationId: string | ObjectId
): Promise<boolean> {
  const result = await getCollection(db).deleteOne({
    _id: toObjectId(id),
    organizationId: toObjectId(organizationId),
  });
  return result.deletedCount === 1;
}

export async function getEncryptedSecret(
  db: Db,
  name: string,
  organizationId: string | ObjectId
): Promise<string | null> {
  const secret = await getCollection(db).findOne(
    { name, organizationId: toObjectId(organizationId) },
    { projection: { encryptedValue: 1 } }
  );
  return secret?.encryptedValue ?? null;
}
