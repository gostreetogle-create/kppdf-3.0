const https = require('https');

const API_KEY = 'Za17DZkKgxjHfFSaKb+6I28QqdmUPNPeTSP77FsewPG-cnZBY2BoaEMZJ4mmJjdu';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { Authorization: 'Bearer ' + API_KEY } }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

function putTask(taskId, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const options = {
      hostname: 'yougile.com',
      path: '/api-v2/tasks/' + taskId,
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        console.log('OK ' + taskId.substring(0, 8) + ' status:' + res.statusCode);
        resolve();
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const data = await get('https://yougile.com/api-v2/tasks?limit=100');
  const tasks = data.content || [];

  // Build fix map from current tasks
  const fixMap = {};
  tasks.forEach((t) => {
    const id = t.id;
    const desc = t.description || '';
    const hasGarbled = /[?]{4,}/.test(desc);

    if (!hasGarbled) return;

    // Determine the correct description based on task title + context
    const title = t.title || '';

    let correctDesc = '';

    if (title.includes('01.01') && title.includes('YouGile')) {
      correctDesc =
        '✅ YouGile подключён и работает через API v2.\n- Bearer-токен: получен\n- Project: PLM+ERP+CRM (53e07277-0974-4426-a091-49fc4d8f6024)\n- Board 1: Бизнес-эпики (7 колонок, 49 задач)\n- Board 2: Настройки проекта (8 колонок, 47 задач)\n- API запросы через PowerShell Invoke-RestMethod';
    } else if (title.includes('01.02') && title.includes('MCP')) {
      correctDesc =
        '✅ MCP-сервер подключён к проекту.\nРешение: не заработал стабильно (зависимости).\nЗамена: используем прямой REST API через PowerShell.\nФайл: backend/src/services/yougile.service.ts';
    } else if (title.includes('01.03') && title.includes('REST')) {
      correctDesc =
        '✅ REST-запросы: PowerShell-скрипты для работы с YouGile API.\n- получение/изменение задач (PUT /tasks/:id)\n- получение досок, колонок, задач (GET /boards, /columns, /tasks)\n- работают на запросы\n- обновляет completed, description, title';
    } else if (title.includes('01.04') && title.includes('Авторизация')) {
      correctDesc =
        '✅ Backend-реализована авторизация:\n- JWT-аутентификация (jsonwebtoken)\n- bcrypt для хеширования паролей\n- RBAC: admin, manager, viewer, engineer, storekeeper\n- AuthMiddleware: проверка токена на всех /api/*\n- Файл: backend/src/middleware/auth.ts, backend/src/modules/users/';
    } else if (title.includes('02.01') && title.includes('Orchestrator')) {
      correctDesc =
        '✅ Orchestrator — главный распределитель задач.\n- Файл: .opencode/agents/orchestrator.md\n- Режимы: plan / code / orchestrator\n- Распределяет subagent\'ов по специализации\n- QA-цикл: Coder → Build → QA → тест и фикс\n- Работает на запросы, возвращает ответ';
    } else if (title.includes('02.02') && title.includes('Subagent')) {
      correctDesc =
        '✅ 15 subagent\'ов: guardian, reviewer, ui-specialist, tester, backend-specialist, api-specialist, auth-specialist, deploy-specialist, design-system, meta-architect, production-planner, compliance-validator, ui-qa, ui-auditor\n- Файлы в .opencode/agents/\n- Каждый со специализацией, свои инструкции';
    } else if (title.includes('02.03') && title.includes('QA')) {
      correctDesc =
        '✅ QA-цикл — многоэтапная процедура проверки:\n1. Coder (@ui-specialist) пишет код по Golden Samples\n2. ng build — проверка сборки\n3. @ui-qa (Red Team) — тест по UI Manifest\n4. Результат: PASS → принято, FAIL → Coder на доработку\n5. Цикл до 3 итераций\n6. @ui-auditor — финальный аудит';
    } else if (title.includes('02.04') && title.includes('Golden')) {
      correctDesc =
        '✅ Golden Samples — эталонные паттерны:\n- TableWithPagination: striped, paginator, tags, actions\n- CrudDialog: modal, footer, w-full controls\n- Файл: .opencode/golden-samples.ts\n- Все UI-компоненты следуют этим паттернам';
    } else if (title.includes('03.01') && title.includes('Слои')) {
      correctDesc =
        '✅ Однонаправленные слои:\ncore/ → shared/ → entities/ → features/ → pages/\n- запрещены обратные импорты (защита)\n- строгие границы компонентов\n- Файл: .opencode/rules/architecture-layers.md';
    } else if (title.includes('03.02') && title.includes('Angular')) {
      correctDesc =
        '✅ Angular 21: Signals, inject(), OnPush, standalone.\n- input() / output() / signal() / computed()\n- any заменён на unknown и типизацию\n- Запрещён constructor DI — только inject()\n- Файл: .opencode/rules/angular-signals.md';
    } else if (title.includes('03.03') && title.includes('UI-стандарты')) {
      correctDesc =
        '✅ UI-стандарты:\n- все компоненты standalone\n- OnPush ChangeDetection\n- SCSS + BEM (запрещены inline-стили)\n- Dumb/Smart компоненты\n- kebab-case классы, PascalCase компоненты\n- Файл: .opencode/rules/ui-standards.md';
    } else if (title.includes('03.04') && title.includes('PrimeNG')) {
      correctDesc =
        '✅ PrimeNG v21 + Aura + PrimeIcons:\n- тема: Aura (адаптивная, кастомизируемая)\n- все компоненты standalone\n- запрещены raw button/input/table\n- Настройка: providePrimeNG({ theme: { preset: Aura }})\n- Импорт только из primeng/*\n- Файл: .opencode/rules/ui-library.md, src/styles/_tokens.scss';
    } else if (title.includes('03.05') && title.includes('Manifest')) {
      correctDesc =
        '✅ UI Manifest — конституция интерфейсов:\nОбязательные правила:\n1. Императивные правила (ALWAYS/NEVER)\n2. Верифицируемые YAML-проверки для @ui-qa\nРазделы: типографика, цвета, отступы, кнопки, формы, навигация\nФайл: .opencode/rules/ui-manifest.md';
    } else if (title.includes('03.06') && title.includes('Audit')) {
      correctDesc =
        '✅ UI Audit Checklist:\n8 разделов проверки:\n1. Типографика (7 пунктов)\n2. Цвета (5 пунктов)\n3. Отступы (6 пунктов)\n4. Кнопки (5 пунктов)\n5. Формы (3 пункта)\n6. Адаптивный дизайн (5 пунктов)\n7. Интерактивные элементы (9 пунктов)\n8. Навигация (3 пункта)\nФайл: .opencode/rules/ui-audit-checklist.md';
    } else if (title.includes('04.01') && title.includes('Технологический')) {
      correctDesc =
        '📋 В плане тестирование приложения:\n1. Настроить Jasmine/Karma для Angular-компонентов\n2. Написать тесты для CrudApiService (HTTP-запросы)\n3. Написать тесты для ModulesPageComponent (счётчики, пресеты)\n4. Написать тесты для DirectoriesPageComponent (presets, empty-state)\n5. Написать тесты для EmptyStateComponent и PageLayoutComponent\n6. Интеграция UI и API с MongoDB (in-memory)\n7. test.ts setup, моки для HttpClient, coverage thresholds';
    } else if (title.includes('05.01') && title.includes('Сборка')) {
      correctDesc =
        '✅ Уже ng build выполнен успешно: 0 errors, 0 warnings.\n- CSS размер: 21.84 kB raw / 4.54 kB transfer — OK\n- Total initial: 529 kB / 128 kB transfer\n- Lazy chunks: асинхронная загрузка не используется\nВ планах:\n- настроить production-оптимизации (aot, buildOptimizer)\n- проверить сборку в angular.json\n- CI-пайплайн (GitHub Actions)';
    } else if (title.includes('05.03') && title.includes('Деплой')) {
      correctDesc =
        '📋 В разработке. План:\n1. Nginx: reverse proxy на localhost:3000 (backend)\n2. Systemd unit: node backend/dist/server.js\n3. SSL-сертификаты (Let\'s Encrypt / certbot)\n4. Скрипт деплоя: pull → install → build → restart\n5. Frontend: nginx отдаёт dist/\n6. Backend: Mongoose через MongoDB Atlas\nФайлы: deploy/synology/deploy.sh, deploy/synology/nginx.conf';
    } else {
      console.log('SKIP ' + id.substring(0, 8) + ' — unknown title: ' + title);
      return;
    }

    fixMap[id] = { description: correctDesc };
  });

  console.log('Found ' + Object.keys(fixMap).length + ' tasks with garbled descriptions to fix');
  console.log('');

  let fixed = 0;
  const ids = Object.keys(fixMap);
  for (const id of ids) {
    try {
      await putTask(id, fixMap[id]);
      fixed++;
    } catch (e) {
      console.log('FAIL ' + id.substring(0, 8) + ': ' + e.message);
    }
  }

  console.log('');
  console.log('Fixed ' + fixed + ' of ' + ids.length + ' tasks');

  // Verify: re-fetch and check for remaining garbled
  console.log('');
  console.log('=== VERIFICATION ===');
  const verifyData = await get('https://yougile.com/api-v2/tasks?limit=100');
  const verifyTasks = verifyData.content || [];
  let remaining = 0;
  verifyTasks.forEach((t) => {
    const d = t.description || '';
    if (/[?]{4,}/.test(d)) {
      remaining++;
      console.log('REMAINING: ' + (t.id || '').substring(0, 8) + ' ' + (t.title || ''));
    }
  });
  console.log('Remaining garbled: ' + remaining);
}

main().catch(console.error);
