import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { MongoClient, ObjectId } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';

import {
  createSecret,
  deleteSecret,
  ensureSecretsIndexes,
  getEncryptedSecret,
  getSecretById,
  getSecrets,
  rotateSecret,
  SECRETS_COLLECTION,
} from './secrets.js';

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: ReturnType<MongoClient['db']>;

const orgA = new ObjectId();
const orgB = new ObjectId();
const userA = new ObjectId();
const userB = new ObjectId();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  db = client.db('secrets-test');
});

afterAll(async () => {
  await client.close();
  await mongod.stop();
});

beforeEach(async () => {
  await db
    .collection(SECRETS_COLLECTION)
    .drop()
    .catch(() => undefined);
  await ensureSecretsIndexes(db);
});

describe('secrets', () => {
  test('returns metadata without encrypted values', async () => {
    const secret = await createSecret(
      db,
      { name: 'HARNESS_API_KEY', description: 'Harness access', encryptedValue: 'ciphertext' },
      { userId: userA, organizationId: orgA }
    );

    expect(secret.name).toBe('HARNESS_API_KEY');
    expect('encryptedValue' in secret).toBe(false);
    expect(JSON.stringify(secret)).not.toContain('ciphertext');
    expect(await getEncryptedSecret(db, 'HARNESS_API_KEY', orgA)).toBe('ciphertext');
  });

  test('isolates list, lookup, rotation, and deletion by organization', async () => {
    const secret = await createSecret(
      db,
      { name: 'API_KEY', description: '', encryptedValue: 'v1.old' },
      { userId: userA, organizationId: orgA }
    );

    expect(await getSecrets(db, orgB)).toEqual([]);
    expect(await getSecretById(db, secret._id, orgB)).toBeNull();
    expect(
      await rotateSecret(db, secret._id, 'v1.attack', { userId: userB, organizationId: orgB })
    ).toBeNull();
    expect(await deleteSecret(db, secret._id, orgB)).toBe(false);
    expect(await getEncryptedSecret(db, 'API_KEY', orgA)).toBe('v1.old');
  });

  test('rotates only the encrypted value and edit metadata', async () => {
    const secret = await createSecret(
      db,
      { name: 'API_KEY', description: 'Production', encryptedValue: 'v1.old' },
      { userId: userA, organizationId: orgA }
    );
    const updated = await rotateSecret(db, secret._id, 'v1.new', {
      userId: userB,
      organizationId: orgA,
    });

    expect(updated?.name).toBe(secret.name);
    expect(updated?.description).toBe(secret.description);
    expect(updated?.editedBy).toBe(userB.toHexString());
    expect(await getEncryptedSecret(db, 'API_KEY', orgA)).toBe('v1.new');
  });

  test('enforces unique names within an organization', async () => {
    const input = { name: 'API_KEY', description: '', encryptedValue: 'v1.value' };
    await createSecret(db, input, { userId: userA, organizationId: orgA });

    await expect(createSecret(db, input, { userId: userA, organizationId: orgA })).rejects.toThrow(
      'A secret named API_KEY already exists'
    );
    await expect(
      createSecret(db, input, { userId: userB, organizationId: orgB })
    ).resolves.toMatchObject({ name: 'API_KEY' });
  });
});
