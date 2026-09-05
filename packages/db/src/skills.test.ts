import { beforeAll, afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { MongoClient, ObjectId } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  SKILLS_COLLECTION,
  createSkill,
  createSkillsRepository,
  deleteSkill,
  getSkillById,
  getSkills,
  updateSkill,
  validateSkillDescription,
  validateSkillName,
} from './skills.js';

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: ReturnType<MongoClient['db']>;

const orgA = new ObjectId();
const orgB = new ObjectId();
const user1 = new ObjectId();
const user2 = new ObjectId();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  db = client.db('test');
});

afterAll(async () => {
  await client.close();
  await mongod.stop();
});

beforeEach(async () => {
  await db.collection(SKILLS_COLLECTION).deleteMany({});
});

describe('skills — spec validation', () => {
  test('name must be 1-64, lowercase a-z0-9 and hyphens, no start/end hyphen, no --, no reserved, no xml', () => {
    expect(() => validateSkillName('')).toThrow();
    expect(() => validateSkillName('A')).toThrow();
    expect(() => validateSkillName('-bad')).toThrow();
    expect(() => validateSkillName('bad-')).toThrow();
    expect(() => validateSkillName('bad--name')).toThrow();
    expect(() => validateSkillName('bad name')).toThrow();
    expect(() => validateSkillName('a'.repeat(65))).toThrow();
    expect(() => validateSkillName('claude-helper')).toThrow();
    expect(() => validateSkillName('my<skill>')).toThrow();
    expect(() => validateSkillName('anthropic-tool')).toThrow();
    expect(() => validateSkillName('valid-skill-123')).not.toThrow();
    expect(() => validateSkillName('pdf-processing')).not.toThrow();
  });

  test('description must be 1-1024, non-empty, no xml', () => {
    expect(() => validateSkillDescription('')).toThrow();
    expect(() => validateSkillDescription('   ')).toThrow();
    expect(() => validateSkillDescription('a'.repeat(1025))).toThrow();
    expect(() => validateSkillDescription('has <xml>')).toThrow();
    expect(() =>
      validateSkillDescription(
        'Extract text and tables from PDF files. Use when working with PDFs.'
      )
    ).not.toThrow();
  });
});

describe('skills — pure lib with org scoping, DTO string safety, no indexes', () => {
  test('stores organizationId/createdBy/editedBy as ObjectId, exposes as strings', async () => {
    const dto = await createSkill(
      db,
      {
        name: 'pdf-processing',
        description: 'Extract text and tables from PDFs. Use when working with PDFs.',
        content: '# PDF Skill\nInstructions...',
      },
      { userId: user1, organizationId: orgA }
    );
    expect(dto.organizationId).toBe(orgA.toHexString());
    expect(dto.createdBy).toBe(user1.toHexString());
    expect(dto.editedBy).toBe(user1.toHexString());
    expect(typeof dto.createdAt).toBe('string');
    const raw = await db.collection(SKILLS_COLLECTION).findOne({ _id: new ObjectId(dto._id) });
    expect(raw?.organizationId).toBeInstanceOf(ObjectId);
    expect(raw?.createdBy).toBeInstanceOf(ObjectId);
    expect(raw?.name).toBe('pdf-processing');
  });

  test('rejects invalid name/description on create', async () => {
    await expect(
      createSkill(
        db,
        { name: 'Bad_Name', description: 'valid desc', content: 'body' },
        { userId: user1, organizationId: orgA }
      )
    ).rejects.toThrow();
    await expect(
      createSkill(
        db,
        { name: 'valid-name', description: '', content: 'body' },
        { userId: user1, organizationId: orgA }
      )
    ).rejects.toThrow();
  });

  test('getSkills is org-scoped', async () => {
    await createSkill(
      db,
      { name: 'skill-a1', description: 'desc a1 use when a', content: 'c' },
      { userId: user1, organizationId: orgA }
    );
    await createSkill(
      db,
      { name: 'skill-a2', description: 'desc a2 use when a', content: 'c' },
      { userId: user1, organizationId: orgA }
    );
    await createSkill(
      db,
      { name: 'skill-b1', description: 'desc b1 use when b', content: 'c' },
      { userId: user2, organizationId: orgB }
    );
    expect((await getSkills(db, orgA)).length).toBe(2);
    expect((await getSkills(db, orgB)).length).toBe(1);
  });

  test('getSkillById prevents cross-org access', async () => {
    const dto = await createSkill(
      db,
      { name: 'secret-skill', description: 'secret desc use when secret', content: 'c' },
      { userId: user1, organizationId: orgA }
    );
    expect(await getSkillById(db, dto._id, orgA)).not.toBeNull();
    expect(await getSkillById(db, dto._id, orgB)).toBeNull();
  });

  test('updateSkill validates spec and is org-scoped', async () => {
    const dto = await createSkill(
      db,
      { name: 'old-skill', description: 'old desc use when old', content: 'c' },
      { userId: user1, organizationId: orgA }
    );
    await expect(
      updateSkill(db, dto._id, { name: 'Invalid_Name' }, { userId: user2, organizationId: orgA })
    ).rejects.toThrow();
    const updated = await updateSkill(
      db,
      dto._id,
      { name: 'new-skill' },
      { userId: user2, organizationId: orgA }
    );
    expect(updated?.name).toBe('new-skill');
    expect(updated?.editedBy).toBe(user2.toHexString());
    expect(
      await updateSkill(db, dto._id, { name: 'hack' }, { userId: user2, organizationId: orgB })
    ).toBeNull();
  });

  test('deleteSkill is org-scoped', async () => {
    const dto = await createSkill(
      db,
      { name: 'to-del', description: 'to del desc use when del', content: 'c' },
      { userId: user1, organizationId: orgA }
    );
    expect(await deleteSkill(db, dto._id, orgB)).toBe(false);
    expect(await deleteSkill(db, dto._id, orgA)).toBe(true);
    expect(await getSkillById(db, dto._id, orgA)).toBeNull();
  });

  test('repository binds org correctly', async () => {
    const repoA = createSkillsRepository(db, orgA);
    const repoB = createSkillsRepository(db, orgB);
    await repoA.createSkill(
      { name: 'repo-skill', description: 'repo desc use when repo', content: 'c' },
      user1
    );
    expect((await repoA.getSkills()).length).toBe(1);
    expect((await repoB.getSkills()).length).toBe(0);
  });

  test('no indexes beyond _id', async () => {
    await createSkill(
      db,
      { name: 'idx-skill', description: 'idx desc use when idx', content: 'c' },
      { userId: user1, organizationId: orgA }
    );
    const indexes = await db.collection(SKILLS_COLLECTION).indexes();
    expect(indexes.length).toBe(1);
    expect(indexes[0]?.key).toEqual({ _id: 1 });
  });
});
