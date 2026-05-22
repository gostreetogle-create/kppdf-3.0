import { config } from './config';
import { connectDb } from './config/db';
import app from './app';

async function start(): Promise<void> {
  await connectDb();

  app.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`);
    console.log(`📋 Health: http://localhost:${config.port}/api/v1/health`);
  });
}

start().catch(console.error);
