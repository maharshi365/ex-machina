import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
  createExternalConnectionsRepository,
  createExternalResourcesRepository,
} from "@ex-machina/db";
import { getDb } from "@/lib/db/client";
import { requireIntegrationSession } from "@/lib/integrations/session";

export const listIntegrationsServerFn = createServerFn({ method: "GET" }).handler(async () => {
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

export const canManageIntegrationsServerFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    await requireIntegrationSession(getRequest(), { requireAdmin: true });
    return true;
  } catch {
    return false;
  }
});
