// Pure library — no MongoClient instantiation, no env access.
// This package expects an injected `Db` instance.
// Creation of `MongoClient` is the responsibility of the consumer (e.g. apps/web).

export type { Db, Collection, ObjectId } from 'mongodb';
