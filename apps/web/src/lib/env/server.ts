import { z } from 'zod';

/**
 * Server-side environment validation.
 *
 * SERVER-ONLY — never import this module (or `@/lib/env/server`) from client
 * code. It exposes secrets and reads `process.env`, which does not exist in
 * the browser.
 *
 * The schema mirrors `apps/web/.env.example` (the source of truth for which
 * variables exist). Validation is lazy and cached: the first access parses
 * `process.env` once, and every later access reuses the result. To fail fast
 * at boot, `src/server.ts` (the TanStack Start server entrypoint) calls
 * `validateEnv()` before handling any request.
 *
 * Conventions:
 * - Blank values (`KEY=`) are treated as unset, so optional variables can be
 *   left blank in `.env` (as shipped in `.env.example`).
 * - `MONGODB_URI` / `DATABASE_URL` keep their existing fallback chain; read
 *   the resolved value via `env.mongoUri`.
 * - GitHub/encryption variables are optional at boot (the app runs without
 *   integrations configured) and are validated strictly at use time by
 *   `validateGitHubAppConfig` in `@ex-machina/integrations`.
 * - Set `SKIP_ENV_VALIDATION=1` to skip validation (e.g. Docker/CI builds
 *   that run without secrets). Never set it at runtime.
 */

/** Raw string (or missing value) trimmed, with blanks mapped to `undefined`. */
const blankToUndefined = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  });

/** Optional free-form string; blank values count as unset. */
const optionalString = blankToUndefined.pipe(z.string().min(1).optional());

/** Optional URL; blank values count as unset. */
const optionalUrl = blankToUndefined.pipe(z.url().optional());

// --- Base -----------------------------------------------------------------

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SKIP_ENV_VALIDATION: optionalString,
});

// --- Auth (better-auth + Google OAuth) --------------------------------------

const authEnvSchema = z.object({
  BETTER_AUTH_URL: blankToUndefined.pipe(z.url().default('http://localhost:3000')),
  BETTER_AUTH_SECRET: blankToUndefined.pipe(
    z
      .string({
        error:
          'BETTER_AUTH_SECRET is required — copy .env.example to .env and set it (generate one with: bunx --bun @better-auth/cli secret)',
      })
      .min(
        1,
        'BETTER_AUTH_SECRET is required — copy .env.example to .env and set it (generate one with: bunx --bun @better-auth/cli secret)'
      )
  ),
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
});

// --- Database ---------------------------------------------------------------

const databaseEnvSchema = z.object({
  MONGODB_URI: optionalString,
  DATABASE_URL: optionalString,
});

// --- GitHub App integration --------------------------------------------------
// Optional at boot (the app runs without integrations configured); validated
// strictly at use time by `validateGitHubAppConfig` in
// `@ex-machina/integrations`.

const githubEnvSchema = z.object({
  GITHUB_APP_ID: blankToUndefined.pipe(
    z
      .string({ error: 'GITHUB_APP_ID must be numeric' })
      .regex(/^\d+$/, 'GITHUB_APP_ID must be numeric')
      .optional()
  ),
  GITHUB_APP_CLIENT_ID: optionalString,
  GITHUB_APP_CLIENT_SECRET: optionalString,
  GITHUB_APP_PRIVATE_KEY: optionalString,
  GITHUB_APP_SLUG: optionalString,
  INTEGRATION_ENCRYPTION_KEY: blankToUndefined.pipe(
    z
      .string()
      .refine((value) => new TextEncoder().encode(value).length >= 32, {
        error: 'INTEGRATION_ENCRYPTION_KEY must be at least 32 bytes',
      })
      .optional()
  ),
  GITHUB_API_BASE_URL: optionalUrl,
  GITHUB_WEB_BASE_URL: optionalUrl,
});

// --- Combined ---------------------------------------------------------------

const envSchema = baseEnvSchema
  .merge(authEnvSchema)
  .merge(databaseEnvSchema)
  .merge(githubEnvSchema);

export type BaseEnv = z.infer<typeof baseEnvSchema>;
export type AuthEnv = z.infer<typeof authEnvSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type GitHubEnv = z.infer<typeof githubEnvSchema>;
export type Env = z.infer<typeof envSchema> & {
  /** Resolved `MONGODB_URI ?? DATABASE_URL ?? 'mongodb://localhost:27017/ex-machina'`. */
  readonly mongoUri: string;
};

function nonBlank(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function resolveMongoUri(mongodbUri: string | undefined, databaseUrl: string | undefined): string {
  return nonBlank(mongodbUri) ?? nonBlank(databaseUrl) ?? 'mongodb://localhost:27017/ex-machina';
}

function shouldSkipValidation(source: Record<string, string | undefined>): boolean {
  return nonBlank(source.SKIP_ENV_VALIDATION) !== undefined;
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}

let cached: Env | null = null;

/**
 * Returns the validated environment, parsing `process.env` once and caching
 * the result. Throws a descriptive error listing every invalid variable.
 */
export function getEnv(): Env {
  if (cached) return cached;

  if (shouldSkipValidation(process.env)) {
    console.warn('[env] SKIP_ENV_VALIDATION is set — skipping env validation');
    cached = Object.freeze({
      ...(process.env as unknown as z.infer<typeof envSchema>),
      mongoUri: resolveMongoUri(process.env.MONGODB_URI, process.env.DATABASE_URL),
    });
    return cached;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables:\n${formatIssues(parsed.error)}\nCheck .env against .env.example.`
    );
  }
  cached = Object.freeze({
    ...parsed.data,
    mongoUri: resolveMongoUri(parsed.data.MONGODB_URI, parsed.data.DATABASE_URL),
  });
  return cached;
}

/**
 * Forces a fresh validation (ignores the cache). Called by the TanStack Start
 * server entrypoint (`src/server.ts`) so misconfiguration fails fast at boot.
 */
export function validateEnv(): Env {
  cached = null;
  return getEnv();
}

/**
 * Lazy singleton over `getEnv()`. Prefer `import { env } from '@/lib/env/server'`
 * in server modules, e.g. `env.BETTER_AUTH_SECRET`.
 */
export const env: Env = new Proxy({} as Env, {
  get(_target, property) {
    return Reflect.get(getEnv(), property);
  },
  ownKeys() {
    return Reflect.ownKeys(getEnv());
  },
  getOwnPropertyDescriptor(_target, property) {
    const descriptor = Reflect.getOwnPropertyDescriptor(getEnv(), property);
    // Report as configurable: the proxy target is an empty object, so
    // forwarding the frozen source's non-configurable descriptor would
    // violate Proxy invariants (breaks `{ ...env }`).
    if (descriptor) return { ...descriptor, configurable: true };
    return undefined;
  },
});
