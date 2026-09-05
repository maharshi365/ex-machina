import type {
  GitHubAccount,
  GitHubGrants,
  GitHubRepository,
  VerifiedGitHubInstallation,
} from "./types.js";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function githubId(value: unknown, field = "id"): string {
  if (
    (typeof value === "number" && Number.isSafeInteger(value) && value > 0) ||
    (typeof value === "string" && /^[1-9]\d*$/.test(value))
  ) {
    return String(value);
  }
  throw new Error(`Invalid GitHub ${field}`);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value) throw new Error(`Invalid GitHub ${field}`);
  return value;
}

export function normalizeGitHubAccount(value: unknown): GitHubAccount {
  if (!isRecord(value)) throw new Error("Invalid GitHub account");
  const rawType = requiredString(value.type, "account type").toLowerCase();
  if (rawType !== "user" && rawType !== "organization") {
    throw new Error("Unsupported GitHub account type");
  }
  const account: GitHubAccount = {
    externalId: githubId(value.id, "account id"),
    login: requiredString(value.login, "account login"),
    type: rawType,
  };
  if (typeof value.avatar_url === "string" && value.avatar_url)
    account.avatarUrl = value.avatar_url;
  return account;
}

export function normalizeGitHubGrants(value: unknown): GitHubGrants {
  if (!isRecord(value)) throw new Error("Invalid GitHub installation grants");
  const selection = value.repository_selection;
  if (selection !== "all" && selection !== "selected") {
    throw new Error("Invalid GitHub repository selection");
  }
  if (!isRecord(value.permissions) || !Array.isArray(value.events)) {
    throw new Error("Invalid GitHub installation grants");
  }
  const permissions: Record<string, "read" | "write"> = {};
  for (const [name, level] of Object.entries(value.permissions)) {
    if (level === "read" || level === "write") permissions[name] = level;
  }
  const events = value.events.filter((event): event is string => typeof event === "string");
  if (events.length !== value.events.length) throw new Error("Invalid GitHub installation events");
  return { repositorySelection: selection, permissions, events: [...new Set(events)] };
}

export function normalizeGitHubInstallation(value: unknown): VerifiedGitHubInstallation {
  if (!isRecord(value)) throw new Error("Invalid GitHub installation");
  return {
    installationId: githubId(value.id, "installation id"),
    account: normalizeGitHubAccount(value.account),
    grants: normalizeGitHubGrants(value),
    status: value.suspended_at == null ? "active" : "suspended",
  };
}

export function normalizeGitHubRepository(value: unknown): GitHubRepository {
  if (!isRecord(value) || !isRecord(value.owner)) throw new Error("Invalid GitHub repository");
  if (typeof value.private !== "boolean") throw new Error("Invalid GitHub repository privacy");
  const repository: GitHubRepository = {
    provider: "github",
    kind: "repository",
    externalId: githubId(value.id, "repository id"),
    locator: {
      owner: requiredString(value.owner.login, "repository owner"),
      name: requiredString(value.name, "repository name"),
      fullName: requiredString(value.full_name, "repository full name"),
    },
    display: {
      url: requiredString(value.html_url, "repository URL"),
      defaultBranch: requiredString(value.default_branch, "repository default branch"),
      private: value.private,
    },
  };
  if (isRecord(value.permissions)) {
    repository.permissions = {
      admin: value.permissions.admin === true,
      push: value.permissions.push === true,
      pull: value.permissions.pull === true,
    };
  }
  if (typeof value.updated_at === "string") {
    const updatedAt = new Date(value.updated_at);
    if (!Number.isNaN(updatedAt.getTime())) repository.providerUpdatedAt = updatedAt;
  }
  return repository;
}
