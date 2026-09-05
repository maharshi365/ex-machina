import type { GitHubAppConfig } from "./config.js";

function nonEmpty(value: string, name: string): void {
  if (!value) throw new Error(`${name} is required`);
}

export function buildGitHubInstallUrl(config: GitHubAppConfig, state: string): URL {
  nonEmpty(state, "Install state");
  const url = new URL(`/apps/${config.appSlug}/installations/new`, `${config.webBaseUrl}/`);
  url.searchParams.set("state", state);
  return url;
}

export type GitHubAuthorizeUrlInput = {
  state: string;
  codeChallenge: string;
  redirectUri: string;
};

export function buildGitHubAuthorizeUrl(
  config: GitHubAppConfig,
  input: GitHubAuthorizeUrlInput
): URL {
  nonEmpty(input.state, "OAuth state");
  nonEmpty(input.codeChallenge, "PKCE challenge");
  const redirectUri = new URL(input.redirectUri);
  const localHttp = redirectUri.protocol === "http:" && redirectUri.hostname === "localhost";
  if (
    (redirectUri.protocol !== "https:" && !localHttp) ||
    redirectUri.username ||
    redirectUri.password
  ) {
    throw new Error("OAuth redirect URI must use HTTPS");
  }

  const url = new URL("/login/oauth/authorize", `${config.webBaseUrl}/`);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri.href);
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}
