# Secrets System Design

## Scope

Secrets are organization-scoped, reusable credentials for systems such as harness providers. Version 1 stores encrypted values in MongoDB and exposes management operations through authenticated server functions. It intentionally has no frontend.

## Security Model

- Only organization owners and admins can list metadata, create, rotate, or delete secrets.
- Secret values are write-only through management APIs. DTOs never contain plaintext or ciphertext.
- Runtime code resolves plaintext through the server-only `resolveSecretValue` function.
- Values use AES-256-GCM with a random 96-bit nonce and a key derived from `SECRET_ENCRYPTION_KEY`.
- Authenticated additional data binds ciphertext to its organization ID and normalized secret name. Moving ciphertext to another organization or name causes decryption to fail.
- MongoDB stores one encrypted envelope (`v1.iv.ciphertext.tag`) per secret. The version supports future envelope/key migrations.
- The encryption key is server configuration and must not be stored in MongoDB or exposed to browser code.

## Data Model

Each `secrets` document contains a unique organization/name pair, optional description, encrypted value, creator/editor IDs, and timestamps. Names use uppercase environment-variable syntax and are normalized at the server boundary.

The unique compound index on `{ organizationId, name }` prevents duplicate names while allowing the same name in different organizations.

## Flows

Create validates and normalizes input, encrypts the value, and stores only the envelope. Rotate replaces only the encrypted value and edit metadata. Delete and every lookup include the organization ID in the database filter. Runtime resolution looks up by organization/name and decrypts in server memory.

## Operational Requirements

- Set `SECRET_ENCRYPTION_KEY` to a dedicated random value of at least 32 bytes.
- Back up the key separately from MongoDB. Losing it makes all stored values unrecoverable.
- Database backups remain encrypted but are not useful without the application key.
- Never log submitted values, encrypted envelopes, or resolved plaintext.

## Follow-up Work

- Add key IDs and a keyring for online encryption-key rotation.
- Add append-only audit events for create, rotate, delete, and runtime access.
- Add secret references to factory definitions and authorize resolution for each execution.
- Add managed-provider validation and expiration metadata if provider-specific workflows need them.
- Add a management frontend when the product flow is defined.
