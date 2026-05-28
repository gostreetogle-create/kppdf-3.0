# UI Polish Archive

## Purpose

Архивировать устаревшие orchestration-документы UI-polish без сохранения их как активного источника.

## Scope

- Бывшие документы: `UI-POLISH-CHECKLIST.md`, `UI-POLISH-PROMPT.md`
- Миграция активных правил в canonical источники

## Source of Truth

- UI execution rules: `.opencode/agents/ui-specialist.md`
- UI audit checklist: `.opencode/rules/ui-audit-checklist.md`
- Архитектурные ограничения: `AGENTS.md`

## Main Content

Уникальные части из старых файлов, которые сохранены в системе:

- Модель парной работы "задача -> реализация -> проверка" сохранена как процесс в AI-правилах (`AGENTS.md`, `.opencode/agents/*`).
- Детальные UI-checks сохранены в `.opencode/rules/ui-audit-checklist.md`.
- Технические запреты и инварианты уже закреплены в `AGENTS.md`.

Файлы `UI-POLISH-CHECKLIST.md` и `UI-POLISH-PROMPT.md` удалены из active root, чтобы исключить конкурирующие workflow-доки.

## References

- `.opencode/rules/ui-audit-checklist.md`
- `.opencode/agents/ui-specialist.md`
- `docs/INDEX.md`

