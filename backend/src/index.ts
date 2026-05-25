import { config } from './config';
import { connectDb } from './config/db';
import app from './app';

async function start(): Promise<void> {
  await connectDb();

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`🚀 KPPDF 3.0 running on http://0.0.0.0:${config.port}`);
    console.log(`📋 Health: http://localhost:${config.port}/api/v1/health`);
    console.log(`🌍 Environment: ${config.nodeEnv}`);
  });
}

start().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
