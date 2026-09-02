import { betterAuth } from 'better-auth'
import { mongodbAdapter } from 'better-auth/adapters/mongodb'
import { organization } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { MongoClient } from 'mongodb'

const mongoUri =
  process.env.MONGODB_URI ??
  process.env.DATABASE_URL ??
  'mongodb://localhost:27017/ex-machina'

const client = new MongoClient(mongoUri)
const db = client.db()

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  advanced: {
    database: {
      // Enable joins for MongoDB (2-3x performance on /get-session, /get-full-organization, etc.)
      joins: true,
    },
  },
  plugins: [organization(), tanstackStartCookies()],
})
