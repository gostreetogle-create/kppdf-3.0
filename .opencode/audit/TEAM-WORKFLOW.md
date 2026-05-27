# Командный аудит KPPDF

Цель: каждый агент проверяет свою зону → отчёт → `@chief-architect` сводит. Без новой бизнес-логики.

## Порядок (один цикл)

| # | Агент | Проверка | Команды |
|---|--------|----------|---------|
| 1 | @guardian | Слои, cross-import | `rg` из guardian.md |
| 2 | @reviewer | any, constructor DI, lint | `npm run lint` |
| 3 | @ui-specialist | primeng в features, raw HTML, inline styles | `rg primeng src/app/features` |
| 4 | @ui-qa | manifest vs код | ui-manifest + golden-samples |
| 5 | @ui-auditor | build + чеклист | `npm run build`, ui-audit-checklist |
| 6 | @backend-specialist | crud-factory, auth на роутах | обход `backend/src/modules` |
| 7 | @api-specialist | shared/types vs модели | diff BE/FE типов |
| 8 | @auth-specialist | permPrefix, JWT | routers без factory |
| 9 | @ux-architect | меню vs routes, RBAC nav | app.routes + admin-layout |
| 10 | @design-system | _tokens, бюджеты SCSS | angular.json budgets |
| 11 | @deploy-specialist | CI, deploy scripts | `.github/workflows` |
| 12 | @chief-architect | сводка P0–P2 | этот файл + report |

OpenCode: `@orchestrator` запускает цикл. Cursor: промпт «Проведи TEAM-WORKFLOW, отчёт в audit/reports/».

## Ограничения цикла
- FIX — только P0 и мелкий P1 без изменения предметки
- TODO — чеклист с предложением, без реализации фич

## Артефакты
- Отчёт: `.opencode/audit/reports/YYYY-MM-DD.md`
- Обновить строку «Последний аудит» в `AGENTS.md` при смене даты
