import type { Collection, Db, ObjectId, WithId } from 'mongodb';
import { toObjectId } from './types.js';
import type { WithStringId } from './types.js';

export const INSTALLATION_INTENTS_COLLECTION = 'installation_intents';

export type InstallationIntentStatus =
  | 'awaiting_setup'
  | 'awaiting_oauth'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired';

export type InstallationIntentSchema = {
  provider: 'github';
  organizationId: ObjectId;
  userId: ObjectId;
  installStateHash: string;
  oauthStateHash?: string;
  pkceVerifierCiphertext?: string;
  candidateInstallationId?: string;
  returnTo: string;
  status: InstallationIntentStatus;
  createdAt: Date;
  expiresAt: Date;
};

export type InstallationIntent = WithId<InstallationIntentSchema>;

type InstallationIntentDTOBase = Omit<
  InstallationIntentSchema,
  'organizationId' | 'userId' | 'createdAt' | 'expiresAt'
> & {
  organizationId: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export type InstallationIntentDTO = WithStringId<InstallationIntentDTOBase>;

export type CreateInstallationIntentInput = {
  installStateHash: string;
  returnTo: string;
  expiresAt: Date;
};

export type ConsumeInstallationSetupInput = {
  candidateInstallationId: string;
  oauthStateHash: string;
  pkceVerifierCiphertext: string;
};

type InstallationIntentContext = {
  userId: string | ObjectId;
  organizationId: string | ObjectId;
};

export function toInstallationIntentDTO(intent: InstallationIntent): InstallationIntentDTO {
  return {
    _id: intent._id.toHexString(),
    provider: intent.provider,
    organizationId: intent.organizationId.toHexString(),
    userId: intent.userId.toHexString(),
    installStateHash: intent.installStateHash,
    ...(intent.oauthStateHash && { oauthStateHash: intent.oauthStateHash }),
    ...(intent.pkceVerifierCiphertext && {
      pkceVerifierCiphertext: intent.pkceVerifierCiphertext,
    }),
    ...(intent.candidateInstallationId && {
      candidateInstallationId: intent.candidateInstallationId,
    }),
    returnTo: intent.returnTo,
    status: intent.status,
    createdAt: intent.createdAt.toISOString(),
    expiresAt: intent.expiresAt.toISOString(),
  };
}

export function getInstallationIntentsCollection(db: Db): Collection<InstallationIntentSchema> {
  return db.collection<InstallationIntentSchema>(INSTALLATION_INTENTS_COLLECTION);
}

function validateLocalReturnTo(returnTo: string): void {
  if (!returnTo.startsWith('/') || returnTo.startsWith('//') || returnTo.includes('\\')) {
    throw new Error('returnTo must be a local absolute path');
  }
}

export async function createInstallationIntent(
  db: Db,
  input: CreateInstallationIntentInput,
  ctx: InstallationIntentContext
): Promise<InstallationIntentDTO> {
  if (!input.installStateHash) throw new Error('installStateHash is required');
  if (!(input.expiresAt instanceof Date) || input.expiresAt.getTime() <= Date.now()) {
    throw new Error('expiresAt must be a future date');
  }
  validateLocalReturnTo(input.returnTo);

  const doc: InstallationIntentSchema = {
    provider: 'github',
    organizationId: toObjectId(ctx.organizationId),
    userId: toObjectId(ctx.userId),
    installStateHash: input.installStateHash,
    returnTo: input.returnTo,
    status: 'awaiting_setup',
    createdAt: new Date(),
    expiresAt: input.expiresAt,
  };
  const result = await getInstallationIntentsCollection(db).insertOne(doc);
  return toInstallationIntentDTO({ _id: result.insertedId, ...doc });
}

export async function consumeInstallationSetupState(
  db: Db,
  installStateHash: string,
  input: ConsumeInstallationSetupInput,
  ctx: InstallationIntentContext
): Promise<InstallationIntentDTO | null> {
  const intent = await getInstallationIntentsCollection(db).findOneAndUpdate(
    {
      provider: 'github',
      installStateHash,
      organizationId: toObjectId(ctx.organizationId),
      userId: toObjectId(ctx.userId),
      status: 'awaiting_setup',
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        candidateInstallationId: input.candidateInstallationId,
        oauthStateHash: input.oauthStateHash,
        pkceVerifierCiphertext: input.pkceVerifierCiphertext,
        status: 'awaiting_oauth',
      },
    },
    { returnDocument: 'after' }
  );
  return intent ? toInstallationIntentDTO(intent) : null;
}

export async function claimInstallationOAuthState(
  db: Db,
  oauthStateHash: string,
  ctx: InstallationIntentContext
): Promise<InstallationIntentDTO | null> {
  const intent = await getInstallationIntentsCollection(db).findOneAndUpdate(
    {
      provider: 'github',
      oauthStateHash,
      organizationId: toObjectId(ctx.organizationId),
      userId: toObjectId(ctx.userId),
      status: 'awaiting_oauth',
      expiresAt: { $gt: new Date() },
    },
    { $set: { status: 'processing' } },
    { returnDocument: 'after' }
  );
  return intent ? toInstallationIntentDTO(intent) : null;
}

async function markInstallationIntent(
  db: Db,
  id: string | ObjectId,
  status: 'completed' | 'failed',
  ctx: InstallationIntentContext
): Promise<InstallationIntentDTO | null> {
  const currentStatus =
    status === 'completed'
      ? 'processing'
      : { $in: ['awaiting_setup', 'awaiting_oauth', 'processing'] as InstallationIntentStatus[] };
  const intent = await getInstallationIntentsCollection(db).findOneAndUpdate(
    {
      _id: toObjectId(id),
      provider: 'github',
      organizationId: toObjectId(ctx.organizationId),
      userId: toObjectId(ctx.userId),
      status: currentStatus,
    },
    { $set: { status }, $unset: { pkceVerifierCiphertext: '' } },
    { returnDocument: 'after' }
  );
  return intent ? toInstallationIntentDTO(intent) : null;
}

export function markInstallationIntentComplete(
  db: Db,
  id: string | ObjectId,
  ctx: InstallationIntentContext
): Promise<InstallationIntentDTO | null> {
  return markInstallationIntent(db, id, 'completed', ctx);
}

export function markInstallationIntentFailed(
  db: Db,
  id: string | ObjectId,
  ctx: InstallationIntentContext
): Promise<InstallationIntentDTO | null> {
  return markInstallationIntent(db, id, 'failed', ctx);
}

export function createInstallationIntentsRepository(
  db: Db,
  organizationId: string | ObjectId,
  userId: string | ObjectId
) {
  const ctx = { organizationId: toObjectId(organizationId), userId: toObjectId(userId) };
  return {
    createInstallationIntent: (input: CreateInstallationIntentInput) =>
      createInstallationIntent(db, input, ctx),
    consumeInstallationSetupState: (
      installStateHash: string,
      input: ConsumeInstallationSetupInput
    ) => consumeInstallationSetupState(db, installStateHash, input, ctx),
    claimInstallationOAuthState: (oauthStateHash: string) =>
      claimInstallationOAuthState(db, oauthStateHash, ctx),
    markInstallationIntentComplete: (id: string | ObjectId) =>
      markInstallationIntentComplete(db, id, ctx),
    markInstallationIntentFailed: (id: string | ObjectId) =>
      markInstallationIntentFailed(db, id, ctx),
    collection: getInstallationIntentsCollection(db),
    db,
    ...ctx,
  };
}
