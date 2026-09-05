import {
  createExternalConnectionsRepository,
  createExternalResourcesRepository,
  createInstallationIntentsRepository,
  ensureIntegrationIndexes,
} from "@ex-machina/db";
import {
  GitHubAppClient,
  buildGitHubAuthorizeUrl,
  buildGitHubInstallUrl,
  decryptPkceVerifier,
  encryptPkceVerifier,
  generatePkcePair,
  generateRandomState,
  githubAppConfigFromEnv,
  hashState,
} from "@ex-machina/integrations/providers/github";
import { getDb } from "#/lib/db";

const DEFAULT_RETURN_TO = "/library/integrations";
let indexesPromise: Promise<void> | undefined;

function getConfig() {
  return githubAppConfigFromEnv(process.env);
}

function ensureIndexes() {
  indexesPromise ??= ensureIntegrationIndexes(getDb()).catch((error) => {
    indexesPromise = undefined;
    throw error;
  });
  return indexesPromise;
}

export function localReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_RETURN_TO;
  }
  return value;
}

export function callbackUrl(path: string): string {
  return new URL(path, process.env.BETTER_AUTH_URL ?? "http://localhost:3000").href;
}

export async function beginGitHubInstallation(input: {
  userId: string;
  organizationId: string;
  returnTo?: string | null;
}): Promise<string> {
  await ensureIndexes();
  const config = getConfig();
  const state = generateRandomState();
  const intents = createInstallationIntentsRepository(getDb(), input.organizationId, input.userId);
  await intents.createInstallationIntent({
    installStateHash: hashState(state),
    returnTo: localReturnTo(input.returnTo ?? null),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  return buildGitHubInstallUrl(config, state).href;
}

export async function continueGitHubInstallation(input: {
  userId: string;
  organizationId: string;
  state: string;
  installationId: string;
}): Promise<string> {
  await ensureIndexes();
  const config = getConfig();
  const oauthState = generateRandomState();
  const pkce = generatePkcePair();
  const intent = await createInstallationIntentsRepository(
    getDb(),
    input.organizationId,
    input.userId
  ).consumeInstallationSetupState(hashState(input.state), {
    candidateInstallationId: input.installationId,
    oauthStateHash: hashState(oauthState),
    pkceVerifierCiphertext: encryptPkceVerifier(pkce.verifier, config.applicationSecret),
  });
  if (!intent) throw new Error("GitHub installation request is invalid or expired");

  return buildGitHubAuthorizeUrl(config, {
    state: oauthState,
    codeChallenge: pkce.challenge,
    redirectUri: callbackUrl("/api/integrations/github/oauth/callback"),
  }).href;
}

export async function completeGitHubInstallation(input: {
  userId: string;
  organizationId: string;
  state: string;
  code: string;
}): Promise<string> {
  await ensureIndexes();
  const db = getDb();
  const config = getConfig();
  const intents = createInstallationIntentsRepository(db, input.organizationId, input.userId);
  const intent = await intents.claimInstallationOAuthState(hashState(input.state));
  if (!intent?.candidateInstallationId || !intent.pkceVerifierCiphertext) {
    throw new Error("GitHub authorization request is invalid or expired");
  }

  try {
    const client = new GitHubAppClient(config);
    const verifier = decryptPkceVerifier(intent.pkceVerifierCiphertext, config.applicationSecret);
    const userCredential = await client.exchangeOAuthCode({
      code: input.code,
      codeVerifier: verifier,
      redirectUri: callbackUrl("/api/integrations/github/oauth/callback"),
    });
    const installation = await client.verifyInstallation({
      userToken: userCredential.token,
      candidateInstallationId: intent.candidateInstallationId,
    });

    const connections = createExternalConnectionsRepository(db, input.organizationId);
    const connection = await connections.upsertVerifiedGitHubInstallation(
      {
        installationId: installation.installationId,
        name: installation.account.login,
        account: installation.account,
        grants: installation.grants,
        status: "pending",
      },
      input.userId
    );
    const credential = await client.mintInstallationToken({
      installationId: installation.installationId,
    });
    const repositories = await client.listRepositories(credential.token);
    const syncedAt = new Date();
    await createExternalResourcesRepository(
      db,
      input.organizationId
    ).synchronizeGitHubRepositoryResources(connection._id, repositories, syncedAt);
    await connections.upsertVerifiedGitHubInstallation(
      {
        installationId: installation.installationId,
        name: installation.account.login,
        account: installation.account,
        grants: installation.grants,
        status: installation.status,
        lastSyncedAt: syncedAt,
      },
      input.userId
    );
    await intents.markInstallationIntentComplete(intent._id);
    return intent.returnTo;
  } catch (error) {
    await intents.markInstallationIntentFailed(intent._id);
    throw error;
  }
}
