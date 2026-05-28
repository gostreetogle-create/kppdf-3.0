const fs = require('fs');
const filePath = 'D:/invSportiN/Сайт/yougile-sync-server/src/services/logger.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

const oldBlock = `// В production — ещё и файл
if (process.env.NODE_ENV === 'production') {
  const fs = await import('fs');
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
  logger.add(
    new winston.transports.File({ filename: \`\${LOG_DIR}/error.log\`, level: 'error' }),
  );
  logger.add(
    new winston.transports.File({ filename: \`\${LOG_DIR}/combined.log\` }),
  );
}`;

const newBlock = `// В production — ещё и файл (синхронная инициализация)
try {
  const { existsSync, mkdirSync } = require('fs');
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
  logger.add(
    new winston.transports.File({ filename: LOG_DIR + '/error.log', level: 'error' }),
  );
  logger.add(
    new winston.transports.File({ filename: LOG_DIR + '/combined.log' }),
  );
} catch (e) {
  // Если fs недоступен — логи пишутся в консоль
}`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync(filePath, content);
  console.log('OK: logger.service.ts fixed');
} else {
  console.log('Block NOT FOUND - checking file...');
  const idx = content.indexOf('await import');
  if (idx >= 0) {
    console.log('Found await import at', idx, 'context:');
    console.log(content.slice(idx - 30, idx + 150));
  } else {
    console.log('No await import found');
    const lines = content.split('\n');
    console.log('File has', lines.length, 'lines');
    for (let i = 27; i <= Math.min(lines.length, 42); i++) {
      console.log(i + ': ' + lines[i-1]);
    }
  }
}
