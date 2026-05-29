import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { config } from '../config';
import { UserModel } from '../modules/users/user.model';
import { RoleModel } from '../modules/roles/role.model';
import { CounterModel } from '../modules/counters/counter.model';
import { QuotationModel } from '../modules/quotations/quotation.model';

let mongoServer: MongoMemoryServer;
let authToken: string;
let quotationId: string;

const API = '/api/v1/directories/quotations';
const AUTH_API = '/api/v1/auth';

// ── Test data ──────────────────────────────────────────────────

const sampleQuotation = {
  counterpartyId: '67f000000000000000000001',
  date: new Date('2026-05-28'),
  validUntil: new Date('2026-06-28'),
  statusId: 'draft',
  notes: 'Тестовое КП',
  items: [
    {
      productId: '67f000000000000000000010',
      tableKind: 'products',
      sku: 'TST-001',
      name: 'Тестовый товар 1',
      qty: 10,
      unit: 'шт',
      price: 1500,
    },
    {
      productId: '67f000000000000000000011',
      tableKind: 'services',
      sku: 'SRV-001',
      name: 'Тестовая услуга 1',
      qty: 1,
      unit: 'усл',
      price: 25000,
    },
  ],
};

const sampleQuotation2 = {
  counterpartyId: '67f000000000000000000002',
  number: 'КП-2026-099',
  date: new Date('2026-05-20'),
  validUntil: new Date('2026-06-20'),
  statusId: 'sent',
  notes: 'Поисковый тест КП',
  items: [
    {
      name: 'Товар для поиска',
      sku: 'SRCH-001',
      qty: 5,
      unit: 'шт',
      price: 3000,
    },
  ],
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

  // Seed quotation counter for auto-numbering
  await CounterModel.create({
    entity: 'quotation',
    prefix: 'КП-',
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

describe('Quotation API — auth', () => {
  it('должен вернуть 401 без токена (GET /)', async () => {
    const res = await request(app).get(API);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('должен вернуть 401 без токена (POST /)', async () => {
    const res = await request(app).post(API).send(sampleQuotation);
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

  it('должен пройти login с admin/admin123 и получить токен', async () => {
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

describe('Quotation API — CRUD', () => {
  it('должен создать КП с авт. нумерацией и расчётом сумм', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleQuotation);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const q = res.body.data;
    expect(q.number).toMatch(/^КП-\d{4}-\d{3}$/); // auto-numbered
    expect(q.counterpartyId).toBe(sampleQuotation.counterpartyId);
    expect(q.statusId).toBe('draft');
    expect(q.notes).toBe('Тестовое КП');

    // Item sum auto-calculation: 10 * 1500 = 15000, 1 * 25000 = 25000
    expect(q.items).toHaveLength(2);
    expect(q.items[0].sum).toBe(15000);
    expect(q.items[1].sum).toBe(25000);

    // Each item has order assigned
    expect(q.items[0].order).toBe(0);
    expect(q.items[1].order).toBe(1);

    quotationId = q._id;
  });

  it('должен создать КП с явным номером', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleQuotation2);

    expect(res.status).toBe(201);
    expect(res.body.data.number).toBe('КП-2026-099');
    quotationId = quotationId || res.body.data._id;
  });

  it('должен получить список КП с пагинацией', async () => {
    const res = await request(app)
      .get(API)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    // Now we should have both quotations created
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(50);
    expect(res.body.totalPages).toBe(1);
  });

  it('должен получить КП по ID', async () => {
    const res = await request(app)
      .get(`${API}/${quotationId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(quotationId);
  });

  it('должен обновить КП', async () => {
    const update = {
      notes: 'Обновлённое тестовое КП',
      statusId: 'sent',
    };

    const res = await request(app)
      .put(`${API}/${quotationId}`)
      .set(auth())
      .send(update);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notes).toBe('Обновлённое тестовое КП');
    expect(res.body.data.statusId).toBe('sent');
  });

  it('должен пересчитать суммы items при обновлении', async () => {
    const update = {
      items: [
        {
          name: 'Обновлённый товар',
          qty: 3,
          price: 5000,
        },
      ],
    };

    const res = await request(app)
      .put(`${API}/${quotationId}`)
      .set(auth())
      .send(update);

    expect(res.status).toBe(200);
    expect(res.body.data.items[0].sum).toBe(15000); // 3 * 5000
  });

  it('должен удалить КП', async () => {
    const res = await request(app)
      .delete(`${API}/${quotationId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // verify deletion
    const getRes = await request(app)
      .get(`${API}/${quotationId}`)
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

describe('Quotation API — search, sort, pagination', () => {
  beforeAll(async () => {
    // Ensure multiple quotations exist for search/sort/pagination tests
    const count = await QuotationModel.countDocuments();
    if (count < 5) {
      const extraItems = [
        { name: 'Для сортировки A', sku: 'SORT-A', qty: 1, price: 100 },
        { name: 'Для сортировки B', sku: 'SORT-B', qty: 2, price: 200 },
        { name: 'Для сортировки C', sku: 'SORT-C', qty: 3, price: 300 },
      ];
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(API)
          .set(auth())
          .send({
            counterpartyId: `67f00000000000000000000${i + 3}`,
            notes: `Searchable КП №${i + 1} (вар. ${String.fromCharCode(65 + i)})`, // 'A', 'B', 'C'
            items: [extraItems[i]],
          });
      }
    }
  });

  it('должен искать по тексту в number', async () => {
    // Searchable notes use default searchFields: name, number, label
    // Quotation only has 'number' as a searchable top-level field
    const res = await request(app)
      .get(`${API}?search=2026`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((q: any) => q.number?.includes('2026'))).toBe(true);
  });

  it('должен искать по номеру кп', async () => {
    const res = await request(app)
      .get(`${API}?search=099`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((q: any) => q.number?.includes('099'))).toBe(true);
  });

  it('должен фильтровать по statusId', async () => {
    const res = await request(app)
      .get(`${API}?statusId=draft`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.every((q: any) => q.statusId === 'draft')).toBe(true);
  });

  it('должен сортировать по number asc', async () => {
    const res = await request(app)
      .get(`${API}?sort=number&order=asc`)
      .set(auth());

    expect(res.status).toBe(200);
    const numbers = res.body.data.map((q: any) => q.number);
    const sorted = [...numbers].sort();
    expect(numbers).toEqual(sorted);
  });

  it('должен сортировать по number desc', async () => {
    const res = await request(app)
      .get(`${API}?sort=number&order=desc`)
      .set(auth());

    expect(res.status).toBe(200);
    const numbers = res.body.data.map((q: any) => q.number);
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
    // First, soft-delete one quotation
    const allRes = await request(app).get(API).set(auth());
    if (allRes.body.data.length > 0) {
      const id = allRes.body.data[0]._id;
      await QuotationModel.findByIdAndUpdate(id, { isActive: false });
    }

    // Without ?all=true — only active
    const activeRes = await request(app).get(API).set(auth());
    expect(activeRes.body.data.every((q: any) => q.isActive !== false)).toBe(true);

    // With ?all=true — all records
    const allRes2 = await request(app).get(`${API}?all=true`).set(auth());
    expect(allRes2.body.data.some((q: any) => q.isActive === false)).toBe(true);
  });

  it('должен комбинировать search + sort + пагинацию', async () => {
    const res = await request(app)
      .get(`${API}?search=КП&sort=number&order=desc&page=1&limit=10`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
