export type GitHubAccount = {
  externalId: string;
  login: string;
  type: "user" | "organization";
  avatarUrl?: string;
};

export type GitHubGrants = {
  repositorySelection: "all" | "selected";
  permissions: Record<string, "read" | "write">;
  events: string[];
};

export type VerifiedGitHubInstallation = {
  installationId: string;
  account: GitHubAccount;
  grants: GitHubGrants;
  status: "active" | "suspended";
};

export type GitHubRepository = {
  provider: "github";
  kind: "repository";
  externalId: string;
  locator: {
    owner: string;
    name: string;
    fullName: string;
  };
  display: {
    url: string;
    defaultBranch: string;
    private: boolean;
  };
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
  providerUpdatedAt?: Date;
};

export type GitHubPermissionLevel = "read" | "write";

export type GitHubInstallationCredential = {
  token: string;
  expiresAt: Date;
  repositoryIds?: string[];
  permissions: Record<string, GitHubPermissionLevel>;
};

export type GitHubUserCredential = {
  token: string;
  expiresAt?: Date;
};
