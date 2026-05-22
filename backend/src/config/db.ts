import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from '../config';

let memoryServer: MongoMemoryServer | null = null;

/**
 * Подключается к MongoDB.
 * - Если MONGO_URI задан явно (не дефолтный) — использует его.
 * - Если MONGO_URI дефолтный и недоступен — запускает встроенный MongoDB Memory Server.
 */
export async function connectDb(): Promise<void> {
  let uri = config.mongoUri;

  // Если URI задан явно — пробуем подключиться без fallback
  if (uri !== 'mongodb://localhost:27017/kppdf-3.0') {
    try {
      await mongoose.connect(uri);
      console.log('✅ MongoDB connected:', uri);
      return;
    } catch (err) {
      console.error('❌ Failed to connect to MongoDB:', (err as Error).message);
      process.exit(1);
    }
  }

  // Дефолтный URI — пробуем localhost, затем memory server
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log('✅ MongoDB connected (local):', uri);
  } catch {
    console.log('⚠️  Local MongoDB unavailable, starting in-memory server...');
    try {
      memoryServer = await MongoMemoryServer.create({
        instance: { dbName: 'kppdf-3.0' },
      });
      uri = memoryServer.getUri();
      await mongoose.connect(uri);
      console.log('✅ MongoDB connected (in-memory):', uri);
    } catch (err) {
      console.error('❌ Failed to start MongoDB:', (err as Error).message);
      process.exit(1);
    }
  }
}

/**
 * Останавливает Memory Server.
 */
export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
}
