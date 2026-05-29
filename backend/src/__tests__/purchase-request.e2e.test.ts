import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { config } from '../config';
import { UserModel } from '../modules/users/user.model';
import { RoleModel } from '../modules/roles/role.model';
import { CounterModel } from '../modules/counters/counter.model';
import { PurchaseRequestModel } from '../modules/purchase-requests/purchaseRequest.model';

let mongoServer: MongoMemoryServer;
let authToken: string;
let purchaseRequestId: string;

const API = '/api/v1/directories/purchase-requests';
const AUTH_API = '/api/v1/auth';

// ── Test data ──────────────────────────────────────────────────

const sampleRequest = {
  number: 'ЗЗ-2026-050',
  createdBy: '67f000000000000000000001',
  date: new Date('2026-06-01'),
  statusId: 'draft',
  orderId: '67f000000000000000000010',
};

const sampleRequest2 = {
  number: 'ЗЗ-2026-099',
  createdBy: '67f000000000000000000002',
  date: new Date('2026-06-05'),
  statusId: 'approved',
  orderId: '67f000000000000000000011',
};

// ── Setup / Teardown ───────────────────────────────────────────

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Seed admin role (wildcard permission)
  const role = await RoleModel.create({
    name: 'admin',
    label: 'Администратор',
    permissions: ['*'],
    isSystem: true,
  });

  // Seed admin user
  const user = await UserModel.create({
    username: 'admin',
    displayName: 'Admin',
    passwordHash: 'admin123',
    role: role.name,
    isActive: true,
  });  // Seed purchase_request counter for auto-numbering
  await CounterModel.create({
    entity: 'purchase_request',
    prefix: 'ЗЗ-',
    year: new Date().getFullYear(),
    seq: 0,
  });

  // Generate JWT for authenticated requests
  authToken = jwt.sign(
    {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      permissions: ['*'],
    },
    config.jwtSecret,
    { expiresIn: '30m' },
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

function auth() {
  return { Authorization: `Bearer ${authToken}` };
}

// ── Auth tests ─────────────────────────────────────────────────

describe('PurchaseRequest API — auth', () => {
  it('должен вернуть 401 без токена (GET /)', async () => {
    const res = await request(app).get(API);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('должен вернуть 401 без токена (POST /)', async () => {
    const res = await request(app).post(API).send(sampleRequest);
    expect(res.status).toBe(401);
  });

  it('должен вернуть 401 без токена (PUT /:id)', async () => {
    const res = await request(app).put(`${API}/${new mongoose.Types.ObjectId()}`).send({ notes: 'x' });
    expect(res.status).toBe(401);
  });

  it('должен вернуть 401 без токена (DELETE /:id)', async () => {
    const res = await request(app).delete(`${API}/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(401);
  });

  it('должен пройти login с admin/admin123 и получить профиль', async () => {
    const res = await request(app)
      .post(`${AUTH_API}/login`)
      .send({ username: 'admin', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.username).toBe('admin');
    expect(res.body.data.role).toBe('admin');
  });
});

// ── CRUD tests ─────────────────────────────────────────────────

describe('PurchaseRequest API — CRUD', () => {
  it('должен создать заявку с автонумерацией (ЗЗ-2026-XXX)', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send({
        createdBy: '67f000000000000000000001',
        statusId: 'draft',
        orderId: '67f000000000000000000010',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const pr = res.body.data;
    expect(pr.number).toMatch(/^ЗЗ-\d{4}-\d{3}$/);
    expect(pr.statusId).toBe('draft');

    purchaseRequestId = pr._id;
  });

  it('должен создать заявку с явным номером', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleRequest);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const pr = res.body.data;
    expect(pr.number).toBe('ЗЗ-2026-050');
    expect(pr.createdBy).toBe('67f000000000000000000001');
    expect(pr.statusId).toBe('draft');
    expect(pr.orderId).toBe('67f000000000000000000010');
    expect(pr.date).toBeDefined();

    purchaseRequestId = purchaseRequestId || pr._id;
  });

  it('должен создать вторую заявку', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleRequest2);

    expect(res.status).toBe(201);
    expect(res.body.data.number).toBe('ЗЗ-2026-099');
    expect(res.body.data.statusId).toBe('approved');
    purchaseRequestId = purchaseRequestId || res.body.data._id;
  });

  it('должен получить список заявок с пагинацией', async () => {
    const res = await request(app)
      .get(API)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(50);
  });

  it('должен получить заявку по ID', async () => {
    const res = await request(app)
      .get(`${API}/${purchaseRequestId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(purchaseRequestId);
  });

  it('должен обновить заявку', async () => {
    const update = {
      statusId: 'ordered',
      orderId: '67f000000000000000000020',
    };

    const res = await request(app)
      .put(`${API}/${purchaseRequestId}`)
      .set(auth())
      .send(update);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.statusId).toBe('ordered');
    expect(res.body.data.orderId).toBe('67f000000000000000000020');
  });

  it('должен удалить заявку', async () => {
    const res = await request(app)
      .delete(`${API}/${purchaseRequestId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // verify deletion
    const getRes = await request(app)
      .get(`${API}/${purchaseRequestId}`)
      .set(auth());
    expect(getRes.status).toBe(404);
  });

  it('должен вернуть 404 для несуществующего ID', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .get(`${API}/${fakeId}`)
      .set(auth());
    expect(res.status).toBe(404);
  });
});

// ── Search, sort, filter, pagination ────────────────────────────

describe('PurchaseRequest API — search, sort, pagination', () => {
  beforeAll(async () => {
    // Ensure multiple purchase requests exist for search/sort/pagination tests
    const count = await PurchaseRequestModel.countDocuments();
    if (count < 5) {
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(API)
          .set(auth())
          .send({
            number: `ЗЗ-2026-${100 + i}`,
            createdBy: `67f00000000000000000000${i + 3}`,
            statusId: i === 0 ? 'draft' : 'received',
            orderId: `67f00000000000000000001${i}`,
          });
      }
    }
  });

  it('должен искать по тексту в number', async () => {
    const res = await request(app)
      .get(`${API}?search=2026`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((pr: any) => pr.number?.includes('2026'))).toBe(true);
  });

  it('должен искать по номеру заявки', async () => {
    const res = await request(app)
      .get(`${API}?search=099`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((pr: any) => pr.number?.includes('099'))).toBe(true);
  });

  it('должен фильтровать по statusId', async () => {
    const res = await request(app)
      .get(`${API}?statusId=received`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.every((pr: any) => pr.statusId === 'received')).toBe(true);
  });

  it('должен фильтровать по orderId', async () => {
    const res = await request(app)
      .get(`${API}?orderId=67f000000000000000000010`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.every((pr: any) => pr.orderId === '67f000000000000000000010')).toBe(true);
  });

  it('должен сортировать по number asc', async () => {
    const res = await request(app)
      .get(`${API}?sort=number&order=asc`)
      .set(auth());

    expect(res.status).toBe(200);
    const numbers = res.body.data.map((pr: any) => pr.number);
    const sorted = [...numbers].sort();
    expect(numbers).toEqual(sorted);
  });

  it('должен сортировать по number desc', async () => {
    const res = await request(app)
      .get(`${API}?sort=number&order=desc`)
      .set(auth());

    expect(res.status).toBe(200);
    const numbers = res.body.data.map((pr: any) => pr.number);
    const sorted = [...numbers].sort().reverse();
    expect(numbers).toEqual(sorted);
  });

  it('должен поддерживать пагинацию с limit и page', async () => {
    const res = await request(app)
      .get(`${API}?page=1&limit=2`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
    expect(res.body.totalPages).toBeGreaterThanOrEqual(1);
  });

  it('должен поддерживать show all (isActive filter off)', async () => {
    // Soft-delete one purchase request
    const listRes = await request(app).get(API).set(auth());
    if (listRes.body.data.length > 0) {
      const id = listRes.body.data[0]._id;
      await PurchaseRequestModel.findByIdAndUpdate(id, { isActive: false });
    }

    // Without ?all=true — only active
    const activeRes = await request(app).get(API).set(auth());
    expect(activeRes.body.data.every((pr: any) => pr.isActive !== false)).toBe(true);

    // With ?all=true — all records
    const allRes = await request(app).get(`${API}?all=true`).set(auth());
    expect(allRes.body.data.some((pr: any) => pr.isActive === false)).toBe(true);
  });

  it('должен комбинировать search + sort + пагинацию', async () => {
    const res = await request(app)
      .get(`${API}?search=ЗЗ-&sort=number&order=desc&page=1&limit=10`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
