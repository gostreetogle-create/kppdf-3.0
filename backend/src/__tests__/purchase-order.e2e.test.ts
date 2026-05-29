import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { config } from '../config';
import { UserModel } from '../modules/users/user.model';
import { RoleModel } from '../modules/roles/role.model';
import { CounterModel } from '../modules/counters/counter.model';
import { PurchaseOrderModel } from '../modules/purchase-orders/purchaseOrder.model';

let mongoServer: MongoMemoryServer;
let authToken: string;
let purchaseOrderId: string;

const API = '/api/v1/directories/purchase-orders';
const AUTH_API = '/api/v1/auth';

// ── Test data ──────────────────────────────────────────────────

const sampleOrder = {
  supplierId: '67f000000000000000000001',
  orderDate: new Date('2026-06-01'),
  deliveryDate: new Date('2026-06-20'),
  statusId: 'new',
  total: 345000,
  notes: 'Лист стальной 3мм — 50 листов',
};

const sampleOrder2 = {
  supplierId: '67f000000000000000000002',
  number: 'ПЗ-2026-099',
  orderDate: new Date('2026-06-05'),
  deliveryDate: new Date('2026-06-25'),
  statusId: 'sent',
  total: 85600,
  notes: 'Крепёж М8/М10 — 2000 шт.',
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

  // Seed purchase_order counter for auto-numbering
  await CounterModel.create({
    entity: 'purchase_order',
    prefix: 'ПЗ-',
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

describe('PurchaseOrder API — auth', () => {
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

describe('PurchaseOrder API — CRUD', () => {
  it('должен создать заказ поставщику с автонумерацией', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleOrder);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const po = res.body.data;
    expect(po.number).toMatch(/^ПЗ-\d{4}-\d{3}$/); // auto-numbered
    expect(po.supplierId).toBe(sampleOrder.supplierId);
    expect(po.statusId).toBe('new');
    expect(po.total).toBe(345000);
    expect(po.notes).toBe('Лист стальной 3мм — 50 листов');
    expect(po.orderDate).toBeDefined();
    expect(po.deliveryDate).toBeDefined();

    purchaseOrderId = po._id;
  });

  it('должен создать заказ поставщику с явным номером', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleOrder2);

    expect(res.status).toBe(201);
    expect(res.body.data.number).toBe('ПЗ-2026-099');
    expect(res.body.data.supplierId).toBe('67f000000000000000000002');
    expect(res.body.data.statusId).toBe('sent');
    expect(res.body.data.total).toBe(85600);
    purchaseOrderId = purchaseOrderId || res.body.data._id;
  });

  it('должен получить список заказов поставщикам с пагинацией', async () => {
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

  it('должен получить заказ поставщику по ID', async () => {
    const res = await request(app)
      .get(`${API}/${purchaseOrderId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(purchaseOrderId);
  });

  it('должен обновить заказ поставщику', async () => {
    const update = {
      notes: 'Обновлённый заказ поставщику',
      statusId: 'confirmed_by_supplier',
      total: 350000,
    };

    const res = await request(app)
      .put(`${API}/${purchaseOrderId}`)
      .set(auth())
      .send(update);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notes).toBe('Обновлённый заказ поставщику');
    expect(res.body.data.statusId).toBe('confirmed_by_supplier');
    expect(res.body.data.total).toBe(350000);
  });

  it('должен удалить заказ поставщику', async () => {
    const res = await request(app)
      .delete(`${API}/${purchaseOrderId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // verify deletion
    const getRes = await request(app)
      .get(`${API}/${purchaseOrderId}`)
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

describe('PurchaseOrder API — search, sort, pagination', () => {
  beforeAll(async () => {
    // Ensure multiple purchase orders exist for search/sort/pagination tests
    const count = await PurchaseOrderModel.countDocuments();
    if (count < 5) {
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(API)
          .set(auth())
          .send({
            supplierId: `67f00000000000000000000${i + 3}`,
            statusId: i === 0 ? 'new' : 'sent',
            total: (i + 1) * 100000,
            notes: `Поисковый заказ поставщику №${i + 1}`,
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
    expect(res.body.data.every((po: any) => po.number?.includes('2026'))).toBe(true);
  });

  it('должен искать по номеру заказа', async () => {
    const res = await request(app)
      .get(`${API}?search=099`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((po: any) => po.number?.includes('099'))).toBe(true);
  });

  it('должен фильтровать по statusId', async () => {
    const res = await request(app)
      .get(`${API}?statusId=sent`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.every((po: any) => po.statusId === 'sent')).toBe(true);
  });

  it('должен фильтровать по supplierId', async () => {
    // Use supplierId from the second order (not deleted)
    const res = await request(app)
      .get(`${API}?supplierId=67f000000000000000000002`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((po: any) => po.supplierId === '67f000000000000000000002')).toBe(true);
  });

  it('должен сортировать по number asc', async () => {
    const res = await request(app)
      .get(`${API}?sort=number&order=asc`)
      .set(auth());

    expect(res.status).toBe(200);
    const numbers = res.body.data.map((po: any) => po.number);
    const sorted = [...numbers].sort();
    expect(numbers).toEqual(sorted);
  });

  it('должен сортировать по total desc', async () => {
    const res = await request(app)
      .get(`${API}?sort=total&order=desc`)
      .set(auth());

    expect(res.status).toBe(200);
    const totals = res.body.data.map((po: any) => po.total);
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
    // Soft-delete one purchase order
    const listRes = await request(app).get(API).set(auth());
    if (listRes.body.data.length > 0) {
      const id = listRes.body.data[0]._id;
      await PurchaseOrderModel.findByIdAndUpdate(id, { isActive: false });
    }

    // Without ?all=true — only active
    const activeRes = await request(app).get(API).set(auth());
    expect(activeRes.body.data.every((po: any) => po.isActive !== false)).toBe(true);

    // With ?all=true — all records
    const allRes = await request(app).get(`${API}?all=true`).set(auth());
    expect(allRes.body.data.some((po: any) => po.isActive === false)).toBe(true);
  });

  it('должен комбинировать search + sort + пагинацию', async () => {
    const res = await request(app)
      .get(`${API}?search=ПЗ-&sort=number&order=desc&page=1&limit=10`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
