/**
 * YouGile Restructure — перенос доски «Настройки проекта» в одну колонку с эпиками
 * 
 * Шаги:
 * 1. Создать колонку «Проект: Настройки» на доске СпортИнЮг
 * 2. Создать 8 эпик-задач в новой колонке
 * 3. Перенести все задачи как подзадачи эпиков
 * 4. Показать результат
 */

const https = require('https');
const key = 'Za17DZkKgxjHfFSaKb+6I28QqdmUPNPeTSP77FsewPG-cnZBY2BoaEMZJ4mmJjdu';
const opts = { headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' } };

// Board IDs
const board1Id = '438ae799-8d02-4b98-b8c3-1d3c5ffc059c'; // СпортИнЮг
const board2Id = '29c38fa5-9ba3-40a5-bd31-1ae677440345'; // Настройки проекта

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, opts, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(JSON.parse(d))); }).on('error', reject);
  });
}

function post(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request(url, { method: 'POST', headers: { ...opts.headers, 'Content-Length': Buffer.byteLength(body) } }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function put(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const req = https.request(url, { method: 'PUT', headers: { ...opts.headers, 'Content-Length': Buffer.byteLength(body) } }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { resolve(d); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== ШАГ 1: Загружаем текущую структуру ===\n');

  // Загружаем колонки и задачи
  const colsData = await get('https://yougile.com/api-v2/columns');
  const board2Cols = (colsData.content || []).filter(c => c.boardId === board2Id);
  
  let allTasks = [];
  let offset = 0;
  while (true) {
    const page = await get(`https://yougile.com/api-v2/tasks?limit=100&offset=${offset}`);
    const items = page.content || [];
    if (items.length === 0) break;
    allTasks.push(...items);
    offset += items.length;
    if (items.length < 100) break;
  }
  
  const taskMap = {};
  allTasks.forEach(t => { taskMap[t.id] = t; });

  // Группируем задачи по колонкам board2
  const colGroups = {};
  board2Cols.forEach(col => {
    colGroups[col.title] = allTasks.filter(t => t.columnId === col.id);
  });

  console.log('Текущая структура доски «Настройки проекта»:');
  Object.keys(colGroups).forEach(key => {
    const tasks = colGroups[key];
    const done = tasks.filter(t => t.completed).length;
    console.log(`  ${key}: ${tasks.length} задач (${done} выполнено)`);
  });
  console.log('');

  // Создаём новую колонку на board1
  console.log('=== ШАГ 2: Создаём колонку «Проект: Настройки» на доске СпортИнЮг ===\n');
  const newCol = await post('https://yougile.com/api-v2/columns', {
    title: 'Проект: Настройки',
    boardId: board1Id
  });
  const newColId = newCol.id;
  console.log(`✅ Колонка создана: ${newColId}\n`);

  // Создаём 8 эпик-задач и сразу собираем маппинг колонка → эпик
  console.log('=== ШАГ 3: Создаём 8 эпик-задач ===\n');

  const epicDefs = [
    { title: '01 Интеграции', color: '#2196F3' },
    { title: '02 Агенты и роли', color: '#9C27B0' },
    { title: '03 Архитектура', color: '#FF9800' },
    { title: '04 Инфраструктура', color: '#607D8B' },
    { title: '05 CI/CD и деплой', color: '#F44336' },
    { title: '06 Документация и стандарты', color: '#4CAF50' },
    { title: '07 База знаний для ИИ', color: '#00BCD4' },
    { title: '08 Модели БД', color: '#3F51B5' }
  ];

  const colToEpicMap = {}; // название колонки → ID эпика
  const epicTasks = [];

  for (const def of epicDefs) {
    const epic = await post('https://yougile.com/api-v2/tasks', {
      title: `[EPIC] ${def.title}`,
      columnId: newColId,
      description: `Эпик: ${def.title}. Объединяет подзадачи по этой теме.`
    });
    colToEpicMap[def.title] = epic.id;
    epicTasks.push(epic);
    console.log(`  ✅ ${def.title} → ${epic.id}`);
  }
  console.log('');

  // Переносим задачи как подзадачи эпиков
  console.log('=== ШАГ 4: Переносим задачи как подзадачи эпиков ===\n');

  let moved = 0;
  let failed = 0;

  for (const col of board2Cols) {
    const colName = col.title;
    const epicId = colToEpicMap[colName];
    if (!epicId) {
      console.log(`  ⚠️ Нет эпика для колонки ${colName}, пропускаем`);
      continue;
    }

    const tasks = allTasks.filter(t => t.columnId === col.id);
    for (const task of tasks) {
      try {
        await put(`https://yougile.com/api-v2/tasks/${task.id}`, {
          parentTaskId: epicId,
          columnId: newColId
        });
        moved++;
        process.stdout.write('  .');
      } catch (err) {
        failed++;
        console.log(`  ❌ ${task.idTaskCommon || task.title}: ${err.message}`);
      }
    }
    console.log(`  → ${colName}: ${tasks.length} задач перенесено`);
  }

  console.log(`\n✅ Перенесено задач: ${moved}`);
  if (failed > 0) console.log(`❌ Ошибок: ${failed}`);
  console.log('');

  // Проверяем результат
  console.log('=== ШАГ 5: Проверка результата ===\n');

  // Загружаем обновлённые задачи
  let updatedTasks = [];
  offset = 0;
  while (true) {
    const page = await get(`https://yougile.com/api-v2/tasks?limit=100&offset=${offset}`);
    const items = page.content || [];
    if (items.length === 0) break;
    updatedTasks.push(...items);
    offset += items.length;
    if (items.length < 100) break;
  }

  const newColTasks = updatedTasks.filter(t => t.columnId === newColId);
  const epics = newColTasks.filter(t => t.title && t.title.startsWith('[EPIC]'));
  const subtasks = newColTasks.filter(t => !t.title || !t.title.startsWith('[EPIC]'));

  console.log(`Колонка «Проект: Настройки»:`);
  console.log(`  Эпиков: ${epics.length}`);
  console.log(`  Подзадач: ${subtasks.length}`);
  console.log('');

  for (const epic of epics) {
    const subs = subtasks.filter(t => {
      // Проверяем parentTaskId напрямую
      const tFull = updatedTasks.find(ut => ut.id === t.id);
      return tFull && tFull.parentTaskId === epic.id;
    });
    const done = subs.filter(t => t.completed).length;
    console.log(`  ${epic.title}: ${subs.length} подзадач (${done} ✅)`);
    subs.sort((a, b) => (a.idTaskCommon || a.title).localeCompare(b.idTaskCommon || a.title));
    subs.forEach(s => {
      const icon = s.completed ? '✅' : '⬜';
      console.log(`    ${icon} ${s.idTaskCommon ? s.idTaskCommon + ' - ' : ''}${s.title}`);
    });
  }

  console.log('\n=== ГОТОВО ===');
}

main().catch(console.error);
