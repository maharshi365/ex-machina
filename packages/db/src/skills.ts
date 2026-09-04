import type { Collection, Db, ObjectId, WithId } from "mongodb";
import { toObjectId } from "./types.js";
import type { WithStringId } from "./types.js";

export const SKILLS_COLLECTION = "skills";

// ---------------------------------------------------------------------------
// Types — stored as ObjectId in DB, exposed as strings via DTO for FE safety
// Mirrors Agent Skills spec: https://agentskills.io/specification
// Frontmatter: name + description (+ body as content)
// Schema omits `_id`; stored type derives it via driver's `WithId<T>`.
// ---------------------------------------------------------------------------

export type SkillSchema = {
  name: string;
  description: string;
  content: string;
  organizationId: ObjectId;
  createdBy: ObjectId;
  createBy?: ObjectId;
  editedBy: ObjectId;
  createdAt: Date;
  editedAt: Date;
};

export type Skill = WithId<SkillSchema>;

type SkillDTOBase = {
  name: string;
  description: string;
  content: string;
  organizationId: string;
  createdBy: string;
  editedBy: string;
  createdAt: string;
  editedAt: string;
};

export type SkillDTO = WithStringId<SkillDTOBase>;

export type CreateSkillInput = {
  name: string;
  description: string;
  content: string;
};

export type UpdateSkillInput = Partial<CreateSkillInput>;

// ---------------------------------------------------------------------------
// Helpers — spec-compliant validation
// See https://agentskills.io/specification and https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
// ---------------------------------------------------------------------------

export function toSkillDTO(skill: Skill): SkillDTO {
  return {
    _id: skill._id.toHexString(),
    name: skill.name,
    description: skill.description,
    content: skill.content,
    organizationId: skill.organizationId.toHexString(),
    createdBy: skill.createdBy.toHexString(),
    editedBy: skill.editedBy.toHexString(),
    createdAt: skill.createdAt.toISOString(),
    editedAt: skill.editedAt.toISOString(),
  };
}

function getCollection(db: Db): Collection<SkillSchema> {
  return db.collection<SkillSchema>(SKILLS_COLLECTION);
}

// Agent Skills spec validation
const RESERVED_WORDS = new Set(["anthropic", "claude"]);

export function validateSkillName(name: string): void {
  if (typeof name !== "string") throw new Error("name must be a string");
  if (name.length < 1 || name.length > 64) throw new Error("name must be 1-64 characters");
  if (name.startsWith("-") || name.endsWith("-"))
    throw new Error("name must not start or end with a hyphen");
  if (name.includes("--")) throw new Error("name must not contain consecutive hyphens");
  if (!/^[a-z0-9-]+$/.test(name))
    throw new Error("name must contain only lowercase letters (a-z), numbers (0-9), and hyphens");
  if (name.includes("<") || name.includes(">")) throw new Error("name must not contain XML tags");
  const lower = name.toLowerCase();
  for (const w of RESERVED_WORDS) {
    if (lower.includes(w)) throw new Error(`name must not contain reserved word "${w}"`);
  }
}

export function validateSkillDescription(description: string): void {
  if (typeof description !== "string") throw new Error("description must be a string");
  const trimmed = description.trim();
  if (trimmed.length < 1) throw new Error("description must be non-empty");
  if (description.length > 1024) throw new Error("description must be at most 1024 characters");
  if (description.includes("<") || description.includes(">"))
    throw new Error("description must not contain XML tags");
}

export function validateSkillContent(content: string): void {
  if (typeof content !== "string") throw new Error("content must be a string");
  // content is SKILL.md body (instructions) — no strict length, but ensure is string
}

function validateSkillInput(input: CreateSkillInput | UpdateSkillInput, partial = false): void {
  if (!partial || input.name !== undefined) {
    if (input.name === undefined) throw new Error("name is required");
    validateSkillName(input.name);
  }
  if (!partial || input.description !== undefined) {
    if (input.description === undefined) throw new Error("description is required");
    validateSkillDescription(input.description);
  }
  if (!partial || input.content !== undefined) {
    if (input.content === undefined) throw new Error("content is required");
    validateSkillContent(input.content);
  }
}

// ---------------------------------------------------------------------------
// CRUD — pure, org-scoped, no indexes. All functions require injected `Db`.
// ---------------------------------------------------------------------------

export async function getSkills(db: Db, organizationId: string | ObjectId): Promise<SkillDTO[]> {
  const orgId = toObjectId(organizationId);
  const skills = await getCollection(db)
    .find({ organizationId: orgId })
    .sort({ createdAt: -1 })
    .toArray();
  return skills.map(toSkillDTO);
}

export async function getSkillById(
  db: Db,
  id: string | ObjectId,
  organizationId: string | ObjectId
): Promise<SkillDTO | null> {
  const orgId = toObjectId(organizationId);
  const skill = await getCollection(db).findOne({ _id: toObjectId(id), organizationId: orgId });
  return skill ? toSkillDTO(skill) : null;
}

export async function createSkill(
  db: Db,
  input: CreateSkillInput,
  ctx: { userId: string | ObjectId; organizationId: string | ObjectId }
): Promise<SkillDTO> {
  validateSkillInput(input);
  const now = new Date();
  const userObjectId = toObjectId(ctx.userId);
  const orgObjectId = toObjectId(ctx.organizationId);

  const doc: SkillSchema = {
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
  const created: Skill = { _id: result.insertedId, ...doc };
  return toSkillDTO(created);
}

export async function updateSkill(
  db: Db,
  id: string | ObjectId,
  input: UpdateSkillInput,
  ctx: { userId: string | ObjectId; organizationId: string | ObjectId }
): Promise<SkillDTO | null> {
  validateSkillInput(input, true);
  const now = new Date();
  const userObjectId = toObjectId(ctx.userId);
  const orgId = toObjectId(ctx.organizationId);

  const updateFields: Record<string, unknown> = { editedBy: userObjectId, editedAt: now };
  if (input.name !== undefined) updateFields.name = input.name;
  if (input.description !== undefined) updateFields.description = input.description;
  if (input.content !== undefined) updateFields.content = input.content;

  const result = await getCollection(db).findOneAndUpdate(
    { _id: toObjectId(id), organizationId: orgId },
    { $set: updateFields },
    { returnDocument: "after" }
  );
  return result ? toSkillDTO(result) : null;
}

export async function deleteSkill(
  db: Db,
  id: string | ObjectId,
  organizationId: string | ObjectId
): Promise<boolean> {
  const orgId = toObjectId(organizationId);
  const result = await getCollection(db).deleteOne({ _id: toObjectId(id), organizationId: orgId });
  return result.deletedCount === 1;
}

// ---------------------------------------------------------------------------
// Repository factory — ergonomic for testing / per-org binding
// ---------------------------------------------------------------------------

export function createSkillsRepository(db: Db, organizationId: string | ObjectId) {
  const orgId = toObjectId(organizationId);
  return {
    getSkills: () => getSkills(db, orgId),
    getSkillById: (id: string | ObjectId) => getSkillById(db, id, orgId),
    createSkill: (input: CreateSkillInput, userId: string | ObjectId) =>
      createSkill(db, input, { userId, organizationId: orgId }),
    updateSkill: (id: string | ObjectId, input: UpdateSkillInput, userId: string | ObjectId) =>
      updateSkill(db, id, input, { userId, organizationId: orgId }),
    deleteSkill: (id: string | ObjectId) => deleteSkill(db, id, orgId),
    collection: getCollection(db),
    db,
    organizationId: orgId,
  };
}
