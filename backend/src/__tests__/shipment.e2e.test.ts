import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { config } from '../config';
import { UserModel } from '../modules/users/user.model';
import { RoleModel } from '../modules/roles/role.model';
import { CounterModel } from '../modules/counters/counter.model';
import { ShipmentModel } from '../modules/shipments/shipment.model';

let mongoServer: MongoMemoryServer;
let authToken: string;
let shipmentId: string;

const API = '/api/v1/directories/shipments';
const AUTH_API = '/api/v1/auth';

// ── Test data ──────────────────────────────────────────────────

const sampleShipment = {
  orderId: '67f000000000000000000001',
  date: new Date('2026-06-01'),
  recipient: 'АО «ТехноПром»',
  address: 'г. Москва, ул. Индустриальная, д. 15',
  statusId: 'preparing',
  driverInfo: 'Иванов И.И., гос.номер А123ВВ777',
};

const sampleShipment2 = {
  orderId: '67f000000000000000000002',
  number: 'ОТ-2026-099',
  date: new Date('2026-06-05'),
  recipient: 'ООО «СтройМаш»',
  address: 'г. Москва, ул. Заводская, д. 10',
  statusId: 'shipped',
  driverInfo: 'Петров П.П., гос.номер В456СС178',
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

  // Seed shipment counter for auto-numbering
  await CounterModel.create({
    entity: 'shipment',
    prefix: 'ОТ-',
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

describe('Shipment API — auth', () => {
  it('должен вернуть 401 без токена (GET /)', async () => {
    const res = await request(app).get(API);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('должен вернуть 401 без токена (POST /)', async () => {
    const res = await request(app).post(API).send(sampleShipment);
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

describe('Shipment API — CRUD', () => {
  it('должен создать отгрузку с автонумерацией', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleShipment);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const s = res.body.data;
    expect(s.number).toMatch(/^ОТ-\d{4}-\d{3}$/); // auto-numbered
    expect(s.orderId).toBe(sampleShipment.orderId);
    expect(s.recipient).toBe('АО «ТехноПром»');
    expect(s.address).toBe('г. Москва, ул. Индустриальная, д. 15');
    expect(s.statusId).toBe('preparing');
    expect(s.driverInfo).toBe('Иванов И.И., гос.номер А123ВВ777');
    expect(s.date).toBeDefined();

    shipmentId = s._id;
  });

  it('должен создать отгрузку с явным номером', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleShipment2);

    expect(res.status).toBe(201);
    expect(res.body.data.number).toBe('ОТ-2026-099');
    expect(res.body.data.statusId).toBe('shipped');
    expect(res.body.data.driverInfo).toBe('Петров П.П., гос.номер В456СС178');
    shipmentId = shipmentId || res.body.data._id;
  });

  it('должен получить список отгрузок с пагинацией', async () => {
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

  it('должен получить отгрузку по ID', async () => {
    const res = await request(app)
      .get(`${API}/${shipmentId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(shipmentId);
  });

  it('должен обновить отгрузку', async () => {
    const update = {
      statusId: 'shipped',
      driverInfo: 'Обновлённый водитель, гос.номер Х999ХХ199',
    };

    const res = await request(app)
      .put(`${API}/${shipmentId}`)
      .set(auth())
      .send(update);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.statusId).toBe('shipped');
    expect(res.body.data.driverInfo).toBe('Обновлённый водитель, гос.номер Х999ХХ199');
  });

  it('должен удалить отгрузку', async () => {
    const res = await request(app)
      .delete(`${API}/${shipmentId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // verify deletion
    const getRes = await request(app)
      .get(`${API}/${shipmentId}`)
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

describe('Shipment API — search, sort, pagination', () => {
  beforeAll(async () => {
    // Ensure multiple shipments exist for search/sort/pagination tests
    const count = await ShipmentModel.countDocuments();
    if (count < 5) {
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(API)
          .set(auth())
          .send({
            orderId: `67f00000000000000000000${i + 3}`,
            recipient: i === 0 ? 'ООО «ТестовыйПолучатель»' : `Получатель ${String.fromCharCode(65 + i)}`,
            address: `г. Москва, ул. Тестовая, д. ${i + 1}`,
            statusId: i === 0 ? 'preparing' : 'delivered',
            driverInfo: `Водитель ${String.fromCharCode(65 + i)}`,
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
    expect(res.body.data.every((s: any) => s.number?.includes('2026'))).toBe(true);
  });

  it('должен искать по номеру отгрузки', async () => {
    const res = await request(app)
      .get(`${API}?search=099`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((s: any) => s.number?.includes('099'))).toBe(true);
  });

  it('должен фильтровать по statusId', async () => {
    const res = await request(app)
      .get(`${API}?statusId=delivered`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.every((s: any) => s.statusId === 'delivered')).toBe(true);
  });

  it('должен фильтровать по orderId', async () => {
    const res = await request(app)
      .get(`${API}?orderId=67f000000000000000000003`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.every((s: any) => s.orderId === '67f000000000000000000003')).toBe(true);
  });

  it('должен сортировать по number asc', async () => {
    const res = await request(app)
      .get(`${API}?sort=number&order=asc`)
      .set(auth());

    expect(res.status).toBe(200);
    const numbers = res.body.data.map((s: any) => s.number);
    const sorted = [...numbers].sort();
    expect(numbers).toEqual(sorted);
  });

  it('должен сортировать по number desc', async () => {
    const res = await request(app)
      .get(`${API}?sort=number&order=desc`)
      .set(auth());

    expect(res.status).toBe(200);
    const numbers = res.body.data.map((s: any) => s.number);
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
    // Soft-delete one shipment
    const listRes = await request(app).get(API).set(auth());
    if (listRes.body.data.length > 0) {
      const id = listRes.body.data[0]._id;
      await ShipmentModel.findByIdAndUpdate(id, { isActive: false });
    }

    // Without ?all=true — only active
    const activeRes = await request(app).get(API).set(auth());
    expect(activeRes.body.data.every((s: any) => s.isActive !== false)).toBe(true);

    // With ?all=true — all records
    const allRes = await request(app).get(`${API}?all=true`).set(auth());
    expect(allRes.body.data.some((s: any) => s.isActive === false)).toBe(true);
  });

  it('должен комбинировать search + sort + пагинацию', async () => {
    const res = await request(app)
      .get(`${API}?search=ОТ-&sort=number&order=desc&page=1&limit=10`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
