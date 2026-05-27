const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const backend = path.join(process.cwd(), 'backend');

// --- Step 1: Kill existing node processes ---
try { require('child_process').execSync('taskkill /f /im node.exe 2>nul', { stdio: 'ignore' }); } catch {}
setTimeout(main, 3000);

function main() {
  console.log('=== Starting KPPDF 3.0 ===\n');

  const dev = spawn('node', [path.join(backend, 'dev.js')], {
    cwd: backend,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' }
  });

  let buf = '';
  dev.stdout.on('data', d => buf += d.toString());
  dev.stderr.on('data', d => buf += d.toString());

  setTimeout(test, 55000);

  function test() {
    console.log(buf.split('\n').filter(l => l.trim()).slice(-5).join('\n'));
    console.log('\n=== Testing Endpoints ===\n');

    const endpoints = [
      ['GET  /api/v1/health', '/api/v1/health', 'GET'],
      ['GET  /api/v1/directories/products', '/api/v1/directories/products', 'GET'],
      ['GET  /api/v1/directories/categories', '/api/v1/directories/categories', 'GET'],
      ['GET  /api/v1/directories/counterparties', '/api/v1/directories/counterparties', 'GET'],
      ['GET  /api/v1/directories/users', '/api/v1/directories/users', 'GET'],
      ['GET  /api/v1/directories/roles', '/api/v1/directories/roles', 'GET'],
      ['GET  /api/v1/directories/statuses', '/api/v1/directories/statuses', 'GET'],
      ['GET  /api/v1/directories/work-types', '/api/v1/directories/work-types', 'GET'],
      ['GET  /api/v1/directories/settings', '/api/v1/directories/settings', 'GET'],
      ['POST /api/v1/auth/login', '/api/v1/auth/login', 'POST', { username: 'admin', password: 'admin123' }],
      ['GET  /api/v1/dashboard/stats', '/api/v1/dashboard/stats', 'GET'],
    ];

    let ok = 0, total = 0;
    let idx = 0;

    function next() {
      if (idx >= endpoints.length) {
        console.log(`\n${ok}/${total} endpoints OK`);
        dev.kill();
        process.exit(ok === total ? 0 : 1);
        return;
      }

      const [name, url, method, body] = endpoints[idx];
      total++;

      if (method === 'GET') {
        http.get('http://localhost:3000' + url, res => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            try { JSON.parse(d); if (res.statusCode === 200) ok++; } catch {}
            console.log((res.statusCode === 200 ? '  OK  ' : '  FAIL ') + name + ' [' + res.statusCode + ']');
            idx++;
            next();
          });
        }).on('error', _err => {
          console.log('  FAIL ' + name + ' [ERR]');
          idx++;
          next();
        });
      } else {
        const s = JSON.stringify(body);
        const req = http.request('http://localhost:3000' + url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(s) }
        }, res => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            try {
              const j = JSON.parse(d);
              if (res.statusCode === 200) ok++;
              console.log((res.statusCode === 200 ? '  OK  ' : '  FAIL ') + name + ' [' + res.statusCode + '] ' + (j.data?.token ? '(token:yes)' : ''));
            } catch {
              console.log('  FAIL ' + name + ' [PARSE_ERR]');
            }
            idx++;
            next();
          });
        });
        req.on('error', () => { console.log('  FAIL ' + name + ' [ERR]'); idx++; next(); });
        req.write(s);
        req.end();
      }
    }

    next();
  }
}
