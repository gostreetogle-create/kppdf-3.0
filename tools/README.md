# tools/ — Утилиты KPPDF 3.0

> Индекс вспомогательных скриптов и инструментов вне основного приложения.

---

## Список утилит

| Инструмент | Описание |
|-----------|----------|
| `products_import_export/` | Импорт/экспорт товаров между Google Sheets и MongoDB. Синхронизация 666+ позиций, нормализация, извлечение цветов. |
| `yougile-sync.ps1` | PowerShell-синхронизация задач YouGile: mark-done, sync-from-code, отчёты. |
| `yougile-scripts/` | Готовые `.js` скрипты для конфигуратора YouGile (кнопки, быстрые действия). |
| `scripts/restore-quotation-editor.js` | Восстановление QuotationEditor после случайного удаления. |
| `build.sh` | Сборка деплой-архива (`kppdf-deploy.tar.gz`). Обёртка над `deploy.sh --archive-only`. |
| `check_ng.sh` | Проверка Nginx конфигурации. |

---

## Быстрые команды

```bash
# Сборка архива (из корня проекта)
bash tools/build.sh

# Импорт товаров (из корня проекта)
cd tools/products_import_export
npm install
node run.js

# Синхронизация YouGile
pwsh tools/yougile-sync.ps1 -Action status
```

---

## Связанные документы

- `docs/integrations/yougile/` — YouGile API и конфигуратор
- `DEPLOY.md` — деплой и сборка
- `README.md` — быстрый старт
