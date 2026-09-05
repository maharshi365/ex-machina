import { MongoClient } from 'mongodb';

// Single shared client for both better-auth and pure @ex-machina/db usage.
// The db package itself is pure (no client creation) — consumers inject `Db`.

const mongoUri =
  process.env.MONGODB_URI ?? process.env.DATABASE_URL ?? 'mongodb://localhost:27017/ex-machina';

let client: MongoClient | null = null;

export function getMongoClient(): MongoClient {
  if (!client) {
    client = new MongoClient(mongoUri);
  }
  return client;
}

export function getDb() {
  return getMongoClient().db();
}
