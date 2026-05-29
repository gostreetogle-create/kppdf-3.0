import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app';
import { config } from '../config';
import { UserModel } from '../modules/users/user.model';
import { RoleModel } from '../modules/roles/role.model';
import { CounterModel } from '../modules/counters/counter.model';
import { WorkOrderModel } from '../modules/work-orders/workOrder.model';

// ---------------------------------------------------------------------------
let mongoServer: MongoMemoryServer;
let token: string;

const WORK_ORDER_URL = '/api/v1/directories/work-orders';

// Sample work-order payloads
const sampleWorkOrder = {
  orderId: '67f000000000000000000001',
  productId: '67f000000000000000000001',
  qty: 100,
  statusId: 'new',
  assignedTo: '67f000000000000000000001',
  notes: 'Плановый наряд',
};

const sampleWorkOrder2 = {
  number: 'Н-2026-050',
  orderId: '67f000000000000000000002',
  productId: '67f000000000000000000002',
  qty: 50,
  statusId: 'in_progress',
  assignedTo: '67f000000000000000000002',
  notes: 'Срочный наряд',
};

// ---------------------------------------------------------------------------
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Seed admin role with wildcard permissions
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

  // Seed work_order counter for auto-numbering
  await CounterModel.create({
    entity: 'work_order',
    prefix: 'Н-',
    year: 2026,
    seq: 0,
  });

  // Generate JWT token matching the app's auth middleware
  token = jwt.sign(
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
  await mongoServer.stop();
});

// ---------------------------------------------------------------------------
describe('WorkOrders API — Auth (401)', () => {
  it('GET / без токена → 401', async () => {
    const res = await request(app).get(WORK_ORDER_URL);
    expect(res.status).toBe(401);
  });

  it('POST / без токена → 401', async () => {
    const res = await request(app).post(WORK_ORDER_URL).send(sampleWorkOrder);
    expect(res.status).toBe(401);
  });

  it('PUT /:id без токена → 401', async () => {
    const res = await request(app).put(`${WORK_ORDER_URL}/67f000000000000000000001`).send({ statusId: 'cancelled' });
    expect(res.status).toBe(401);
  });

  it('DELETE /:id без токена → 401', async () => {
    const res = await request(app).delete(`${WORK_ORDER_URL}/67f000000000000000000001`);
    expect(res.status).toBe(401);
  });

  it('POST /auth/login admin/admin123 → должен вернуть профиль пользователя', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.username).toBe('admin');
    expect(res.body.data.role).toBe('admin');
  });
});

// ---------------------------------------------------------------------------
describe('WorkOrders API — CRUD', () => {
  let workOrderId: string;

  it('должен создать наряд с автонумерацией (Н-2026-XXX)', async () => {
    const res = await request(app)
      .post(WORK_ORDER_URL)
      .set('Authorization', `Bearer ${token}`)
      .send(sampleWorkOrder);
    expect(res.status).toBe(201);
    const q = res.body.data;
    expect(q.number).toMatch(/^Н-\d{4}-\d{3}$/);
    expect(q.statusId).toBe('new');
    expect(q.qty).toBe(100);
    workOrderId = q._id;
  });

  it('должен создать наряд с явным номером', async () => {
    const res = await request(app)
      .post(WORK_ORDER_URL)
      .set('Authorization', `Bearer ${token}`)
      .send(sampleWorkOrder2);
    expect(res.status).toBe(201);
    const q = res.body.data;
    expect(q.number).toBe('Н-2026-050');
    expect(q.statusId).toBe('in_progress');
    expect(q.qty).toBe(50);
  });

  it('должен вернуть список нарядов с пагинацией', async () => {
    const res = await request(app)
      .get(WORK_ORDER_URL)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body).toHaveProperty('total');
  });

  it('должен вернуть наряд по ID', async () => {
    const res = await request(app)
      .get(`${WORK_ORDER_URL}/${workOrderId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(workOrderId);
    expect(res.body.data.number).toMatch(/^Н-\d{4}-\d{3}$/);
  });

  it('должен обновить наряд (statusId + assignedTo)', async () => {
    const res = await request(app)
      .put(`${WORK_ORDER_URL}/${workOrderId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ statusId: 'in_progress', assignedTo: '67f000000000000000000099', notes: 'Назначен исполнитель' });
    expect(res.status).toBe(200);
    expect(res.body.data.statusId).toBe('in_progress');
    expect(res.body.data.assignedTo).toBe('67f000000000000000000099');
    expect(res.body.data.notes).toBe('Назначен исполнитель');
  });

  it('должен удалить наряд (hard delete)', async () => {
    const res = await request(app)
      .delete(`${WORK_ORDER_URL}/${workOrderId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Verify deletion — GET returns 404
    const getRes = await request(app)
      .get(`${WORK_ORDER_URL}/${workOrderId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('должен вернуть 404 для несуществующего ID', async () => {
    const res = await request(app)
      .get(`${WORK_ORDER_URL}/67f000000000000000000999`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
describe('WorkOrders API — Search / Sort / Filter / Pagination', () => {
  beforeAll(async () => {
    // Add more work orders for search/sort/filter testing
    const res = await request(app)
      .get(WORK_ORDER_URL)
      .set('Authorization', `Bearer ${token}`);
    const count = res.body.data.length;

    if (count < 5) {
      const extra: any[] = [];
      for (let i = 0; i < 3; i++) {
        extra.push({
          number: `Н-2026-01${i}`,
          orderId: `67f00000000000000000000${i + 3}`,
          productId: `67f00000000000000000000${i + 3}`,
          qty: 10 * (i + 1),
          startDate: new Date(`2026-07-0${i + 1}`),
          statusId: i === 0 ? 'new' : 'completed',
          assignedTo: `67f00000000000000000000${i + 3}`,
          notes: `Тестовый наряд ${i}`,
        });
      }
      await Promise.all(
        extra.map((wo) =>
          request(app)
            .post(WORK_ORDER_URL)
            .set('Authorization', `Bearer ${token}`)
            .send(wo),
        ),
      );
    }
  });

  it('должен искать наряды по номеру (частичное совпадение)', async () => {
    const res = await request(app)
      .get(`${WORK_ORDER_URL}?search=2026`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('должен искать наряд по точному номеру', async () => {
    const res = await request(app)
      .get(`${WORK_ORDER_URL}?search=Н-2026-050`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].number).toBe('Н-2026-050');
  });

  it('должен фильтровать по statusId', async () => {
    const res = await request(app)
      .get(`${WORK_ORDER_URL}?statusId=completed`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((wo: any) => wo.statusId === 'completed')).toBe(true);
  });

  it('должен фильтровать по statusId=new', async () => {
    const res = await request(app)
      .get(`${WORK_ORDER_URL}?statusId=new`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((wo: any) => wo.statusId === 'new')).toBe(true);
  });

  it('должен сортировать по number asc', async () => {
    const res = await request(app)
      .get(`${WORK_ORDER_URL}?sort=number&order=asc`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const numbers = res.body.data.map((wo: any) => wo.number);
    const sorted = [...numbers].sort();
    expect(numbers).toEqual(sorted);
  });

  it('должен сортировать по number desc', async () => {
    const res = await request(app)
      .get(`${WORK_ORDER_URL}?sort=number&order=desc`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const numbers = res.body.data.map((wo: any) => wo.number);
    const sorted = [...numbers].sort().reverse();
    expect(numbers).toEqual(sorted);
  });

  it('должен поддерживать пагинацию (page + limit)', async () => {
    const res = await request(app)
      .get(`${WORK_ORDER_URL}?page=1&limit=2`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
  });

  it('должен показывать неактивные записи с ?all=true', async () => {
    // Сначала установим isActive: false у одного наряда через модель
    const wo = await WorkOrderModel.findOne();
    if (wo) {
      await WorkOrderModel.findByIdAndUpdate(wo._id, { isActive: false });
    }

    // Without ?all=true — only active
    const activeRes = await request(app).get(WORK_ORDER_URL).set('Authorization', `Bearer ${token}`);
    expect(activeRes.body.data.every((w: any) => w.isActive !== false)).toBe(true);

    // With ?all=true — all records
    const allRes = await request(app).get(`${WORK_ORDER_URL}?all=true`).set('Authorization', `Bearer ${token}`);
    expect(allRes.body.data.some((w: any) => w.isActive === false)).toBe(true);
  });

  it('должен комбинировать search + sort + pagination', async () => {
    const res = await request(app)
      .get(`${WORK_ORDER_URL}?search=Н-&sort=number&order=desc&page=1&limit=10`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
