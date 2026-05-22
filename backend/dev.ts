import { MongoMemoryServer } from 'mongodb-memory-server';
import { spawn } from 'child_process';
import path from 'path';

async function main() {
  console.log('Starting KPPDF 3.0 in development mode...');

  // 1. Start a SINGLE in-memory MongoDB
  const mongod = await MongoMemoryServer.create({
    instance: { dbName: 'kppdf-3.0' },
  });
  const uri = mongod.getUri();

  // Write URI to a temp file so TypeScript scripts can read it
  const fs = await import('fs');
  const uriFile = path.join(__dirname, '..', '.mongouri');
  fs.writeFileSync(uriFile, uri, 'utf-8');
  console.log('MongoDB URI:', uri);

  // 2. Run seed (it will read .mongouri)
  const exitCode = await new Promise<number>((resolve) => {
    const child = spawn(
      process.env.COMSPEC || 'cmd.exe',
      ['/c', `node "${path.join(__dirname, '..', 'node_modules', '.bin', 'tsx')}" "${path.join(__dirname, 'seed.ts')}"`],
      {
        stdio: 'inherit',
        env: { ...process.env, MONGO_URI: uri },
        windowsHide: true,
      }
    );
    child.on('exit', (code) => resolve(code ?? 1));
    child.on('error', (err) => { console.error('spawn error:', err); resolve(1); });
  });

  if (exitCode !== 0) {
    console.error('Seed failed, aborting');
    fs.unlinkSync(uriFile);
    await mongod.stop();
    process.exit(1);
  }

  console.log('\nStarting Express server...\n');

  // 3. Start Express server (same MongoDB instance)
  const server = spawn(
    process.env.COMSPEC || 'cmd.exe',
    ['/c', `node "${path.join(__dirname, '..', 'node_modules', '.bin', 'tsx')}" "${path.join(__dirname, 'index.ts')}"`],
    {
      stdio: 'inherit',
      env: { ...process.env, MONGO_URI: uri },
      windowsHide: true,
    }
  );

  const cleanup = async () => {
    console.log('\nShutting down...');
    server.kill();
    try { fs.unlinkSync(uriFile); } catch {}
    await mongod.stop();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  server.on('close', async () => {
    try { fs.unlinkSync(uriFile); } catch {}
    await mongod.stop();
  });
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
