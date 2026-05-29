import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { config } from '../config';
import { UserModel } from '../modules/users/user.model';
import { RoleModel } from '../modules/roles/role.model';

let mongoServer: MongoMemoryServer;
let authToken: string;
let templateId: string;

const API = '/api/v1/document-templates';
const AUTH_API = '/api/v1/auth';

// ── Test data ──────────────────────────────────────────────────

interface ITestBlock {
  type: string;
  order: number;
  title: string;
  content: string;
  settings: Record<string, unknown>;
}

const sampleTemplate = {
  name: 'Тестовый шаблон',
  description: 'Шаблон для e2e тестирования',
  docType: 'quotation',
  organizationId: '67f000000000000000000001',
  isDefault: false,
  isActive: true,
  tags: ['тест'],
  blocks: [
    {
      type: 'header',
      order: 0,
      title: 'Заголовок',
      content: 'Тестовое КП №{{doc.number}}',
      settings: { fontSize: 16, fontWeight: 'bold', align: 'center', paddingTop: 8, paddingBottom: 12 },
    },
    {
      type: 'text',
      order: 1,
      title: 'Основной текст',
      content: 'Тестовый контент',
      settings: { fontSize: 11, fontWeight: 'normal', align: 'left', paddingTop: 8, paddingBottom: 8 },
    },
  ] as ITestBlock[],
};

const sampleTemplate2 = {
  name: 'Тестовый договор',
  docType: 'contract',
  organizationId: '67f000000000000000000002',
  blocks: [
    {
      type: 'text',
      order: 0,
      title: 'Текст',
      content: 'Стороны договора...',
      settings: { fontSize: 11, fontWeight: 'normal', align: 'left', paddingTop: 8, paddingBottom: 8 },
    },
  ] as ITestBlock[],
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

function auth(): Record<string, string> {
  return { Authorization: `Bearer ${authToken}` };
}

// ── Auth tests ─────────────────────────────────────────────────

describe('DocumentTemplate API — auth', () => {
  it('должен вернуть 401 без токена (GET /)', async () => {
    const res = await request(app).get(API);
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('должен вернуть 401 без токена (POST /)', async () => {
    const res = await request(app).post(API).send(sampleTemplate);
    expect(res.status).toBe(401);
  });

  it('должен вернуть 401 без токена (PUT /:id)', async () => {
    const res = await request(app).put(`${API}/${new mongoose.Types.ObjectId()}`).send({ name: 'x' });
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

describe('DocumentTemplate API — CRUD', () => {
  it('должен создать шаблон с meta + blocks', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleTemplate);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();

    const t = res.body.data;
    expect(t.name).toBe('Тестовый шаблон');
    expect(t.docType).toBe('quotation');
    expect(t.description).toBe('Шаблон для e2e тестирования');
    expect(t.blocks).toHaveLength(2);
    expect(t.blocks[0].type).toBe('header');
    expect(t.blocks[0].content).toBe('Тестовое КП №{{doc.number}}');
    expect(t.blocks[1].type).toBe('text');
    expect(t.blocks[1].content).toBe('Тестовый контент');

    templateId = t._id;
  });

  it('должен создать второй шаблон', async () => {
    const res = await request(app)
      .post(API)
      .set(auth())
      .send(sampleTemplate2);

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Тестовый договор');
    expect(res.body.data.blocks).toHaveLength(1);
    templateId = templateId || res.body.data._id;
  });

  it('должен получить список шаблонов с пагинацией', async () => {
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

  it('должен получить шаблон по ID', async () => {
    const res = await request(app)
      .get(`${API}/${templateId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBe(templateId);
  });

  it('должен обновить blocks шаблона (PUT)', async () => {
    const updatedBlocks: ITestBlock[] = [
      {
        type: 'header',
        order: 0,
        title: 'Обновлённый заголовок',
        content: 'Обновлённое КП',
        settings: { fontSize: 18, fontWeight: 'bold' as const, align: 'center', paddingTop: 12, paddingBottom: 16 },
      },
      {
        type: 'text',
        order: 1,
        title: 'Новый текст',
        content: 'Обновлённый контент с {{client.name}}',
        settings: { fontSize: 12, fontWeight: 'normal' as const, align: 'left', paddingTop: 8, paddingBottom: 8 },
      },
    ];

    const res = await request(app)
      .put(`${API}/${templateId}`)
      .set(auth())
      .send({ blocks: updatedBlocks });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.blocks).toHaveLength(2);
    expect(res.body.data.blocks[0].content).toBe('Обновлённое КП');
    expect(res.body.data.blocks[1].content).toBe('Обновлённый контент с {{client.name}}');

    // Проверить persist: GET after PUT
    const getRes = await request(app)
      .get(`${API}/${templateId}`)
      .set(auth());
    expect(getRes.body.data.blocks[0].content).toBe('Обновлённое КП');
  });

  it('должен обновить meta поля (PUT без blocks)', async () => {
    const update = {
      name: 'Переименованный шаблон',
      description: 'Обновлённое описание',
      isDefault: true,
      tags: ['обновлённый', 'e2e'],
    };

    const res = await request(app)
      .put(`${API}/${templateId}`)
      .set(auth())
      .send(update);

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Переименованный шаблон');
    expect(res.body.data.description).toBe('Обновлённое описание');
    expect(res.body.data.isDefault).toBe(true);
    expect(res.body.data.tags).toEqual(['обновлённый', 'e2e']);

    // Blocks должны сохраниться нетронутыми
    expect(res.body.data.blocks).toHaveLength(2);
  });

  it('должен удалить шаблон', async () => {
    const res = await request(app)
      .delete(`${API}/${templateId}`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // verify deletion
    const getRes = await request(app)
      .get(`${API}/${templateId}`)
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

describe('DocumentTemplate API — search, sort, pagination', () => {
  beforeAll(async () => {
    // Re-create templates for search/sort tests (previous describe may have deleted them)
    await request(app).post(API).set(auth()).send({
      name: 'Альфа КП',
      docType: 'quotation',
      organizationId: '67f000000000000000000001',
      blocks: [],
    });
    await request(app).post(API).set(auth()).send({
      name: 'Бета договор',
      docType: 'contract',
      organizationId: '67f000000000000000000001',
      blocks: [],
    });
    await request(app).post(API).set(auth()).send({
      name: 'Гамма счёт',
      docType: 'invoice',
      organizationId: '67f000000000000000000001',
      blocks: [],
    });
  });

  it('должен искать по названию шаблона', async () => {
    const res = await request(app)
      .get(`${API}?search=Альфа`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((q: Record<string, unknown>) => String(q.name).includes('Альфа'))).toBe(true);
  });

  it('должен фильтровать по docType', async () => {
    const res = await request(app)
      .get(`${API}?docType=contract`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.every((q: Record<string, unknown>) => q.docType === 'contract')).toBe(true);
  });

  it('должен сортировать по name asc', async () => {
    const res = await request(app)
      .get(`${API}?sort=name&order=asc`)
      .set(auth());

    expect(res.status).toBe(200);
    const names = res.body.data.map((q: Record<string, unknown>) => q.name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it('должен поддерживать пагинацию', async () => {
    const res = await request(app)
      .get(`${API}?page=1&limit=2`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(2);
  });
});
