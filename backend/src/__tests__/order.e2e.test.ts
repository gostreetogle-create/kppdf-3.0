import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { config } from '../config';
import { UserModel } from '../modules/users/user.model';
import { RoleModel } from '../modules/roles/role.model';
import { CounterModel } from '../modules/counters/counter.model';
import { OrderModel } from '../modules/orders/order.model';

let mongoServer: MongoMemoryServer;
let authToken: string;
let orderId: string;

const API = '/api/v1/directories/orders';
const AUTH_API = '/api/v1/auth';

// ── Test data ──────────────────────────────────────────────────

const sampleOrder = {
  counterpartyId: '67f000000000000000000001',
  date: new Date('2026-06-01'),
  plannedDate: new Date('2026-07-15'),
  statusId: 'new',
  total: 500000,
  notes: 'Тестовый заказ на изготовление металлоконструкций',
};

const sampleOrder2 = {
  counterpartyId: '67f000000000000000000002',
  quotationId: '67f000000000000000000010',
  number: 'З-2026-099',
  date: new Date('2026-06-05'),
  plannedDate: new Date('2026-08-01'),
  statusId: 'confirmed',
  total: 1280000,
  notes: 'Заказ с явным номером и привязкой к КП',
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
  });

  // Seed order counter for auto-numbering
  await CounterModel.create({
    entity: 'order',
    prefix: 'З-',
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

describe('Order API — auth', () => {
  it('должен вернуть 401 без токена (GET /)', async () => {
    const res = await request(app).get(API);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('должен вернуть 401 без токена (POST /)', async () => {
    const res = await request(app).post(API).send(sampleOrder);
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

describe('Order API — CRUD', () => {
  it('должен создать заказ с автонумерацией', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleOrder);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const o = res.body.data;
    expect(o.number).toMatch(/^З-\d{4}-\d{3}$/); // auto-numbered
    expect(o.counterpartyId).toBe(sampleOrder.counterpartyId);
    expect(o.statusId).toBe('new');
    expect(o.total).toBe(500000);
    expect(o.notes).toBe('Тестовый заказ на изготовление металлоконструкций');
    expect(o.date).toBeDefined();
    expect(o.plannedDate).toBeDefined();

    orderId = o._id;
  });

  it('должен создать заказ с явным номером и quotationId', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleOrder2);

    expect(res.status).toBe(201);
    expect(res.body.data.number).toBe('З-2026-099');
    expect(res.body.data.quotationId).toBe('67f000000000000000000010');
    orderId = orderId || res.body.data._id;
  });

  it('должен получить список заказов с пагинацией', async () => {
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

  it('должен получить заказ по ID', async () => {
    const res = await request(app)
      .get(`${API}/${orderId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(orderId);
  });

  it('должен обновить заказ', async () => {
    const update = {
      notes: 'Обновлённый тестовый заказ',
      statusId: 'in_progress',
      total: 550000,
    };

    const res = await request(app)
      .put(`${API}/${orderId}`)
      .set(auth())
      .send(update);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notes).toBe('Обновлённый тестовый заказ');
    expect(res.body.data.statusId).toBe('in_progress');
    expect(res.body.data.total).toBe(550000);
  });

  it('должен удалить заказ', async () => {
    const res = await request(app)
      .delete(`${API}/${orderId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // verify deletion
    const getRes = await request(app)
      .get(`${API}/${orderId}`)
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

describe('Order API — search, sort, pagination', () => {
  beforeAll(async () => {
    // Ensure multiple orders exist for search/sort/pagination tests
    const count = await OrderModel.countDocuments();
    if (count < 5) {
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(API)
          .set(auth())
          .send({
            counterpartyId: `67f00000000000000000000${i + 3}`,
            statusId: i === 0 ? 'draft' : 'confirmed',
            total: (i + 1) * 100000,
            notes: `Поисковый заказ №${i + 1}`,
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
    expect(res.body.data.every((o: any) => o.number?.includes('2026'))).toBe(true);
  });

  it('должен искать по номеру', async () => {
    const res = await request(app)
      .get(`${API}?search=099`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((o: any) => o.number?.includes('099'))).toBe(true);
  });

  it('должен фильтровать по statusId', async () => {
    const res = await request(app)
      .get(`${API}?statusId=confirmed`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.every((o: any) => o.statusId === 'confirmed')).toBe(true);
  });

  it('должен фильтровать по counterpartyId', async () => {
    // Use counterpartyId from the second order (not deleted)
    const res = await request(app)
      .get(`${API}?counterpartyId=67f000000000000000000002`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((o: any) => o.counterpartyId === '67f000000000000000000002')).toBe(true);
  });

  it('должен сортировать по number asc', async () => {
    const res = await request(app)
      .get(`${API}?sort=number&order=asc`)
      .set(auth());

    expect(res.status).toBe(200);
    const numbers = res.body.data.map((o: any) => o.number);
    const sorted = [...numbers].sort();
    expect(numbers).toEqual(sorted);
  });

  it('должен сортировать по total desc', async () => {
    const res = await request(app)
      .get(`${API}?sort=total&order=desc`)
      .set(auth());

    expect(res.status).toBe(200);
    const totals = res.body.data.map((o: any) => o.total);
    const sorted = [...totals].sort((a: number, b: number) => b - a);
    expect(totals).toEqual(sorted);
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
    // Soft-delete one order
    const listRes = await request(app).get(API).set(auth());
    if (listRes.body.data.length > 0) {
      const id = listRes.body.data[0]._id;
      await OrderModel.findByIdAndUpdate(id, { isActive: false });
    }

    // Without ?all=true — only active
    const activeRes = await request(app).get(API).set(auth());
    expect(activeRes.body.data.every((o: any) => o.isActive !== false)).toBe(true);

    // With ?all=true — all records
    const allRes = await request(app).get(`${API}?all=true`).set(auth());
    expect(allRes.body.data.some((o: any) => o.isActive === false)).toBe(true);
  });

  it('должен комбинировать search + sort + пагинацию', async () => {
    const res = await request(app)
      .get(`${API}?search=З-&sort=number&order=desc&page=1&limit=10`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
