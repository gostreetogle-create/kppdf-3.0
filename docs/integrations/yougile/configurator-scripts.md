# YouGile Configurator Scripts

> Справка по конфигуратору YouGile. Готовые скрипты KPPDF в репозитории **не используются** — автоматизация через REST API и `yougile-sync-server`. Правила оформления карточек: [conventions.md](conventions.md).

---

## Конфигуратор в YouGile

1. Открой YouGile в браузере
2. **Ctrl + ~** — редактор скриптов (нужны права администратора)
3. Вкладки со скриптами можно **удалить**, если они больше не нужны

Документация YouGile: https://ru.yougile.com/media/docs/yougile-api-manual.pdf

---

## Что используем в KPPDF вместо конфигуратора

| Инструмент | Назначение |
|------------|------------|
| `yougile-sync-server` | Polling, % EPIC, описания задач, snapshot |
| `tools/yougile-sync.ps1` | CLI: report, mark-done, sync-from-code |
| `tools/yougile-restructure.js` | Перестройка колонок |
| `tools/fix-yougile-descriptions.js` | Массовое обновление описаний |

Подробнее: [README](README.md), [API Reference](api-reference.md)

---

## API конфигуратора (кратко)

```javascript
Current.onBoardChange = function (oldBoard, newBoard) {
  var btn = UI.button('Пример');
  btn.onClick = function () { alert('OK'); };
  newBoard.ui.add(btn);
};
```

Описание задачи в YouGile: `Chat.getDescription(task)` / `Chat.setDescription(task, text)`.

Проценты EPIC и авто-описания — только **yougile-sync-server**, не конфигуратор.
