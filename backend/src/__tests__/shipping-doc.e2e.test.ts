import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { config } from '../config';
import { UserModel } from '../modules/users/user.model';
import { RoleModel } from '../modules/roles/role.model';
import { CounterModel } from '../modules/counters/counter.model';
import { ShippingDocModel } from '../modules/shipping-docs/shippingDoc.model';

let mongoServer: MongoMemoryServer;
let authToken: string;
let shippingDocId: string;

const API = '/api/v1/directories/shipping-docs';
const AUTH_API = '/api/v1/auth';

// ── Test data ──────────────────────────────────────────────────

const sampleDoc = {
  type: 'torg12',
  shipmentId: '67f000000000000000000001',
  totalAmount: 450000,
};

const sampleDoc2 = {
  number: 'ДО-2026-099',
  type: 'invoice',
  shipmentId: '67f000000000000000000002',
  totalAmount: 85600,
  pdfUrl: 'https://example.com/doc.pdf',
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

  // Seed shipping_doc counter for auto-numbering
  await CounterModel.create({
    entity: 'shipping_doc',
    prefix: 'ДО-',
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

describe('ShippingDoc API — auth', () => {
  it('должен вернуть 401 без токена (GET /)', async () => {
    const res = await request(app).get(API);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('должен вернуть 401 без токена (POST /)', async () => {
    const res = await request(app).post(API).send(sampleDoc);
    expect(res.status).toBe(401);
  });

  it('должен вернуть 401 без токена (PUT /:id)', async () => {
    const res = await request(app).put(`${API}/${new mongoose.Types.ObjectId()}`).send({ type: 'invoice' });
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

describe('ShippingDoc API — CRUD', () => {
  it('должен создать отгрузочный документ с автонумерацией', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleDoc);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const d = res.body.data;
    expect(d.number).toMatch(/^ДО-\d{4}-\d{3}$/); // auto-numbered
    expect(d.type).toBe('torg12');
    expect(d.shipmentId).toBe('67f000000000000000000001');
    expect(d.totalAmount).toBe(450000);
    expect(d.date).toBeDefined();

    shippingDocId = d._id;
  });

  it('должен создать отгрузочный документ с явным номером', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleDoc2);

    expect(res.status).toBe(201);
    const d = res.body.data;
    expect(d.number).toBe('ДО-2026-099');
    expect(d.type).toBe('invoice');
    expect(d.shipmentId).toBe('67f000000000000000000002');
    expect(d.totalAmount).toBe(85600);
    expect(d.pdfUrl).toBe('https://example.com/doc.pdf');

    shippingDocId = shippingDocId || d._id;
  });

  it('должен получить список отгрузочных документов с пагинацией', async () => {
    const res = await request(app)
      .get(`${API}?all=true`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(50);
  });

  it('должен получить документ по ID', async () => {
    const res = await request(app)
      .get(`${API}/${shippingDocId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(shippingDocId);
  });

  it('должен обновить отгрузочный документ', async () => {
    const update = {
      type: 'ttn',
      totalAmount: 500000,
      pdfUrl: 'https://example.com/updated.pdf',
    };

    const res = await request(app)
      .put(`${API}/${shippingDocId}`)
      .set(auth())
      .send(update);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.type).toBe('ttn');
    expect(res.body.data.totalAmount).toBe(500000);
    expect(res.body.data.pdfUrl).toBe('https://example.com/updated.pdf');
  });

  it('должен удалить отгрузочный документ', async () => {
    const res = await request(app)
      .delete(`${API}/${shippingDocId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // verify deletion
    const getRes = await request(app)
      .get(`${API}/${shippingDocId}`)
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

describe('ShippingDoc API — search, sort, pagination', () => {
  beforeAll(async () => {
    // Ensure multiple docs exist for search/sort/pagination tests
    const count = await ShippingDocModel.countDocuments();
    if (count < 5) {
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(API)
          .set(auth())
          .send({
            type: i === 0 ? 'torg12' : 'invoice',
            shipmentId: `67f00000000000000000000${i + 3}`,
            totalAmount: (i + 1) * 100000,
          });
      }
    }
  });

  it('должен искать по тексту в number', async () => {
    const res = await request(app)
      .get(`${API}?all=true&search=2026`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((d: any) => d.number?.includes('2026'))).toBe(true);
  });

  it('должен искать по номеру документа', async () => {
    const res = await request(app)
      .get(`${API}?all=true&search=099`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((d: any) => d.number?.includes('099'))).toBe(true);
  });

  it('должен фильтровать по type', async () => {
    const res = await request(app)
      .get(`${API}?all=true&type=invoice`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.every((d: any) => d.type === 'invoice')).toBe(true);
  });

  it('должен фильтровать по shipmentId', async () => {
    // Use shipmentId from the doc that is not deleted
    const res = await request(app)
      .get(`${API}?all=true&shipmentId=67f000000000000000000002`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((d: any) => d.shipmentId === '67f000000000000000000002')).toBe(true);
  });

  it('должен сортировать по number asc', async () => {
    const res = await request(app)
      .get(`${API}?all=true&sort=number&order=asc`)
      .set(auth());

    expect(res.status).toBe(200);
    const numbers = res.body.data.map((d: any) => d.number);
    const sorted = [...numbers].sort();
    expect(numbers).toEqual(sorted);
  });

  it('должен сортировать по totalAmount desc', async () => {
    const res = await request(app)
      .get(`${API}?all=true&sort=totalAmount&order=desc`)
      .set(auth());

    expect(res.status).toBe(200);
    const amounts = res.body.data.map((d: any) => d.totalAmount);
    const sorted = [...amounts].sort((a: number, b: number) => b - a);
    expect(amounts).toEqual(sorted);
  });

  it('должен поддерживать пагинацию с limit и page', async () => {
    const res = await request(app)
      .get(`${API}?all=true&page=1&limit=2`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
    expect(res.body.totalPages).toBeGreaterThanOrEqual(1);
  });

  it('должен комбинировать search + sort + пагинацию', async () => {
    const res = await request(app)
      .get(`${API}?all=true&search=ДО-&sort=number&order=desc&page=1&limit=10`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
