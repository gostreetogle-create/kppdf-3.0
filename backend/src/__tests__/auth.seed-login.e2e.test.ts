import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../app';
import { UserModel } from '../modules/users/user.model';
import { RoleModel } from '../modules/roles/role.model';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../utils/auth-cookies';

let mongoServer: MongoMemoryServer;

const AUTH_API = '/api/v1/auth';

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  await RoleModel.create({
    name: 'admin',
    label: 'Администратор',
    permissions: ['*'],
    isSystem: true,
  });

  // Same persistence path as seed.ts (not insertMany)
  await UserModel.create({
    username: 'admin',
    email: 'admin@kppdf.ru',
    displayName: 'Главный администратор',
    passwordHash: 'admin123',
    role: 'admin',
    isActive: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Auth — seed-style user + login', () => {
  it('POST /auth/login admin/admin123 returns profile and auth cookies', async () => {
    const res = await request(app)
      .post(`${AUTH_API}/login`)
      .send({ username: 'admin', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.username).toBe('admin');
    expect(res.body.data?.role).toBe('admin');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const joined = Array.isArray(cookies) ? cookies.join(';') : String(cookies);
    expect(joined).toContain(ACCESS_COOKIE);
    expect(joined).toContain(REFRESH_COOKIE);
  });

  it('POST /auth/login rejects wrong password after bcrypt seed user', async () => {
    const res = await request(app)
      .post(`${AUTH_API}/login`)
      .send({ username: 'admin', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
