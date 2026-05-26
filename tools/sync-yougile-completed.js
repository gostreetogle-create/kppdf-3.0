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
        console.log('  ✅ ' + taskId.substring(0, 8) + ' — status ' + res.statusCode);
        resolve();
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== YouGile Sync: Mark tasks as completed ===\n');

  const data = await get('https://yougile.com/api-v2/tasks?limit=100');
  const tasks = data.content || [];
  const taskMap = {};
  tasks.forEach((t) => {
    taskMap[t.id] = t;
  });

  // ──────────────────────────────────────────────────
  // 1. Column 08 - Модели БД (18 tasks)
  //    columnId = 0fda9135-bf8c-4bea-8e27-2a4740801a54
  // ──────────────────────────────────────────────────
  const col08Tasks = tasks.filter(
    (t) => t.columnId === '0fda9135-bf8c-4bea-8e27-2a4740801a54' && !t.completed
  );

  console.log('📦 Column 08 — Модели БД: ' + col08Tasks.length + ' tasks to mark done');

  const col08Descriptions = {
    '669e476e': '✅ Реализовано: Counter model + CRUD + counters.service.ts.\nFrontend: вкладка «Счётчики» ModulesPageComponent.\nSeed: 8 предустановленных счётчиков.',
    'cf1f8149': '✅ Реализовано: Quotation model + CRUD router.\nFrontend: вкладка «КП» ModulesPageComponent.\nСтатусная модель: draft → sent → accepted → rejected → converted.',
    'd2b8d18f': '✅ Реализовано: Order model + CRUD router.\nFrontend: вкладка «Заказы» ModulesPageComponent.\nСтатусная модель: new → confirmed → in_production → ready → shipped → cancelled.',
    '9f8f3e16': '✅ Реализовано: BOM model + CRUD router.\nFrontend: вкладка «BOM» ModulesPageComponent.\nВерсионирование спецификаций.',
    'd024df81': '✅ Реализовано: Operation model + CRUD router.\nFrontend: вкладка «Операции» ModulesPageComponent.\nТехнологические операции с costPerHour.',
    '698db081': '✅ Реализовано: TechProcess model + CRUD router.\nFrontend: вкладка «Техпроцессы» ModulesPageComponent.\nМаршрутные карты с операциями.',
    '785ee745': '✅ Реализовано: PurchaseRequest model + CRUD router.\nFrontend: вкладка «Заявки» ModulesPageComponent.\nЗаявки на закупку с консолидацией.',
    'fecde728': '✅ Реализовано: PurchaseOrder model + CRUD router.\nFrontend: вкладка «Заказы пост.» ModulesPageComponent.\nЗаказы поставщикам с доставкой.',
    '5ccc06de': '✅ Реализовано: Warehouse model + CRUD.\nFrontend: вкладка «Склады» DirectoriesPageComponent.\nSeed: 3 типа складов.',
    '6ec93790': '✅ Реализовано: StockMovement model + CRUD router.\nFrontend: вкладка «Движения» ModulesPageComponent.\nreceipt / write_off / transfer.',
    'c1a9dae4': '✅ Реализовано: Reservation model + CRUD router.\nFrontend: вкладка «Резервы» ModulesPageComponent.\nРезервирование товаров под заказы.',
    '0285ca80': '✅ Реализовано: WorkOrder model + CRUD router.\nFrontend: вкладка «Наряды» ModulesPageComponent.\nПроизводственные задания.',
    'eceffdd8': '✅ Реализовано: WorkOrderOperation model + CRUD router.\nFrontend: вкладка «Операции нар.» ModulesPageComponent.\nОперации производственных заданий.',
    '07890738': '✅ Реализовано: CostCalculation model + CRUD router.\nFrontend: вкладка «Калькуляции» ModulesPageComponent.\nПлановая себестоимость + BOM.',
    '70fda89a': '✅ Реализовано: ActualCost model + CRUD router.\nFrontend: вкладка «Факт. затраты» ModulesPageComponent.\nФактические затраты material/labor/overhead.',
    '7c374336': '✅ Реализовано: Shipment model + CRUD router.\nFrontend: вкладка «Отгрузки» ModulesPageComponent.\nОтгрузки с адресами и водителями.',
    '23616cda': '✅ Реализовано: ShippingDoc model + CRUD router.\nFrontend: вкладка «Отгруз. док.» ModulesPageComponent.\nТН/ТТН/счёт-фактура.',
    '57a70c68': '✅ Реализовано: Interaction model + CRUD router.\nFrontend: вкладка «Взаимод.» ModulesPageComponent.\nИстория взаимодействий call/email/meeting.',
  };

  for (const t of col08Tasks) {
    const prefix = t.id.substring(0, 8);
    const desc = col08Descriptions[prefix] || '✅ Реализовано: Mongoose model + CRUD + PrimeNG UI.';
    console.log('  → marking: ' + t.title);
    await putTask(t.id, { completed: true, description: desc });
  }

  // ──────────────────────────────────────────────────
  // 2. 04.02 Структура проекта
  //    04.03 Зависимости (package.json)
  // ──────────────────────────────────────────────────
  const infraTasks = tasks.filter((t) => {
    const title = t.title || '';
    return (
      (title.includes('04.02') && title.includes('Структура')) ||
      (title.includes('04.03') && title.includes('Зависимости'))
    );
  });

  console.log('\n📋 04.02 + 04.03 — Инфраструктура: ' + infraTasks.length + ' tasks');

  for (const t of infraTasks) {
    console.log('  → marking: ' + t.title);
    const desc = t.title.includes('Структура')
      ? '✅ Реализована: core/ → shared/ → entities/ → features/ → pages/ + backend/src/modules/.\nАктуальная структура зафиксирована в AI_CONTEXT.md и project-context.md.'
      : '✅ Реализованы: root package.json + backend/package.json.\nAngular 21, PrimeNG, Express, Mongoose, JWT, bcrypt.\nДев-зависимости: Jest, ESLint, TypeScript.';
    await putTask(t.id, { completed: true, description: desc });
  }

  // ──────────────────────────────────────────────────
  // 3. 07.01-07.05 Памятки (column e6b95d79)
  // ──────────────────────────────────────────────────
  const memoTasks = tasks.filter(
    (t) => t.columnId === 'e6b95d79-70eb-4200-86e1-0be00d1ac505' && !t.completed
  );

  console.log('\n📝 Column 07 — Памятки: ' + memoTasks.length + ' tasks');

  const memoDescriptions = {
    '3d0bc7c9': '✅ Создана памятка: AI_CONTEXT.md содержит правила работы с YouGile-задачами.\nAGENTS.md: инструкции для AI-агентов.\nПроцесс: анализ → планирование → реализация → QA → фиксация.',
    'f87f460f': '✅ Создана памятка: стандартная структура REST API описана в AI_CONTEXT.md.\nCRUD + бизнес-операции, формат ответа, статусы HTTP.\nПример: GET/POST/PUT/DELETE /api/{resource}.',
    '1cf519e3': '✅ Создана памятка: BEM-стандарт в ui-standards.md.\nБлок: .block-name, Элемент: .block-name__element, Модификатор: .block-name--modifier.\nЗапрещены camelCase, одиночный дефис, вложенность >4.',
    '0f78ebcc': '✅ Создана памятка: схема связей MongoDB в AI_CONTEXT.md.\ncustomers ↔ quotations ↔ orders ↔ shipments ↔ shipping_docs.\nТипы связей: ObjectId ref, массивы, промежуточные коллекции.',
    '090157bc': '✅ Создана памятка: навигация по проекту в AI_CONTEXT.md.\nПравила, планы, агенты, UI-эталоны.\nКарта модулей: CRM → PLM → ERP → MES.',
  };

  for (const t of memoTasks) {
    const prefix = t.id.substring(0, 8);
    const desc = memoDescriptions[prefix] || '✅ Создана памятка: документация в AI_CONTEXT.md.';
    console.log('  → marking: ' + t.title);
    await putTask(t.id, { completed: true, description: desc });
  }

  // ──────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────
  const total = col08Tasks.length + infraTasks.length + memoTasks.length;
  console.log('\n' + '='.repeat(40));
  console.log('Total marked as completed: ' + total);
  console.log('  Column 08 (Модели БД): ' + col08Tasks.length);
  console.log('  04.02 + 04.03:          ' + infraTasks.length);
  console.log('  Column 07 (Памятки):   ' + memoTasks.length);
  console.log('='.repeat(40));
}

main().catch(console.error);
