# Кодировки на Windows (обязательный протокол)

> **Для AI и разработчиков.** Нарушение = сломанный `.\start.ps1`, ParserError в PowerShell, или `ng build` на TypeScript.

Канонический чеклист перед сдачей правок: `npm run ps1:bom` + `npm run ps1:check` (если менялись `.ps1`).

---

## 1. PowerShell (`.ps1`) — UTF-8 **с BOM**

### Симптом (реальный инцидент 2026-05)

```
Отсутствует закрывающий знак "}" ...
Непредвиденная лексема ")" ...
создан yougile... (РјРѕР¶РёР±Р°РєРё)
```

### Причина

| Среда | Поведение |
|-------|-----------|
| **Windows PowerShell 5.1** (по умолчанию в Windows) | Файл **без BOM** читается как системная ANSI (CP1251 в RU Windows), не UTF-8 |
| UTF-8 без BOM + кириллица | Кавычки «ломаются», парсер видит обрыв строк |
| Символы `—`, `→`, «ёлочки» в строках | Усиливают поломку при неверной кодировке |

### Правила (инварианты)

1. **Кодировка файла:** UTF-8 **с BOM** (`EF BB BF` в начале файла).
2. **После любой правки `.ps1`:** `npm run ps1:bom` (или `node scripts/write-ps1-utf8bom.mjs path/to/file.ps1`).
3. **Проверка:** `npm run ps1:check` — синтаксис + BOM для staged/всех `.ps1`.
4. **Русский текст в скриптах:** предпочитать **одинарные** кавычки `'...'`.
5. **В строках только ASCII-разделители:** `-`, `->`, `...` — **не** `—`, `→`, типографские кавычки.
6. **Go/docker-шаблоны** (`{{if ...}}`): не в одной хрупкой строке — собирать через `-f` / конкатенацию, чтобы PowerShell не спутал с `if`.
7. **Кириллица в `Start-Process -Command`:** использовать here-string `@"..."@`, не длинную строку в одних кавычках.
8. **Запуск для пользователя:** `.\start.cmd` или `.\start.ps1`; `start.cmd` перед запуском вызывает `ps1:bom`.

### Затронутые файлы

- `start.ps1`, `stop.ps1`, `dev.ps1`
- `deploy/**/*.ps1`, `tools/**/*.ps1`
- любой новый `*.ps1` в репозитории

### Инструменты

| Команда | Назначение |
|---------|------------|
| `npm run ps1:bom` | Записать UTF-8 BOM во все корневые `start.ps1` / `stop.ps1` или в переданные пути |
| `npm run ps1:check` | Проверить BOM + разбор парсером PowerShell |
| `scripts/write-ps1-utf8bom.mjs` | Реализация BOM |
| `scripts/check-ps1-encoding.mjs` | Проверка перед commit / вручную |

### Редактор (VS Code / Cursor)

В `.vscode/settings.json` для проекта:

```json
"[powershell]": { "files.encoding": "utf8bom" }
```

---

## 2. Bash (`.sh`) — LF, без CRLF

См. `DEPLOY.md` и `deploy-specialist.md` — раздел **CRLF vs LF**.

Перед деплоем с Windows:

```bash
sed -i 's/\r$//' deploy.sh deploy/deploy.sh deploy/synology/deploy.sh
```

---

## 3. TypeScript / Angular (`.ts`) — UTF-8, не UTF-16

**Симптом:** `ng build` падает на файле с «кракозябрами».

**Причина:** редкое сохранение в UTF-16 LE на Windows (Notepad, копипаст).

**Правила:**

- Сохранять `.ts` / `.scss` как **UTF-8** (BOM не обязателен для TS).
- После правок UI-файлов на Windows — `ng build`.
- См. также `src/app/features/quotations/QUOTATION-EDITOR-BLOCKS.md` (кодировка редактора КП).

---

## 4. Протокол для AI-агентов

### Перед правкой

- Задача затрагивает `*.ps1` → **прочитать этот файл**.
- Деплой с Windows → помнить про **и** CRLF в `.sh`, **и** BOM в `.ps1`.

### После правки `.ps1`

1. `npm run ps1:bom` (или BOM только для изменённых файлов).
2. `npm run ps1:check` — exit 0.
3. Локально: `powershell -NoProfile -File scripts/test-ps1-parse.ps1` (опционально).

### Запрещено

- Коммитить `.ps1` без UTF-8 BOM после правки кириллицы.
- Вставлять в `.ps1` Unicode `—` / `→` в пользовательских сообщениях.
- Предлагать пользователю «просто пересохранить» без `ps1:bom`.

### Pre-commit

Hook `.githooks/pre-commit` автоматически вызывает `ps1:bom` для staged `*.ps1` и добавляет файл обратно в index.

---

## 5. Связанные документы

| Документ | Роль |
|----------|------|
| `AGENTS.md` | Инвариант в архитектурных правилах |
| `.opencode/AI_CONTEXT.md` | Контекст для агентов |
| `README.md` | Быстрый старт Windows |
| `DEPLOY.md` | CRLF + ссылка на `.ps1` |
| `.cursor/rules/kppdf-encoding-windows.mdc` | Rule при правке `*.ps1` |

*Последнее обновление: 2026-05-29 (инцидент start.ps1 / ParserError).*
