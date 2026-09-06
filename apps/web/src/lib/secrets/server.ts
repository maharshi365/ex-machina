import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import {
  createSecret as dbCreateSecret,
  deleteSecret as dbDeleteSecret,
  ensureSecretsIndexes,
  getEncryptedSecret,
  getSecretById,
  getSecrets,
  rotateSecret as dbRotateSecret,
} from '@ex-machina/db';

import { getDb } from '@/lib/db/client';
import { env } from '@/lib/env/server';
import { requireIntegrationSession } from '@/lib/integrations/session';

import { decryptSecretValue, encryptSecretValue } from './crypto';

const SECRET_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/;

function encryptionSecret(): string {
  if (!env.SECRET_ENCRYPTION_KEY) {
    throw new Error('Secret storage is not configured');
  }
  return env.SECRET_ENCRYPTION_KEY;
}

function validateName(name: string): string {
  const normalized = name.trim().toUpperCase();
  if (normalized.length < 2 || normalized.length > 64 || !SECRET_NAME_PATTERN.test(normalized)) {
    throw new Error(
      'Name must be 2-64 characters using uppercase letters, numbers, and underscores'
    );
  }
  return normalized;
}

function validateDescription(description: string): string {
  const normalized = description.trim();
  if (normalized.length > 200) throw new Error('Description must be 200 characters or less');
  return normalized;
}

function validateValue(value: string): string {
  if (!value) throw new Error('Secret value is required');
  if (Buffer.byteLength(value, 'utf8') > 64 * 1024) {
    throw new Error('Secret value must be 64 KB or less');
  }
  return value;
}

/** Server-only resolver for execution paths such as harness adapters. */
export async function resolveSecretValue(
  organizationId: string,
  nameInput: string
): Promise<string> {
  const name = validateName(nameInput);
  const encryptedValue = await getEncryptedSecret(getDb(), name, organizationId);
  if (!encryptedValue) throw new Error(`Secret ${name} not found`);
  return decryptSecretValue(encryptedValue, encryptionSecret(), { organizationId, name });
}

export const canManageSecretsServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    await requireIntegrationSession(getRequest(), { requireAdmin: true });
    return true;
  } catch {
    return false;
  }
});

export const listSecretsServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const session = await requireIntegrationSession(getRequest(), { requireAdmin: true });
  return getSecrets(getDb(), session.organizationId);
});

export const createSecretServerFn = createServerFn({ method: 'POST' })
  .validator((data: { name: string; description: string; value: string }) => data)
  .handler(async ({ data }) => {
    const session = await requireIntegrationSession(getRequest(), { requireAdmin: true });
    const name = validateName(data.name);
    const description = validateDescription(data.description);
    const value = validateValue(data.value);
    const db = getDb();
    await ensureSecretsIndexes(db);
    return dbCreateSecret(
      db,
      {
        name,
        description,
        encryptedValue: encryptSecretValue(value, encryptionSecret(), {
          organizationId: session.organizationId,
          name,
        }),
      },
      { userId: session.userId, organizationId: session.organizationId }
    );
  });

export const rotateSecretServerFn = createServerFn({ method: 'POST' })
  .validator((data: { id: string; value: string }) => data)
  .handler(async ({ data }) => {
    const session = await requireIntegrationSession(getRequest(), { requireAdmin: true });
    const db = getDb();
    const secret = await getSecretById(db, data.id, session.organizationId);
    if (!secret) throw new Error('Secret not found');
    const encryptedValue = encryptSecretValue(validateValue(data.value), encryptionSecret(), {
      organizationId: session.organizationId,
      name: secret.name,
    });
    const updated = await dbRotateSecret(db, data.id, encryptedValue, {
      userId: session.userId,
      organizationId: session.organizationId,
    });
    if (!updated) throw new Error('Secret not found');
    return updated;
  });

export const deleteSecretServerFn = createServerFn({ method: 'POST' })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const session = await requireIntegrationSession(getRequest(), { requireAdmin: true });
    const deleted = await dbDeleteSecret(getDb(), data.id, session.organizationId);
    if (!deleted) throw new Error('Secret not found');
    return { success: true as const };
  });
