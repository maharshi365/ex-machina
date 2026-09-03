import { beforeAll, afterAll, beforeEach, describe, expect, test } from 'bun:test'
import { MongoClient, ObjectId } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'
import {
  AGENTS_COLLECTION,
  createAgent,
  createAgentsRepository,
  deleteAgent,
  getAgentById,
  getAgents,
  updateAgent,
} from './agents.js'

let mongod: MongoMemoryServer
let client: MongoClient
let db: ReturnType<MongoClient['db']>

const orgA = new ObjectId()
const orgB = new ObjectId()
const user1 = new ObjectId()
const user2 = new ObjectId()

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  client = new MongoClient(mongod.getUri())
  await client.connect()
  db = client.db('test')
})

afterAll(async () => {
  await client.close()
  await mongod.stop()
})

beforeEach(async () => {
  await db.collection(AGENTS_COLLECTION).deleteMany({})
})

describe('agents — pure lib with org scoping, DTO string safety, no indexes', () => {
  test('stores organizationId/createdBy/editedBy as ObjectId, exposes as strings', async () => {
    const dto = await createAgent(db, { name: 'Jarvis', description: 'helper', content: 'you are helpful' }, { userId: user1, organizationId: orgA })
    expect(dto.organizationId).toBe(orgA.toHexString())
    expect(dto.createdBy).toBe(user1.toHexString())
    expect(dto.editedBy).toBe(user1.toHexString())
    expect(typeof dto.createdAt).toBe('string')
    expect(typeof dto.editedAt).toBe('string')

    const raw = await db.collection(AGENTS_COLLECTION).findOne({ _id: new ObjectId(dto._id) })
    expect(raw?.organizationId).toBeInstanceOf(ObjectId)
    expect(raw?.createdBy).toBeInstanceOf(ObjectId)
    expect(raw?.editedBy).toBeInstanceOf(ObjectId)
    expect(raw?.createdAt).toBeInstanceOf(Date)
    expect(raw?.editedAt).toBeInstanceOf(Date)
    expect(raw?.organizationId.toHexString()).toBe(orgA.toHexString())
  })

  test('getAgents is org-scoped', async () => {
    await createAgent(db, { name: 'A1', description: 'd', content: 'c' }, { userId: user1, organizationId: orgA })
    await createAgent(db, { name: 'A2', description: 'd', content: 'c' }, { userId: user1, organizationId: orgA })
    await createAgent(db, { name: 'B1', description: 'd', content: 'c' }, { userId: user2, organizationId: orgB })

    expect((await getAgents(db, orgA)).length).toBe(2)
    expect((await getAgents(db, orgB)).length).toBe(1)
  })

  test('getAgentById prevents cross-org access', async () => {
    const dto = await createAgent(db, { name: 'Secret', description: 'd', content: 'c' }, { userId: user1, organizationId: orgA })
    expect(await getAgentById(db, dto._id, orgA)).not.toBeNull()
    expect(await getAgentById(db, dto._id, orgB)).toBeNull()
  })

  test('updateAgent is org-scoped and updates editedBy/editedAt', async () => {
    const dto = await createAgent(db, { name: 'Old', description: 'd', content: 'c' }, { userId: user1, organizationId: orgA })
    const beforeEditedAt = dto.editedAt
    await new Promise((r) => setTimeout(r, 10))
    const updated = await updateAgent(db, dto._id, { name: 'New' }, { userId: user2, organizationId: orgA })
    expect(updated?.name).toBe('New')
    expect(updated?.editedBy).toBe(user2.toHexString())
    expect(updated?.editedAt).not.toBe(beforeEditedAt)

    // cross-org update should not find doc
    expect(await updateAgent(db, dto._id, { name: 'Hack' }, { userId: user2, organizationId: orgB })).toBeNull()
    // verify original still unchanged for orgB attempt
    expect((await getAgentById(db, dto._id, orgA))?.name).toBe('New')
  })

  test('deleteAgent is org-scoped', async () => {
    const dto = await createAgent(db, { name: 'ToDel', description: 'd', content: 'c' }, { userId: user1, organizationId: orgA })
    expect(await deleteAgent(db, dto._id, orgB)).toBe(false)
    expect(await getAgentById(db, dto._id, orgA)).not.toBeNull()
    expect(await deleteAgent(db, dto._id, orgA)).toBe(true)
    expect(await getAgentById(db, dto._id, orgA)).toBeNull()
  })

  test('createAgentsRepository binds org correctly', async () => {
    const repoA = createAgentsRepository(db, orgA)
    const repoB = createAgentsRepository(db, orgB)
    await repoA.createAgent({ name: 'RA', description: 'd', content: 'c' }, user1)
    expect((await repoA.getAgents()).length).toBe(1)
    expect((await repoB.getAgents()).length).toBe(0)
    const dto = (await repoA.getAgents())[0]!
    expect(await repoB.getAgentById(dto._id)).toBeNull()
  })

  test('no indexes are created', async () => {
    await createAgent(db, { name: 'Idx', description: 'd', content: 'c' }, { userId: user1, organizationId: orgA })
    const indexes = await db.collection(AGENTS_COLLECTION).indexes()
    // only default _id index should exist
    expect(indexes.length).toBe(1)
    expect(indexes[0]?.key).toEqual({ _id: 1 })
  })
})
