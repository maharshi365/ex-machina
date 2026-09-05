import { describe, expect, test } from 'bun:test';
import { generateKeyPairSync } from 'node:crypto';
import { GitHubAppClient } from './client.js';
import type { GitHubAppConfig } from './config.js';

function testConfig(): GitHubAppConfig {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return {
    appId: '12345',
    clientId: 'Iv1.test',
    clientSecret: 'client-secret',
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    appSlug: 'ex-machina-test',
    applicationSecret: 'a-dedicated-integration-key-at-least-32-bytes',
    apiBaseUrl: 'https://api.github.test',
    webBaseUrl: 'https://github.test',
  };
}

describe('GitHub App client authentication', () => {
  test('uses Octokit for App and installation credentials', async () => {
    const requests: Array<{ url: string; authorization: string | null }> = [];
    const fetchImplementation = async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      requests.push({
        url: request.url,
        authorization: request.headers.get('authorization'),
      });
      if (request.url.endsWith('/app/installations/987')) {
        return Response.json({
          id: 987,
          account: { id: 42, login: 'octo-org', type: 'Organization' },
          repository_selection: 'selected',
          permissions: { contents: 'write' },
          events: ['push'],
          suspended_at: null,
        });
      }
      if (request.url.endsWith('/app/installations/987/access_tokens')) {
        return Response.json({
          token: 'ghs_ephemeral',
          expires_at: '2026-09-05T13:00:00Z',
          permissions: { contents: 'read' },
          repository_selection: 'selected',
        });
      }
      return new Response('Not found', { status: 404 });
    };
    const client = new GitHubAppClient(testConfig(), fetchImplementation);

    const installation = await client.getInstallation('987');
    const credential = await client.mintInstallationToken({
      installationId: '987',
      permissions: { contents: 'read' },
    });

    expect(installation.account.login).toBe('octo-org');
    expect(credential.token).toBe('ghs_ephemeral');
    expect(requests).toHaveLength(2);
    expect(requests.every((request) => request.url.startsWith('https://api.github.test/'))).toBe(
      true
    );
    expect(
      requests.every((request) => request.authorization?.toLowerCase().startsWith('bearer '))
    ).toBe(true);
  });
});
