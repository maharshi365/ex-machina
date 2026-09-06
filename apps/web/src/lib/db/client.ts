import { MongoClient } from 'mongodb';
import { env } from '@/lib/env/server';

// Single shared client for both better-auth and pure @ex-machina/db usage.
// The db package itself is pure (no client creation) — consumers inject `Db`.

const mongoUri = env.mongoUri;

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
