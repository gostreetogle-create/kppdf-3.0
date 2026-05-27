/* eslint-disable */
const { MongoMemoryServer } = require('mongodb-memory-server');
const { spawn } = require('child_process');
const path = require('path');

const CMD  = process.env.COMSPEC || 'cmd.exe';
const SEED = path.join(__dirname, 'src', 'seed.ts');
const MAIN = path.join(__dirname, 'src', 'index.ts');
const TSX  = path.join(__dirname, 'node_modules', '.bin', 'tsx.cmd');

async function main() {
  console.log('  Starting KPPDF 3.0 development server...\n');

  // 1. MongoDB Memory Server
  console.log('  [1/3] Starting MongoDB in-memory...');
  const mongod = await MongoMemoryServer.create({
    instance: { dbName: 'kppdf30' },
  });
  const uri = mongod.getUri();
  const env = { ...process.env, MONGO_URI: uri };
  console.log('  [1/3] MongoDB running\n');

  // Helper: run a tsx script via cmd.exe /c
  function runTsx(script) {
    return new Promise((resolve, reject) => {
      const child = spawn(CMD, ['/c', TSX + ' ' + script], {
        stdio: 'inherit',
        env,
        windowsHide: true,
      });
      child.on('error', reject);
      child.on('exit', resolve);
    });
  }

  // 2. Seed
  console.log('  [2/3] Seeding database...');
  const seedCode = await runTsx(SEED);
  if (seedCode !== 0) {
    console.error('  Seed failed with code', seedCode);
    await mongod.stop();
    process.exit(1);
  }
  console.log('  [2/3] Seed complete\n');

  // 3. Express server (foreground)
  console.log('  [3/3] Starting Express server...');
  const server = spawn(CMD, ['/c', TSX + ' ' + MAIN], {
    stdio: 'inherit',
    env,
    windowsHide: true,
  });

  process.on('SIGINT', async () => { server.kill(); await mongod.stop(); process.exit(0); });
  process.on('SIGTERM', async () => { server.kill(); await mongod.stop(); process.exit(0); });
  server.on('close', async () => { await mongod.stop(); });
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
