import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { organization } from 'better-auth/plugins';
import { tanstackStartCookies } from 'better-auth/tanstack-start';
import { getDb, getMongoClient } from '@/lib/db/client';
import { env } from '@/lib/env/server';

const client = getMongoClient();
const db = getDb();

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
  }),
  databaseHooks: {
    session: {
      create: {
        // Auto-set active org on new sessions (login) so
        // session.activeOrganizationId is never null for users with an org.
        before: async (session) => {
          const existing = (session as { activeOrganizationId?: string | null })
            ?.activeOrganizationId;
          if (existing) return;
          try {
            const hookDb = getDb();
            const member = (await hookDb
              .collection('member')
              .findOne(
                { userId: (session as { userId?: string }).userId },
                { projection: { organizationId: 1 } }
              )) as { organizationId?: string } | null;
            const organizationId = member?.organizationId;
            if (organizationId) {
              return {
                data: { ...session, activeOrganizationId: organizationId },
              };
            }
          } catch {
            // fall through — session stays without active org
          }
          return;
        },
      },
    },
  },
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
    },
  },
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  advanced: {
    database: {
      // Enable joins for MongoDB (2-3x performance on /get-session, /get-full-organization, etc.)
      joins: true,
    },
  },
  plugins: [organization(), tanstackStartCookies()],
});
