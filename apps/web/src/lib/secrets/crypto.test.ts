import { describe, expect, test } from 'bun:test';

import { decryptSecretValue, encryptSecretValue } from './crypto';

const key = 'a-dedicated-test-key-that-is-at-least-32-bytes';
const context = { organizationId: 'org-a', name: 'HARNESS_API_KEY' };

describe('secret encryption', () => {
  test('round trips without embedding plaintext', () => {
    const encrypted = encryptSecretValue('super-secret-value', key, context);
    expect(encrypted).toStartWith('v1.');
    expect(encrypted).not.toContain('super-secret-value');
    expect(decryptSecretValue(encrypted, key, context)).toBe('super-secret-value');
  });

  test('uses a fresh nonce for each encryption', () => {
    expect(encryptSecretValue('same', key, context)).not.toBe(
      encryptSecretValue('same', key, context)
    );
  });

  test('rejects a different organization or name', () => {
    const encrypted = encryptSecretValue('secret', key, context);
    expect(() =>
      decryptSecretValue(encrypted, key, { ...context, organizationId: 'org-b' })
    ).toThrow('Unable to decrypt secret');
    expect(() => decryptSecretValue(encrypted, key, { ...context, name: 'OTHER_KEY' })).toThrow(
      'Unable to decrypt secret'
    );
  });

  test('rejects tampered ciphertext and short keys', () => {
    const encrypted = encryptSecretValue('secret', key, context);
    const parts = encrypted.split('.');
    parts[2] = `${parts[2]?.startsWith('A') ? 'B' : 'A'}${parts[2]?.slice(1)}`;
    expect(() => decryptSecretValue(parts.join('.'), key, context)).toThrow(
      'Unable to decrypt secret'
    );
    expect(() => encryptSecretValue('secret', 'short', context)).toThrow(
      'SECRET_ENCRYPTION_KEY must be at least 32 bytes'
    );
  });
});
