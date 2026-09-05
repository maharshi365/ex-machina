import { createAppAuth } from '@octokit/auth-app';
import { request as octokitRequest } from '@octokit/request';
import type { GitHubAppConfig } from './config.js';
import { GitHubProviderError } from './errors.js';
import {
  githubId,
  isRecord,
  normalizeGitHubInstallation,
  normalizeGitHubRepository,
} from './normalize.js';
import type {
  GitHubInstallationCredential,
  GitHubPermissionLevel,
  GitHubRepository,
  GitHubUserCredential,
  VerifiedGitHubInstallation,
} from './types.js';

type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function providerMessage(value: unknown): string | undefined {
  return isRecord(value) && typeof value.message === 'string' ? value.message : undefined;
}

async function parseJson(response: Response, operation: string): Promise<unknown> {
  let value: unknown;
  try {
    value = await response.json();
  } catch (cause) {
    throw new GitHubProviderError({
      operation,
      code: response.ok ? 'invalid_response' : 'http_error',
      status: response.status,
      requestId: response.headers.get('x-github-request-id') ?? undefined,
      cause,
    });
  }
  if (!response.ok) {
    throw new GitHubProviderError({
      operation,
      code: 'http_error',
      status: response.status,
      requestId: response.headers.get('x-github-request-id') ?? undefined,
      providerMessage: providerMessage(value),
    });
  }
  return value;
}

export class GitHubAppClient {
  readonly #config: GitHubAppConfig;
  readonly #fetch: Fetch;
  readonly #auth: ReturnType<typeof createAppAuth>;

  constructor(config: GitHubAppConfig, fetchImplementation: Fetch = globalThis.fetch) {
    this.#config = config;
    this.#fetch = fetchImplementation;
    this.#auth = createAppAuth({
      appId: config.appId,
      privateKey: config.privateKey,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      request: octokitRequest.defaults({
        baseUrl: config.apiBaseUrl,
        request: { fetch: fetchImplementation },
      }),
    });
  }

  async #request(operation: string, url: URL, init: RequestInit): Promise<unknown> {
    let response: Response;
    try {
      response = await this.#fetch(url, init);
    } catch (cause) {
      throw new GitHubProviderError({ operation, code: 'network_error', cause });
    }
    return parseJson(response, operation);
  }

  #apiUrl(path: string): URL {
    return new URL(path.replace(/^\//, ''), `${this.#config.apiBaseUrl}/`);
  }

  #webUrl(path: string): URL {
    return new URL(path.replace(/^\//, ''), `${this.#config.webBaseUrl}/`);
  }

  async exchangeOAuthCode(input: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<GitHubUserCredential> {
    if (!input.code || !input.codeVerifier)
      throw new Error('OAuth code and PKCE verifier are required');
    const value = await this.#request(
      'OAuth code exchange',
      this.#webUrl('login/oauth/access_token'),
      {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.#config.clientId,
          client_secret: this.#config.clientSecret,
          code: input.code,
          redirect_uri: input.redirectUri,
          code_verifier: input.codeVerifier,
        }),
      }
    );
    if (!isRecord(value) || typeof value.access_token !== 'string' || !value.access_token) {
      const error = isRecord(value) && typeof value.error === 'string' ? value.error : undefined;
      throw new GitHubProviderError({
        operation: 'OAuth code exchange',
        code: error === 'bad_verification_code' ? 'invalid_oauth_code' : 'invalid_response',
      });
    }
    const credential: GitHubUserCredential = { token: value.access_token };
    if (typeof value.expires_in === 'number' && value.expires_in > 0) {
      credential.expiresAt = new Date(Date.now() + value.expires_in * 1000);
    }
    return credential;
  }

  async verifyUserCanAccessInstallation(
    userToken: string,
    candidateInstallationId: string
  ): Promise<VerifiedGitHubInstallation> {
    if (!userToken) throw new Error('User token is required');
    const candidateId = githubId(candidateInstallationId, 'installation id');
    for (let page = 1; page <= 100; page += 1) {
      const url = this.#apiUrl('user/installations');
      url.searchParams.set('per_page', '100');
      url.searchParams.set('page', String(page));
      // Pagination is sequential because the stopping point is provider-controlled.
      // eslint-disable-next-line no-await-in-loop
      const value = await this.#request('user installation verification', url, {
        headers: this.#headers(userToken),
      });
      if (!isRecord(value) || !Array.isArray(value.installations)) {
        throw new GitHubProviderError({
          operation: 'user installation verification',
          code: 'invalid_response',
        });
      }
      for (const installation of value.installations) {
        if (
          isRecord(installation) &&
          githubId(installation.id, 'installation id') === candidateId
        ) {
          return normalizeGitHubInstallation(installation);
        }
      }
      if (value.installations.length < 100) break;
    }
    throw new GitHubProviderError({
      operation: 'user installation verification',
      code: 'installation_not_accessible',
    });
  }

  async getInstallation(installationId: string): Promise<VerifiedGitHubInstallation> {
    const id = githubId(installationId, 'installation id');
    const authentication = await this.#auth({ type: 'app' });
    const value = await this.#request(
      'App installation verification',
      this.#apiUrl(`app/installations/${id}`),
      {
        headers: this.#headers(authentication.token),
      }
    );
    return normalizeGitHubInstallation(value);
  }

  async verifyInstallation(input: {
    userToken: string;
    candidateInstallationId: string;
  }): Promise<VerifiedGitHubInstallation> {
    const userInstallation = await this.verifyUserCanAccessInstallation(
      input.userToken,
      input.candidateInstallationId
    );
    const appInstallation = await this.getInstallation(input.candidateInstallationId);
    if (
      userInstallation.installationId !== appInstallation.installationId ||
      userInstallation.account.externalId !== appInstallation.account.externalId
    ) {
      throw new GitHubProviderError({
        operation: 'installation verification',
        code: 'installation_mismatch',
      });
    }
    return appInstallation;
  }

  async mintInstallationToken(input: {
    installationId: string;
    repositoryIds?: string[];
    permissions?: Record<string, GitHubPermissionLevel>;
  }): Promise<GitHubInstallationCredential> {
    const installationId = githubId(input.installationId, 'installation id');
    const repositoryIds = input.repositoryIds
      ? [...new Set(input.repositoryIds.map((id) => githubId(id, 'repository id')))]
      : undefined;
    if (repositoryIds && (repositoryIds.length === 0 || repositoryIds.length > 500)) {
      throw new Error('repositoryIds must contain between 1 and 500 IDs when provided');
    }
    const permissions = input.permissions ?? {};
    for (const [name, level] of Object.entries(permissions)) {
      if (!/^[a-z][a-z_]*$/.test(name) || (level !== 'read' && level !== 'write')) {
        throw new Error('Invalid installation token permissions');
      }
    }
    const authentication = await this.#auth({
      type: 'installation',
      installationId,
      ...(repositoryIds ? { repositoryIds: repositoryIds.map((id) => BigInt(id)) } : {}),
      ...(Object.keys(permissions).length ? { permissions } : {}),
    });
    const expiresAt = new Date(authentication.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      throw new GitHubProviderError({
        operation: 'installation token creation',
        code: 'invalid_response',
      });
    }
    return {
      token: authentication.token,
      expiresAt,
      repositoryIds,
      permissions: { ...permissions },
    };
  }

  async listRepositories(installationToken: string): Promise<GitHubRepository[]> {
    if (!installationToken) throw new Error('Installation token is required');
    const repositories = new Map<string, GitHubRepository>();
    for (let page = 1; page <= 100; page += 1) {
      const url = this.#apiUrl('installation/repositories');
      url.searchParams.set('per_page', '100');
      url.searchParams.set('page', String(page));
      // Pagination is sequential because the stopping point is provider-controlled.
      // eslint-disable-next-line no-await-in-loop
      const value = await this.#request('repository listing', url, {
        headers: this.#headers(installationToken),
      });
      if (!isRecord(value) || !Array.isArray(value.repositories)) {
        throw new GitHubProviderError({
          operation: 'repository listing',
          code: 'invalid_response',
        });
      }
      for (const repositoryValue of value.repositories) {
        const repository = normalizeGitHubRepository(repositoryValue);
        repositories.set(repository.externalId, repository);
      }
      if (value.repositories.length < 100) return [...repositories.values()];
    }
    throw new GitHubProviderError({ operation: 'repository listing', code: 'pagination_limit' });
  }

  #headers(token: string, json = false): HeadersInit {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(json ? { 'Content-Type': 'application/json' } : {}),
    };
  }
}
