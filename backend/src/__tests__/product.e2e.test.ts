import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { config } from '../config';
import { UserModel } from '../modules/users/user.model';
import { RoleModel } from '../modules/roles/role.model';
import { ProductModel } from '../modules/products/product.model';

let mongoServer: MongoMemoryServer;
let authToken: string;
let productId: string;

const API = '/api/v1/directories/products';
const AUTH_API = '/api/v1/auth';

// ── Test data ──────────────────────────────────────────────────

const sampleProduct = {
  name: 'Тестовый продукт',
  sku: 'TST-001',
  kind: 'ITEM',
  unit: 'шт',
  status: 'active',
  listPrice: 1500,
  costPrice: 800,
  stockQty: 100,
  description: 'Описание тестового продукта',
  notes: 'Внутренние заметки',
};

const sampleProduct2 = {
  name: 'Тестовая услуга',
  sku: 'SRV-TEST-002',
  kind: 'SERVICE',
  unit: 'ч',
  status: 'draft',
  listPrice: 5000,
  costPrice: 2500,
  description: 'Консультационные услуги',
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

describe('Product API — auth', () => {
  it('должен вернуть 401 без токена (GET /)', async () => {
    const res = await request(app).get(API);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('должен вернуть 401 без токена (POST /)', async () => {
    const res = await request(app).post(API).send(sampleProduct);
    expect(res.status).toBe(401);
  });

  it('должен вернуть 401 без токена (PUT /:id)', async () => {
    const res = await request(app).put(`${API}/${new mongoose.Types.ObjectId()}`).send({ name: 'new' });
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

describe('Product API — CRUD', () => {
  it('должен создать продукт со всеми полями', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleProduct);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const p = res.body.data;
    expect(p.name).toBe('Тестовый продукт');
    expect(p.sku).toBe('TST-001');
    expect(p.kind).toBe('ITEM');
    expect(p.unit).toBe('шт');
    expect(p.status).toBe('active');
    expect(p.listPrice).toBe(1500);
    expect(p.costPrice).toBe(800);
    expect(p.stockQty).toBe(100);
    expect(p.description).toBe('Описание тестового продукта');
    expect(p.notes).toBe('Внутренние заметки');
    expect(p.isActive).toBe(true); // default

    productId = p._id;
  });

  it('должен создать продукт с минимальными полями', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleProduct2);

    expect(res.status).toBe(201);
    const p = res.body.data;
    expect(p.name).toBe('Тестовая услуга');
    expect(p.sku).toBe('SRV-TEST-002');
    expect(p.kind).toBe('SERVICE');
    expect(p.unit).toBe('ч'); // default
    expect(p.status).toBe('draft');
    expect(p.listPrice).toBe(5000);
    expect(p.isActive).toBe(true);

    productId = productId || p._id;
  });

  it('должен получить список продуктов с пагинацией', async () => {
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

  it('должен получить продукт по ID', async () => {
    const res = await request(app)
      .get(`${API}/${productId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(productId);
  });

  it('должен обновить продукт', async () => {
    const update = {
      name: 'Обновлённый продукт',
      listPrice: 2000,
      status: 'archived',
    };

    const res = await request(app)
      .put(`${API}/${productId}`)
      .set(auth())
      .send(update);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Обновлённый продукт');
    expect(res.body.data.listPrice).toBe(2000);
    expect(res.body.data.status).toBe('archived');
  });

  it('должен удалить продукт', async () => {
    const res = await request(app)
      .delete(`${API}/${productId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // verify deletion
    const getRes = await request(app)
      .get(`${API}/${productId}`)
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

describe('Product API — search, sort, pagination', () => {
  beforeAll(async () => {
    // Ensure multiple products exist for search/sort/pagination tests
    const count = await ProductModel.countDocuments();
    if (count < 5) {
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(API)
          .set(auth())
          .send({
            name: `Поисковый продукт №${i + 1}`,
            sku: `SRCH-00${i + 1}`,
            kind: i === 0 ? 'WORK' : 'ITEM',
            unit: 'шт',
            status: i === 0 ? 'active' : 'draft',
            listPrice: (i + 1) * 1000,
            stockQty: (i + 1) * 10,
          });
      }
    }
  });

  it('должен искать по полю name (кастомный searchField)', async () => {
    const res = await request(app)
      .get(`${API}?search=Поисковый`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((p: any) => p.name?.includes('Поисковый'))).toBe(true);
  });

  it('должен искать по полю sku (кастомный searchField)', async () => {
    const res = await request(app)
      .get(`${API}?search=SRCH`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((p: any) => p.sku?.includes('SRCH'))).toBe(true);
  });

  it('должен фильтровать по kind', async () => {
    const res = await request(app)
      .get(`${API}?kind=WORK`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((p: any) => p.kind === 'WORK')).toBe(true);
  });

  it('должен фильтровать по status', async () => {
    const res = await request(app)
      .get(`${API}?status=draft`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((p: any) => p.status === 'draft')).toBe(true);
  });

  it('должен сортировать по name asc', async () => {
    const res = await request(app)
      .get(`${API}?sort=name&order=asc`)
      .set(auth());

    expect(res.status).toBe(200);
    const names = res.body.data.map((p: any) => p.name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it('должен сортировать по listPrice desc', async () => {
    const res = await request(app)
      .get(`${API}?sort=listPrice&order=desc`)
      .set(auth());

    expect(res.status).toBe(200);
    const prices = res.body.data.map((p: any) => p.listPrice);
    const sorted = [...prices].sort((a: number, b: number) => b - a);
    expect(prices).toEqual(sorted);
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

  it('должен показывать неактивные записи с all=true', async () => {
    // Create an inactive product first
    await request(app)
      .post(API)
      .set(auth())
      .send({
        name: 'Неактивный продукт',
        sku: 'INACTIVE-001',
        kind: 'ITEM',
        status: 'active',
        isActive: false,
      });

    // Without all=true — should not include inactive
    const resActive = await request(app)
      .get(`${API}?search=INACTIVE`)
      .set(auth());
    expect(resActive.body.data.every((p: any) => p.isActive !== false)).toBe(true);

    // With all=true — should include inactive
    const resAll = await request(app)
      .get(`${API}?all=true&search=INACTIVE`)
      .set(auth());
    expect(resAll.body.data.length).toBeGreaterThan(0);
  });

  it('должен комбинировать поиск + сортировку + пагинацию', async () => {
    const res = await request(app)
      .get(`${API}?search=Поисковый&sort=name&order=desc&page=1&limit=10`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
