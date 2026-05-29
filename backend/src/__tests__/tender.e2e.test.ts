import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { config } from '../config';
import { UserModel } from '../modules/users/user.model';
import { RoleModel } from '../modules/roles/role.model';
import { CounterModel } from '../modules/counters/counter.model';
import { TenderModel } from '../modules/tenders/tender.model';

let mongoServer: MongoMemoryServer;
let authToken: string;
let tenderId: string;

const API = '/api/v1/directories/tenders';
const AUTH_API = '/api/v1/auth';

// ── Test data ──────────────────────────────────────────────────

const sampleTender = {
  tenderId: '5202_200',
  companyId: '67f000000000000000000001',
  email: 'test@sportin-yug.ru',
  subject: 'Поставка велопарковки для нужд МО «Город Майкоп»',
  productName: 'Велопарковка',
  quantity: 5,
  unit: 'шт',
  statusId: 'new',
};

const sampleTender2 = {
  tenderId: '5202_201',
  companyId: '67f000000000000000000002',
  number: 'Т-2026-099',
  email: 'test@sportstroy.ru',
  subject: 'Поставка скамьи парковой',
  productName: 'Скамья парковая',
  quantity: 10,
  unit: 'шт',
  deliveryTerms: 'Самовывоз',
  responseRequirements: 'КП с указанием НМЦК',
  legalBasis: 'Федеральный закон № 44-ФЗ',
  statusId: 'in_progress',
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

  // Seed tender counter for auto-numbering
  await CounterModel.create({
    entity: 'tender',
    prefix: 'Т-',
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

describe('Tender API — auth', () => {
  it('должен вернуть 401 без токена (GET /)', async () => {
    const res = await request(app).get(API);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('должен вернуть 401 без токена (POST /)', async () => {
    const res = await request(app).post(API).send(sampleTender);
    expect(res.status).toBe(401);
  });

  it('должен вернуть 401 без токена (PUT /:id)', async () => {
    const res = await request(app).put(`${API}/${new mongoose.Types.ObjectId()}`).send({ subject: 'x' });
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

describe('Tender API — CRUD', () => {
  it('должен создать тендер с автонумерацией', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleTender);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const t = res.body.data;
    expect(t.number).toMatch(/^Т-\d{4}-\d{3}$/); // auto-numbered
    expect(t.tenderId).toBe('5202_200');
    expect(t.companyId).toBe('67f000000000000000000001');
    expect(t.subject).toBe('Поставка велопарковки для нужд МО «Город Майкоп»');
    expect(t.productName).toBe('Велопарковка');
    expect(t.quantity).toBe(5);
    expect(t.unit).toBe('шт');
    expect(t.statusId).toBe('new');

    tenderId = t._id;
  });

  it('должен создать тендер с явным номером', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleTender2);

    expect(res.status).toBe(201);
    const t = res.body.data;
    expect(t.number).toBe('Т-2026-099');
    expect(t.tenderId).toBe('5202_201');
    expect(t.subject).toBe('Поставка скамьи парковой');
    expect(t.productName).toBe('Скамья парковая');
    expect(t.quantity).toBe(10);
    expect(t.deliveryTerms).toBe('Самовывоз');
    expect(t.responseRequirements).toBe('КП с указанием НМЦК');
    expect(t.legalBasis).toBe('Федеральный закон № 44-ФЗ');
    expect(t.statusId).toBe('in_progress');

    tenderId = tenderId || t._id;
  });

  it('должен получить список тендеров с пагинацией', async () => {
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

  it('должен получить тендер по ID', async () => {
    const res = await request(app)
      .get(`${API}/${tenderId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(tenderId);
  });

  it('должен обновить тендер', async () => {
    const update = {
      subject: 'Обновлённый предмет тендера',
      statusId: 'kp_sent',
      responseRequirements: 'КП с указанием НМЦК и спецификацией',
    };

    const res = await request(app)
      .put(`${API}/${tenderId}`)
      .set(auth())
      .send(update);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subject).toBe('Обновлённый предмет тендера');
    expect(res.body.data.statusId).toBe('kp_sent');
    expect(res.body.data.responseRequirements).toBe('КП с указанием НМЦК и спецификацией');
  });

  it('должен удалить тендер', async () => {
    const res = await request(app)
      .delete(`${API}/${tenderId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // verify deletion
    const getRes = await request(app)
      .get(`${API}/${tenderId}`)
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

describe('Tender API — search, sort, pagination', () => {
  beforeAll(async () => {
    // Ensure multiple tenders exist for search/sort/pagination tests
    const count = await TenderModel.countDocuments();
    if (count < 5) {
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(API)
          .set(auth())
          .send({
            tenderId: `5202_${300 + i}`,
            companyId: `67f00000000000000000000${i + 3}`,
            subject: `Поисковый тендер №${i + 1}`,
            productName: `Товар ${i + 1}`,
            quantity: (i + 1) * 2,
            statusId: i === 0 ? 'new' : 'in_progress',
          });
      }
    }
  });

  it('должен искать по тексту в number (custom searchFields)', async () => {
    const res = await request(app)
      .get(`${API}?search=2026`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((t: any) => t.number?.includes('2026'))).toBe(true);
  });

  it('должен искать по subject (custom searchFields)', async () => {
    const res = await request(app)
      .get(`${API}?search=Поисковый`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((t: any) =>
      t.subject?.includes('Поисковый') || t.number?.includes('Поисковый') || t.productName?.includes('Поисковый') || t.tenderId?.includes('Поисковый'),
    )).toBe(true);
  });

  it('должен искать по tenderId', async () => {
    const res = await request(app)
      .get(`${API}?search=5202`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((t: any) => t.tenderId?.includes('5202'))).toBe(true);
  });

  it('должен фильтровать по statusId', async () => {
    const res = await request(app)
      .get(`${API}?statusId=in_progress`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.every((t: any) => t.statusId === 'in_progress')).toBe(true);
  });

  it('должен фильтровать по companyId', async () => {
    // Use companyId from the tender that is not deleted
    const res = await request(app)
      .get(`${API}?companyId=67f000000000000000000002`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((t: any) => t.companyId === '67f000000000000000000002')).toBe(true);
  });

  it('должен сортировать по number asc', async () => {
    const res = await request(app)
      .get(`${API}?sort=number&order=asc`)
      .set(auth());

    expect(res.status).toBe(200);
    const numbers = res.body.data.map((t: any) => t.number);
    const sorted = [...numbers].sort();
    expect(numbers).toEqual(sorted);
  });

  it('должен сортировать по number desc', async () => {
    const res = await request(app)
      .get(`${API}?sort=number&order=desc`)
      .set(auth());

    expect(res.status).toBe(200);
    const numbers = res.body.data.map((t: any) => t.number);
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
    // Soft-delete one tender
    const listRes = await request(app).get(API).set(auth());
    if (listRes.body.data.length > 0) {
      const id = listRes.body.data[0]._id;
      await TenderModel.findByIdAndUpdate(id, { isActive: false });
    }

    // Without ?all=true — only active
    const activeRes = await request(app).get(API).set(auth());
    expect(activeRes.body.data.every((t: any) => t.isActive !== false)).toBe(true);

    // With ?all=true — all records
    const allRes = await request(app).get(`${API}?all=true`).set(auth());
    expect(allRes.body.data.some((t: any) => t.isActive === false)).toBe(true);
  });

  it('должен комбинировать search + sort + пагинацию', async () => {
    const res = await request(app)
      .get(`${API}?search=Т-&sort=number&order=desc&page=1&limit=10`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
