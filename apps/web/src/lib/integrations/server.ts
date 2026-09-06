import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import {
  createExternalConnectionsRepository,
  createExternalResourcesRepository,
} from '@ex-machina/db';
import {
  GitHubAppClient,
  GitHubProviderError,
  githubAppConfigFromEnv,
} from '@ex-machina/integrations/providers/github';
import { getDb } from '@/lib/db/client';
import { env } from '@/lib/env/server';
import { requireIntegrationSession } from '@/lib/integrations/session';

export const listIntegrationsServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest();
  const session = await requireIntegrationSession(request);
  const db = getDb();
  const connections = await createExternalConnectionsRepository(
    db,
    session.organizationId
  ).listExternalConnections();
  const resources = createExternalResourcesRepository(db, session.organizationId);
  return Promise.all(
    connections.map(async (connection) =>
      Object.assign(connection, {
        resources: await resources.listExternalResources(connection._id),
      })
    )
  );
});

export const canManageIntegrationsServerFn = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    await requireIntegrationSession(getRequest(), { requireAdmin: true });
    return true;
  } catch {
    return false;
  }
});

export const removeIntegrationServerFn = createServerFn({ method: 'POST' })
  .validator((data: { connectionId: string }) => data)
  .handler(async ({ data }) => {
    const session = await requireIntegrationSession(getRequest(), { requireAdmin: true });
    const db = getDb();
    const connections = createExternalConnectionsRepository(db, session.organizationId);
    const connection = await connections.getExternalConnectionById(data.connectionId);
    if (!connection || connection.provider !== 'github') throw new Error('Integration not found');

    try {
      await new GitHubAppClient(githubAppConfigFromEnv(env)).uninstallInstallation(
        connection.auth.installationId
      );
    } catch (error) {
      if (!(error instanceof GitHubProviderError && error.status === 404)) {
        throw new Error(
          'GitHub could not uninstall this integration automatically. Uninstall it from GitHub settings, then try removing it again.',
          { cause: error }
        );
      }
    }

    const revoked = await connections.revokeExternalConnection(data.connectionId, session.userId);
    if (!revoked) throw new Error('Integration not found');
    await createExternalResourcesRepository(
      db,
      session.organizationId
    ).markExternalResourcesRemoved(data.connectionId);
    return { success: true as const };
  });
