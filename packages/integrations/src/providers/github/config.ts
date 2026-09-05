import { createPrivateKey } from 'node:crypto';

export type GitHubAppConfig = Readonly<{
  appId: string;
  clientId: string;
  clientSecret: string;
  privateKey: string;
  appSlug: string;
  applicationSecret: string;
  apiBaseUrl: string;
  webBaseUrl: string;
}>;

export type GitHubAppConfigInput = {
  appId?: unknown;
  clientId?: unknown;
  clientSecret?: unknown;
  privateKey?: unknown;
  appSlug?: unknown;
  applicationSecret?: unknown;
  apiBaseUrl?: unknown;
  webBaseUrl?: unknown;
};

export type GitHubAppEnvironment = Record<string, string | undefined>;

function requiredString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid GitHub App configuration: ${name} is required`);
  }
  return value.trim();
}

function baseUrl(value: unknown, name: string, fallback: string): string {
  const raw = value === undefined ? fallback : requiredString(value, name);
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid GitHub App configuration: ${name} must be an absolute URL`);
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      `Invalid GitHub App configuration: ${name} must be a credential-free HTTPS URL`
    );
  }
  return parsed.href.replace(/\/$/, '');
}

export function validateGitHubAppConfig(input: GitHubAppConfigInput): GitHubAppConfig {
  const appId = requiredString(input.appId, 'appId');
  if (!/^\d+$/.test(appId)) {
    throw new Error('Invalid GitHub App configuration: appId must be numeric');
  }

  const appSlug = requiredString(input.appSlug, 'appSlug');
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(appSlug)) {
    throw new Error('Invalid GitHub App configuration: appSlug is invalid');
  }

  const applicationSecret = requiredString(input.applicationSecret, 'applicationSecret');
  if (Buffer.byteLength(applicationSecret, 'utf8') < 32) {
    throw new Error(
      'Invalid GitHub App configuration: applicationSecret must be at least 32 bytes'
    );
  }

  const privateKey = requiredString(input.privateKey, 'privateKey').replace(/\\n/g, '\n');
  try {
    const key = createPrivateKey(privateKey);
    if (key.asymmetricKeyType !== 'rsa') {
      throw new Error('not RSA');
    }
  } catch {
    throw new Error('Invalid GitHub App configuration: privateKey must be an RSA private key');
  }

  return Object.freeze({
    appId,
    clientId: requiredString(input.clientId, 'clientId'),
    clientSecret: requiredString(input.clientSecret, 'clientSecret'),
    privateKey,
    appSlug,
    applicationSecret,
    apiBaseUrl: baseUrl(input.apiBaseUrl, 'apiBaseUrl', 'https://api.github.com'),
    webBaseUrl: baseUrl(input.webBaseUrl, 'webBaseUrl', 'https://github.com'),
  });
}

export function githubAppConfigFromEnv(env: GitHubAppEnvironment): GitHubAppConfig {
  return validateGitHubAppConfig({
    appId: env.GITHUB_APP_ID,
    clientId: env.GITHUB_APP_CLIENT_ID,
    clientSecret: env.GITHUB_APP_CLIENT_SECRET,
    privateKey: env.GITHUB_APP_PRIVATE_KEY,
    appSlug: env.GITHUB_APP_SLUG,
    applicationSecret: env.INTEGRATION_ENCRYPTION_KEY,
    apiBaseUrl: env.GITHUB_API_BASE_URL,
    webBaseUrl: env.GITHUB_WEB_BASE_URL,
  });
}
