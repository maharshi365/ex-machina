import type { Collection, Db, ObjectId, WithId } from "mongodb";
import { toObjectId } from "./types.js";
import type { WithStringId } from "./types.js";

export const AGENTS_COLLECTION = "agents";

// ---------------------------------------------------------------------------
// Types — stored as ObjectId in DB, exposed as strings via DTO for FE safety
// Schema omits `_id`; stored type derives it via driver's `WithId<T>`.
// ---------------------------------------------------------------------------

export type AgentSchema = {
  name: string;
  description: string;
  content: string;
  organizationId: ObjectId;
  /** user id that created the agent */
  createdBy: ObjectId;
  /** alias for createdBy – kept for backwards compat with spec that says `createBy` */
  createBy?: ObjectId;
  /** user id that last edited the agent */
  editedBy: ObjectId;
  createdAt: Date;
  editedAt: Date;
};

export type Agent = WithId<AgentSchema>;

type AgentDTOBase = {
  name: string;
  description: string;
  content: string;
  organizationId: string;
  createdBy: string;
  editedBy: string;
  createdAt: string;
  editedAt: string;
};

export type AgentDTO = WithStringId<AgentDTOBase>;

export type CreateAgentInput = {
  name: string;
  description: string;
  content: string;
};

export type UpdateAgentInput = Partial<CreateAgentInput>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function toDTO(agent: Agent): AgentDTO {
  return {
    _id: agent._id.toHexString(),
    name: agent.name,
    description: agent.description,
    content: agent.content,
    organizationId: agent.organizationId.toHexString(),
    createdBy: agent.createdBy.toHexString(),
    editedBy: agent.editedBy.toHexString(),
    createdAt: agent.createdAt.toISOString(),
    editedAt: agent.editedAt.toISOString(),
  };
}

function getCollection(db: Db): Collection<AgentSchema> {
  return db.collection<AgentSchema>(AGENTS_COLLECTION);
}

function validateAgentInput(input: CreateAgentInput | UpdateAgentInput, partial = false): void {
  const check = (field: keyof CreateAgentInput, value: unknown) => {
    if (value !== undefined && typeof value !== "string") {
      throw new Error(`${field} must be a string`);
    }
    if (!partial && value === undefined) {
      throw new Error(`${field} is required`);
    }
  };
  check("name", (input as CreateAgentInput).name);
  check("description", (input as CreateAgentInput).description);
  check("content", (input as CreateAgentInput).content);
}

// ---------------------------------------------------------------------------
// CRUD — pure, org-scoped, no indexes. All functions require injected `Db`.
// ---------------------------------------------------------------------------

export async function getAgents(db: Db, organizationId: string | ObjectId): Promise<AgentDTO[]> {
  const orgId = toObjectId(organizationId);
  const agents = await getCollection(db)
    .find({ organizationId: orgId })
    .sort({ createdAt: -1 })
    .toArray();
  return agents.map(toDTO);
}

export async function getAgentById(
  db: Db,
  id: string | ObjectId,
  organizationId: string | ObjectId
): Promise<AgentDTO | null> {
  const orgId = toObjectId(organizationId);
  const agent = await getCollection(db).findOne({
    _id: toObjectId(id),
    organizationId: orgId,
  });
  return agent ? toDTO(agent) : null;
}

export async function createAgent(
  db: Db,
  input: CreateAgentInput,
  ctx: { userId: string | ObjectId; organizationId: string | ObjectId }
): Promise<AgentDTO> {
  validateAgentInput(input);
  const now = new Date();
  const userObjectId = toObjectId(ctx.userId);
  const orgObjectId = toObjectId(ctx.organizationId);

  const doc: AgentSchema = {
    name: input.name,
    description: input.description,
    content: input.content,
    organizationId: orgObjectId,
    createdBy: userObjectId,
    editedBy: userObjectId,
    createdAt: now,
    editedAt: now,
  };

  const result = await getCollection(db).insertOne(doc);
  const created: Agent = { _id: result.insertedId, ...doc };
  return toDTO(created);
}

export async function updateAgent(
  db: Db,
  id: string | ObjectId,
  input: UpdateAgentInput,
  ctx: { userId: string | ObjectId; organizationId: string | ObjectId }
): Promise<AgentDTO | null> {
  validateAgentInput(input, true);
  const now = new Date();
  const userObjectId = toObjectId(ctx.userId);
  const orgId = toObjectId(ctx.organizationId);

  const updateFields: Record<string, unknown> = {
    editedBy: userObjectId,
    editedAt: now,
  };
  if (input.name !== undefined) updateFields.name = input.name;
  if (input.description !== undefined) updateFields.description = input.description;
  if (input.content !== undefined) updateFields.content = input.content;

  const result = await getCollection(db).findOneAndUpdate(
    { _id: toObjectId(id), organizationId: orgId },
    { $set: updateFields },
    { returnDocument: "after" }
  );

  return result ? toDTO(result) : null;
}

export async function deleteAgent(
  db: Db,
  id: string | ObjectId,
  organizationId: string | ObjectId
): Promise<boolean> {
  const orgId = toObjectId(organizationId);
  const result = await getCollection(db).deleteOne({
    _id: toObjectId(id),
    organizationId: orgId,
  });
  return result.deletedCount === 1;
}

// ---------------------------------------------------------------------------
// Repository factory — ergonomic for testing / per-org binding
// ---------------------------------------------------------------------------

export function createAgentsRepository(db: Db, organizationId: string | ObjectId) {
  const orgId = toObjectId(organizationId);
  return {
    getAgents: () => getAgents(db, orgId),
    getAgentById: (id: string | ObjectId) => getAgentById(db, id, orgId),
    createAgent: (input: CreateAgentInput, userId: string | ObjectId) =>
      createAgent(db, input, { userId, organizationId: orgId }),
    updateAgent: (id: string | ObjectId, input: UpdateAgentInput, userId: string | ObjectId) =>
      updateAgent(db, id, input, { userId, organizationId: orgId }),
    deleteAgent: (id: string | ObjectId) => deleteAgent(db, id, orgId),
    collection: getCollection(db),
    db,
    organizationId: orgId,
  };
}
