# products_import_export

Локальный агент для обработки входных Excel/PDF и обновления Google Sheets.

## Что делает
- Читает файлы из папки `входные данные`.
- Извлекает поля из Excel/PDF по правилам из `config/mapping.json`.
- Ищет строку в Google Sheets по ключевому полю (`match.sheetColumn`).
- Обновляет целевые колонки.
- Пишет отчет запуска в `output`.
- После обработки переносит входной файл в `архив`.

## Подготовка
1. Создайте `.env` на основе `.env.example`.
2. Скопируйте `config/mapping.example.json` в `config/mapping.json` и настройте поля.
3. Установите зависимости:
   - `cd tools/products_import_export`
   - `npm install`

## Запуск
- Обычный: `npm start`
- Проверка без записи в таблицу: `npm run dry-run`
- Тестовые строки в лист: `npm run seed-test`
- Добавить недостающие колонки (сверка с kppdf): `npm run sync-columns`
- Заполнить фото из папки media (имя файла = артикул): `npm run sync-photos -- --append-missing`
- **Импорт из папки «ТОВАРЫ»** (CSV + JSON): `npm run import-tovary` / `npm run import-tovary -- --dry-run`

## Импорт из «ТОВАРЫ»
Источники: `TOVARY_SOURCES_DIR` (по умолчанию `D:/invSportiN/Сайт/Исходники для сайта crm/ТОВАРЫ`).

Приоритет:
1. `Товары для КП_kp-media-urls.csv` — артикул, название, цена, категория, `/kp-media/` фото
2. `bulk-trade-goods-data.json` — тип, подкатегория, isActive
3. `MEDIA_PRODUCTS_DIR` — доп. фото `products/ART.ext`

Режим: upsert по артикулу, **не затирает** уже заполненные ячейки. Отчёт: `output/import-tovary-report.json`.

## Google Sheets → MongoDB (KPPDF 3.0)
Без изменений кода backend/frontend — только upsert в локальную MongoDB.

```bash
npm run sync-to-mongo -- --dry-run
npm run sync-to-mongo
```

- Читает лист `products` из Google Sheets
- Создаёт категории по названию (если нет)
- Добавляет новые товары; существующие — только **заполняет пустые** поля
- Seed-товары (LST-001 и т.д.) **не трогает** — артикулы не пересекаются
- Отчёт: `output/sync-sheet-to-mongo-report.json`

## Нормализация текстов (короткое имя + описание)
Длинные «Наименование» разбиваются по правилам (маркеры «Габариты», «в комплекте», «Размеры», сетки, кавычки и т.д.).

```bash
npm run normalize-texts -- --dry-run
npm run normalize-texts
```

- Не перезаписывает уже заполненное «Описание» (кроме `--force-desc`)
- Отчёт с примерами: `output/normalize-product-texts-report.json`

## Колонка «Цвет» (извлечение из текстов)
```bash
npm run sync-columns          # добавить колонку «Цвет»
npm run extract-colors -- --dry-run
npm run extract-colors
```

Распознаёт RAL, сетки (белый/чёрный), RGB-подсветку, «по согласованию», древесные оттенки. Отчёт: `output/extract-colors-report.json`.

## Структура папок
- `входные данные` — входящие `.xlsx`, `.xls`, `.pdf`
- `архив` — обработанные файлы (перемещаются автоматически)
- `output` — отчеты каждого запуска
- `config/mapping.json` — правила сопоставления и обновления полей

## Важно
- Файл считается обработанным даже в dry-run и тоже переносится в `архив` (по вашему требованию).
- Если нужно оставить файлы в `входные данные` при dry-run, это можно быстро переключить отдельным флагом.
