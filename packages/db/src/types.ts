import { ObjectId } from 'mongodb';

export type { Document, OptionalId, WithId } from 'mongodb';

// ---------------------------------------------------------------------------
// Shared mongo helpers
//
// Stored docs: define the schema WITHOUT `_id`, then derive:
//   export type Agent = WithId<AgentSchema>
// `WithId<T>` resolves `_id` via `InferIdType<T>` (ObjectId by default).
// `Collection<AgentSchema>` then types reads as `WithId<AgentSchema>` and
// inserts as `OptionalId<AgentSchema>` — no manual `Omit<T, '_id'>`, no casts.
//
// DTOs: `WithId<T>` always infers ObjectId, so string-exposed DTOs need this.
//   export type AgentDTO = WithStringId<AgentDTOBase>
// ---------------------------------------------------------------------------

/** DTO-side document with `_id` exposed as a hex string. */
export type WithStringId<T> = Omit<T, '_id'> & { _id: string };

export function toObjectId(id: string | ObjectId): ObjectId {
  return id instanceof ObjectId ? id : new ObjectId(id);
}
