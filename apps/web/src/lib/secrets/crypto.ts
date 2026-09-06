import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function encryptionKey(applicationSecret: string): Buffer {
  if (Buffer.byteLength(applicationSecret, 'utf8') < 32) {
    throw new Error('SECRET_ENCRYPTION_KEY must be at least 32 bytes');
  }
  return createHash('sha256')
    .update('ex-machina:secrets-key:v1\0', 'utf8')
    .update(applicationSecret, 'utf8')
    .digest();
}

function additionalData(organizationId: string, name: string): Buffer {
  return Buffer.from(`ex-machina:secret:v1\0${organizationId}\0${name}`, 'utf8');
}

export function encryptSecretValue(
  plaintext: string,
  applicationSecret: string,
  context: { organizationId: string; name: string }
): string {
  if (!plaintext) throw new Error('Secret value is required');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(applicationSecret), iv);
  cipher.setAAD(additionalData(context.organizationId, context.name));
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64url'),
    ciphertext.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
  ].join('.');
}

export function decryptSecretValue(
  envelope: string,
  applicationSecret: string,
  context: { organizationId: string; name: string }
): string {
  try {
    const [version, ivValue, ciphertextValue, tagValue, extra] = envelope.split('.');
    if (version !== 'v1' || !ivValue || !ciphertextValue || !tagValue || extra !== undefined) {
      throw new Error('Invalid envelope');
    }
    const iv = Buffer.from(ivValue, 'base64url');
    const tag = Buffer.from(tagValue, 'base64url');
    if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid envelope');
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(applicationSecret), iv);
    decipher.setAAD(additionalData(context.organizationId, context.name));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error('Unable to decrypt secret');
  }
}
