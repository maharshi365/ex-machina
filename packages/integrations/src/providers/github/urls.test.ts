import { describe, expect, test } from 'bun:test';
import type { GitHubAppConfig } from './config.js';
import { buildGitHubAuthorizeUrl, buildGitHubInstallUrl } from './urls.js';

const config = {
  appId: '1',
  clientId: 'Iv1.client',
  clientSecret: 'secret',
  privateKey: 'unused',
  appSlug: 'ex-machina-dev',
  applicationSecret: 'unused',
  apiBaseUrl: 'https://api.github.com',
  webBaseUrl: 'https://github.com',
} satisfies GitHubAppConfig;

describe('GitHub setup URLs', () => {
  test('builds an App installation URL with state', () => {
    expect(buildGitHubInstallUrl(config, 'install-state').href).toBe(
      'https://github.com/apps/ex-machina-dev/installations/new?state=install-state'
    );
  });

  test('builds an OAuth URL with PKCE and callback binding', () => {
    const url = buildGitHubAuthorizeUrl(config, {
      state: 'oauth-state',
      codeChallenge: 'challenge',
      redirectUri: 'https://app.example.com/api/integrations/github/oauth/callback',
    });
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: 'Iv1.client',
      redirect_uri: 'https://app.example.com/api/integrations/github/oauth/callback',
      state: 'oauth-state',
      code_challenge: 'challenge',
      code_challenge_method: 'S256',
    });
  });

  test('rejects insecure remote callbacks', () => {
    expect(() =>
      buildGitHubAuthorizeUrl(config, {
        state: 'state',
        codeChallenge: 'challenge',
        redirectUri: 'http://example.com/callback',
      })
    ).toThrow('must use HTTPS');
  });
});
