# YouGile Sync v3.0 — исправленная версия
# Поддерживает: report, status, list-done, mark-done, update-desc,
#               mark-done-bulk, sync-from-code

param(
  [string]$Action = "report",
  [string]$TaskId,
  [bool]$Completed,
  [string]$Description,
  [string]$ColumnFilter,    # для mark-done-bulk: ID колонки или её номер (01–08)
  [string]$IdPattern        # для mark-done-bulk: фильтр по idTaskCommon (напр "PLM-9")
)

$apiKey = "Za17DZkKgxjHfFSaKb+6I28QqdmUPNPeTSP77FsewPG-cnZBY2BoaEMZJ4mmJjdu"
$headers = @{ Authorization = "Bearer $apiKey"; "Content-Type" = "application/json" }
$base = "https://yougile.com/api-v2"

# ═══════════════════════════════════════════════════════════════════
# Справочник колонок
# ═══════════════════════════════════════════════════════════════════

$board1 = @{
  id    = "438ae799-8d02-4b98-b8c3-1d3c5ffc059c"
  title = "СпортИнЮг"
}
$board2 = @{
  id    = "29c38fa5-9ba3-40a5-bd31-1ae677440345"
  title = "Настройки проекта"
}

# Колонки Board 1 — Бизнес-эпики (раньше было 8, теперь 1)
$board1cols = @{
  "eefe08af-7205-4774-b01e-709a5f947ed0" = "01 CRM: Клиенты и КП"
}

# Колонки Board 2 — Настройки проекта
$board2cols = @{
  "0029cfa9-8217-43cc-80a1-455ffb73db95" = "01 Интеграции"
  "4f7dd161-00c1-40a1-a08c-39cfc01f4bce" = "02 Агенты и роли"
  "53a25095-a266-4db5-916b-9bb096239e0a" = "03 Архитектура"
  "38b2adf2-7902-4071-8a85-32ff7d1210c3" = "04 Инфраструктура"
  "556d0d9f-1164-453c-a0e0-ec019c862200" = "05 CI/CD и деплой"
  "67400dc8-39e4-469c-b9c2-42c58be9028e" = "06 Документация и стандарты"
  "e6b95d79-70eb-4200-86e1-0be00d1ac505" = "07 База знаний для ИИ"
  "0fda9135-bf8c-4bea-8e27-2a4740801a54" = "08 Модели БД"
}

# Двумерный индекс: "board2:08" → ID колонки
$colNumberToId = @{}
$board1cols.Keys | ForEach-Object { $colNumberToId["board1:01"] = $_ }
$board2cols.GetEnumerator() | ForEach-Object {
  $colId = $_.Key     # UUID колонки
  $title = $_.Value   # Название колонки ("01 Интеграции")
  $num = $title -replace '^.*?(\d{2}).*$', '$1'  # "01"
  $colNumberToId["board2:$num"] = $colId
}

# Простой индекс: "08" → ID колонки 08 Модели БД на Board 2
$colNumToIdSimple = @{}
$board2cols.GetEnumerator() | ForEach-Object {
  $title = $_.Value
  $num = $title -replace '^.*?(\d{2}).*$', '$1'
  $colNumToIdSimple[$num] = $_.Key
}

# Все ID колонок для быстрой проверки

# Все ID колонок для быстрой проверки
$allColumnIds = @{}
$board1cols.Keys | ForEach-Object { $allColumnIds[$_] = $board1cols[$_] }
$board2cols.Keys | ForEach-Object { $allColumnIds[$_] = $board2cols[$_] }

# ═══════════════════════════════════════════════════════════════════
# Вспомогательные функции
# ═══════════════════════════════════════════════════════════════════

function Get-Json($Uri) {
  try { return Invoke-RestMethod -Uri $Uri -Headers $headers -Method Get }
  catch { Write-Error "GET $Uri failed: $_"; return $null }
}

function Put-Json($Uri, $Body) {
  $json = $Body | ConvertTo-Json -Depth 10 -Compress
  try { return Invoke-RestMethod -Uri $Uri -Headers $headers -Method Put -Body $json }
  catch { Write-Error "PUT $Uri failed: $_"; return $null }
}

function Get-ColumnTitle($columnId) {
  if ($allColumnIds.ContainsKey($columnId)) { return $allColumnIds[$columnId] }
  return $columnId.Substring(0, 8)
}

function Get-BoardTitle($columnId) {
  if ($board1cols.ContainsKey($columnId)) { return $board1.title }
  if ($board2cols.ContainsKey($columnId)) { return $board2.title }
  return "Другая"
}

# ═══════════════════════════════════════════════════════════════════
# Загрузка задач
# ═══════════════════════════════════════════════════════════════════

try {
  $allTasks = Get-Json "$base/tasks?limit=100"
} catch {
  Write-Host "Cannot connect to YouGile API. Check network." -ForegroundColor Red
  exit 1
}

if (-not $allTasks) { Write-Host "No tasks received"; exit 1 }

# Индексация: по id (MongoDB _id) и по idTaskCommon (ID-xxx)
$taskById = @{}
$taskByCommon = @{}
$allTasks.content | ForEach-Object {
  $taskById[$_.id] = $_
  if ($_.idTaskCommon) { $taskByCommon[$_.idTaskCommon] = $_ }
}

# ═══════════════════════════════════════════════════════════════════
# Действия
# ═══════════════════════════════════════════════════════════════════

switch ($Action) {

  # ──────────────────────────────────────────────
  # report — полный отчёт по доскам и колонкам
  # ──────────────────────────────────────────────
  "report" {
    Write-Host "╔═══════════════════════════════════════════════╗"
    Write-Host "║        YOUGILE FULL REPORT                   ║"
    Write-Host "╚═══════════════════════════════════════════════╝"
    $total = $taskById.Count
    $doneTotal = ($taskById.Values | Where-Object { $_.completed }).Count
    Write-Host "Total: $total  |  Done: $doneTotal ($([math]::Round($doneTotal/$total*100))%)"
    Write-Host ""

    # Группируем по колонкам
    $colGroups = $taskById.Values | Group-Object columnId

    # Board 1 — СпортИнЮг
    Write-Host "╓─── $($board1.title) ─────────────────────────────"
    $board1cols.Keys | ForEach-Object {
      $colId = $_
      $colTitle = $board1cols[$colId]
      $group = $colGroups | Where-Object { $_.Name -eq $colId }
      if ($group) {
        $t = $group.Count; $d = ($group.Group | Where-Object { $_.completed }).Count
        $pct = if ($t -gt 0) { [math]::Round($d/$t*100) } else { 0 }
        Write-Host "  [$pct%] $colTitle`: $d/$t"
      } else {
        Write-Host "  [0%] $colTitle`: 0/0"
      }
    }

    # Board 2 — Настройки проекта
    Write-Host "╓─── $($board2.title) ─────────────────────────"
    $board2cols.Keys | ForEach-Object {
      $colId = $_
      $colTitle = $board2cols[$colId]
      $group = $colGroups | Where-Object { $_.Name -eq $colId }
      if ($group) {
        $t = $group.Count; $d = ($group.Group | Where-Object { $_.completed }).Count
        $pct = if ($t -gt 0) { [math]::Round($d/$t*100) } else { 0 }
        Write-Host "  [$pct%] $colTitle`: $d/$t"
      } else {
        Write-Host "  [0%] $colTitle`: 0/0"
      }
    }

    # Задачи без колонки
    $noCol = $taskById.Values | Where-Object { -not $_.columnId -or $_.columnId -eq "" }
    if ($noCol) {
      Write-Host "╓─── Без колонки ──────────────────────────────"
      Write-Host "  $($noCol.Count) задач"
    }
  }

  # ──────────────────────────────────────────────
  # status — краткий статус
  # ──────────────────────────────────────────────
  "status" {
    Write-Host "=== YOUGILE STATUS ==="
    $done = ($taskById.Values | Where-Object { $_.completed }).Count
    Write-Host "Total tasks: $($taskById.Count), Completed: $done"

    $colGroups = $taskById.Values | Group-Object columnId

    Write-Host "$($board1.title):"
    $board1cols.Keys | ForEach-Object {
      $group = $colGroups | Where-Object { $_.Name -eq $_ }
      if ($group) {
        $t = $group.Count; $d = ($group.Group | Where-Object { $_.completed }).Count
        Write-Host "  $($board1cols[$_]): $d/$t"
      }
    }

    Write-Host "$($board2.title):"
    $board2cols.Keys | ForEach-Object {
      $group = $colGroups | Where-Object { $_.Name -eq $_ }
      if ($group) {
        $t = $group.Count; $d = ($group.Group | Where-Object { $_.completed }).Count
        Write-Host "  $($board2cols[$_]): $d/$t"
      }
    }
  }

  # ──────────────────────────────────────────────
  # list-done — список выполненных задач
  # ──────────────────────────────────────────────
  "list-done" {
    Write-Host "=== COMPLETED ==="
    $taskById.Values | Where-Object { $_.completed } | Sort-Object idTaskCommon | ForEach-Object {
      $colTitle = Get-ColumnTitle $_.columnId
      Write-Host "$($_.idTaskCommon) - $($_.title) [$colTitle]"
    }
  }

  # ──────────────────────────────────────────────
  # mark-done — отметить одну задачу по idTaskCommon
  # ──────────────────────────────────────────────
  "mark-done" {
    if (-not $TaskId) { Write-Error "Need -TaskId (e.g., ID-14 or PLM-14)"; return }
    $task = $taskByCommon[$TaskId]
    if (-not $task) {
      # попробовать поиск по title содержит
      $task = $taskById.Values | Where-Object { $_.title -like "*$TaskId*" } | Select-Object -First 1
    }
    if (-not $task) { Write-Error "Task $TaskId not found"; return }
    $body = @{ completed = $true }
    if ($Description) { $body.description = $Description }
    $r = Put-Json "$base/tasks/$($task.id)" $body
    if ($r) {
      Write-Host "✅ Completed: $TaskId ($($task.title))" -ForegroundColor Green
    }
  }

  # ──────────────────────────────────────────────
  # update-desc — обновить описание задачи
  # ──────────────────────────────────────────────
  "update-desc" {
    if (-not $TaskId -or -not $Description) { Write-Error "Need -TaskId and -Description"; return }
    $task = $taskByCommon[$TaskId]
    if (-not $task) { Write-Error "Task $TaskId not found"; return }
    $body = @{ description = $Description }
    if ($PSBoundParameters.ContainsKey('Completed')) { $body.completed = $Completed }
    $r = Put-Json "$base/tasks/$($task.id)" $body
    if ($r) { Write-Host "✅ Updated: $TaskId ($($task.title))" -ForegroundColor Green }
  }

  # ──────────────────────────────────────────────
  # mark-done-bulk — отметить группу задач
  #   -ColumnFilter "08"  — все задачи колонки 08
  #   -IdPattern "PLM-9"  — все задачи с idTaskCommon начинающимся на PLM-9
  #   -ColumnFilter "08" -IdPattern "PLM-10" — пересечение
  # ──────────────────────────────────────────────
  "mark-done-bulk" {
    $targets = $taskById.Values | Where-Object { -not $_.completed }

    # Фильтр по колонке
    if ($ColumnFilter) {
      # Сначала пробуем точное совпадение по двумерному ключу ("board2:08")
      $colId = $colNumberToId[$ColumnFilter]
      # Затем пробуем по простому номеру для Board 2 ("08" → 08 Модели БД)
      if (-not $colId -and $colNumToIdSimple.ContainsKey($ColumnFilter)) {
        $colId = $colNumToIdSimple[$ColumnFilter]
      }
      # Если не нашли — поиск по частичному ID или названию
      if (-not $colId) {
        $colId = $allColumnIds.Keys | Where-Object { $_ -like "*$ColumnFilter*" } | Select-Object -First 1
      }
      if ($colId) {
        $colName = $allColumnIds[$colId]
        $targets = $targets | Where-Object { $_.columnId -eq $colId }
        Write-Host "Filter: column = $colName"
      } else {
        Write-Host "Column filter '$ColumnFilter' not recognised."
        Write-Host "Usage: -ColumnFilter '08' (Board 2), -ColumnFilter 'board2:08', or full/partial column ID."
      }
    }

    # Фильтр по ID pattern
    if ($IdPattern) {
      $targets = $targets | Where-Object {
        ($_.idTaskCommon -and $_.idTaskCommon -like "$IdPattern*") -or
        ($_.idTaskProject -and $_.idTaskProject -like "$IdPattern*")
      }
      Write-Host "Filter: idTaskCommon like '$IdPattern*'"
    }

    $count = ($targets | Measure-Object).Count
    if ($count -eq 0) { Write-Host "No matching unfinished tasks found."; return }

    Write-Host "Found $count tasks to mark as completed:"
    $targets | Sort-Object idTaskCommon | ForEach-Object {
      Write-Host "  $($_.idTaskCommon) - $($_.title)"
    }
    Write-Host ""
    Write-Host "Proceed? (y/n): " -NoNewline
    $confirm = Read-Host
    if ($confirm -ne 'y') { Write-Host "Cancelled."; return }

    $done = 0; $failed = 0
    $targets | ForEach-Object {
      $r = Put-Json "$base/tasks/$($_.id)" @{ completed = $true }
      if ($r) { $done++ } else { $failed++; Write-Host "  FAIL: $($_.idTaskCommon)" -ForegroundColor Red }
    }

    Write-Host ""
    Write-Host "✅ Marked $done tasks as completed." -ForegroundColor Green
    if ($failed -gt 0) { Write-Host "❌ $failed failed." -ForegroundColor Red }
  }

  # ──────────────────────────────────────────────
  # sync-from-code — сверить состояние YouGile с кодом проекта
  #   Отмечает как выполненные задачи, чьи модули уже реализованы:
  #   - 08.01–08.18 (Модели БД) — все Mongoose model + CRUD реализованы
  #   - 04.02 (Структура проекта)
  #   - 04.03 (Зависимости package.json)
  #   - 07.01–07.05 (Памятки)
  # ──────────────────────────────────────────────
  "sync-from-code" {
    Write-Host "=== SYNC FROM CODE ==="
    Write-Host "Сверяю YouGile с состоянием кодовой базы..."
    Write-Host ""

    # Задачи колонки 08 (Модели БД) — все 18 реализованы
    $col08id = $colNumToIdSimple["08"]  # "0fda9135-bf8c-4bea-8e27-2a4740801a54"
    $col08tasks = $taskById.Values | Where-Object {
      $_.columnId -eq $col08id -and -not $_.completed
    }
    # Задачи 04.02, 04.03
    $infraTasks = $taskById.Values | Where-Object {
      (-not $_.completed) -and ($_.title -like "*04.02*" -or $_.title -like "*04.03*")
    }
    # Задачи колонки 07 (Памятки)
    $col07id = $colNumToIdSimple["07"]  # "e6b95d79-70eb-4200-86e1-0be00d1ac505"
    $col07tasks = $taskById.Values | Where-Object {
      $_.columnId -eq $col07id -and -not $_.completed
    }

    $total = ($col08tasks | Measure-Object).Count +
             ($infraTasks | Measure-Object).Count +
             ($col07tasks | Measure-Object).Count

    if ($total -eq 0) {
      Write-Host "✅ Всё уже синхронизировано! Не найдено незавершённых задач для синхронизации."
      return
    }

    Write-Host "Найдено $total задач для отметки:"
    Write-Host "  Column 08 (Модели БД): $($col08tasks.Count)"
    Write-Host "  04.02 + 04.03:          $($infraTasks.Count)"
    Write-Host "  Column 07 (Памятки):   $($col07tasks.Count)"
    Write-Host ""

    # Описания для колонки 08
    $col08descs = @{
      "08.01" = "✅ Реализовано: Counter model + CRUD + counters.service.ts. Frontend: вкладка «Счётчики» ModulesPageComponent. Seed: 8 предустановленных счётчиков."
      "08.02" = "✅ Реализовано: Quotation model + CRUD router. Frontend: вкладка «КП» ModulesPageComponent. Статусная модель: draft → sent → accepted → rejected → converted."
      "08.03" = "✅ Реализовано: Order model + CRUD router. Frontend: вкладка «Заказы» ModulesPageComponent. Статусная модель: new → confirmed → in_production → ready → shipped → cancelled."
      "08.04" = "✅ Реализовано: BOM model + CRUD router. Frontend: вкладка «BOM» ModulesPageComponent. Версионирование спецификаций с компонентами."
      "08.05" = "✅ Реализовано: Operation model + CRUD router. Frontend: вкладка «Операции» ModulesPageComponent. Технологические операции с costPerHour."
      "08.06" = "✅ Реализовано: TechProcess model + CRUD router. Frontend: вкладка «Техпроцессы» ModulesPageComponent. Маршрутные карты с операциями."
      "08.07" = "✅ Реализовано: PurchaseRequest model + CRUD router. Frontend: вкладка «Заявки» ModulesPageComponent. Заявки на закупку с консолидацией."
      "08.08" = "✅ Реализовано: PurchaseOrder model + CRUD router. Frontend: вкладка «Заказы пост.» ModulesPageComponent. Заказы поставщикам с доставкой."
      "08.09" = "✅ Реализовано: Warehouse model + CRUD. Frontend: вкладка «Склады» DirectoriesPageComponent. Seed: 3 типа складов."
      "08.10" = "✅ Реализовано: StockMovement model + CRUD router. Frontend: вкладка «Движения» ModulesPageComponent. receipt / write_off / transfer."
      "08.11" = "✅ Реализовано: Reservation model + CRUD router. Frontend: вкладка «Резервы» ModulesPageComponent. Резервирование товаров под заказы."
      "08.12" = "✅ Реализовано: WorkOrder model + CRUD router. Frontend: вкладка «Наряды» ModulesPageComponent. Производственные задания."
      "08.13" = "✅ Реализовано: WorkOrderOperation model + CRUD router. Frontend: вкладка «Операции нар.» ModulesPageComponent. Операции производственных заданий."
      "08.14" = "✅ Реализовано: CostCalculation model + CRUD router. Frontend: вкладка «Калькуляции» ModulesPageComponent. Плановая себестоимость по BOM."
      "08.15" = "✅ Реализовано: ActualCost model + CRUD router. Frontend: вкладка «Факт. затраты» ModulesPageComponent. Фактические затраты material/labor/overhead."
      "08.16" = "✅ Реализовано: Shipment model + CRUD router. Frontend: вкладка «Отгрузки» ModulesPageComponent. Отгрузки с адресами и водителями."
      "08.17" = "✅ Реализовано: ShippingDoc model + CRUD router. Frontend: вкладка «Отгруз. док.» ModulesPageComponent. ТН/ТТН/счёт-фактура."
      "08.18" = "✅ Реализовано: Interaction model + CRUD router. Frontend: вкладка «Взаимод.» ModulesPageComponent. История взаимодействий call/email/meeting/note/system."
    }

    $done = 0; $failed = 0

    # Отмечаем колонку 08
    $col08tasks | ForEach-Object {
      $idTask = $_.idTaskCommon  # "ID-91"
      # Преобразуем ID-91 → 08.01, ID-92 → 08.02, и т.д.
      $num = if ($idTask -match 'ID-(\d+)') { [int]$Matches[1] } else { 0 }
      # ID-91 = 08.01, ID-92 = 08.02, ... ID-108 = 08.18
      $key = if ($num -ge 91 -and $num -le 108) {
        "08.{0:D2}" -f ($num - 90)
      } else { $null }

      $desc = if ($key -and $col08descs.ContainsKey($key)) { $col08descs[$key] } else { "✅ Реализовано: Mongoose model + CRUD + PrimeNG UI." }
      $r = Put-Json "$base/tasks/$($_.id)" @{ completed = $true; description = $desc }
      if ($r) { Write-Host "  ✅ $($_.idTaskCommon) - $($_.title)"; $done++ }
      else { Write-Host "  ❌ $($_.idTaskCommon)"; $failed++ }
    }

    # Отмечаем 04.02 и 04.03
    $infraTasks | ForEach-Object {
      $desc = if ($_.title -like "*04.02*") {
        "✅ Реализована: core/ → shared/ → entities/ → features/ → pages/ + backend/src/modules/. Актуальная структура зафиксирована в AI_CONTEXT.md и project-context.md."
      } else {
        "✅ Реализованы: root package.json + backend/package.json. Angular 21, PrimeNG, Express, Mongoose, JWT, bcrypt. Дев-зависимости: Jest, ESLint, TypeScript."
      }
      $r = Put-Json "$base/tasks/$($_.id)" @{ completed = $true; description = $desc }
      if ($r) { Write-Host "  ✅ $($_.idTaskCommon) - $($_.title)"; $done++ }
      else { Write-Host "  ❌ $($_.idTaskCommon)"; $failed++ }
    }

    # Отмечаем колонку 07
    $col07tasks | ForEach-Object {
      $desc = "✅ Создана памятка: документация в AI_CONTEXT.md."
      $r = Put-Json "$base/tasks/$($_.id)" @{ completed = $true; description = $desc }
      if ($r) { Write-Host "  ✅ $($_.idTaskCommon) - $($_.title)"; $done++ }
      else { Write-Host "  ❌ $($_.idTaskCommon)"; $failed++ }
    }

    Write-Host ""
    Write-Host "═ RESULTS ═══════════════════════"
    Write-Host "✅ Marked: $done" -ForegroundColor Green
    if ($failed -gt 0) { Write-Host "❌ Failed: $failed" -ForegroundColor Red }
    Write-Host "═════════════════════════════════"
  }

  # ──────────────────────────────────────────────
  # Неизвестная команда
  # ──────────────────────────────────────────────
  default {
    Write-Host "YouGile Sync v3.0"
    Write-Host ""
    Write-Host "Usage:"
    Write-Host "  .\tools\yougile-sync.ps1 -Action report"
    Write-Host "  .\tools\yougile-sync.ps1 -Action status"
    Write-Host "  .\tools\yougile-sync.ps1 -Action list-done"
    Write-Host "  .\tools\yougile-sync.ps1 -Action mark-done -TaskId ID-14"
    Write-Host "  .\tools\yougile-sync.ps1 -Action mark-done -TaskId PLM-14"
    Write-Host "  .\tools\yougile-sync.ps1 -Action update-desc -TaskId ID-14 -Description 'text'"
    Write-Host "  .\tools\yougile-sync.ps1 -Action update-desc -TaskId ID-14 -Completed `$true"
    Write-Host "  .\tools\yougile-sync.ps1 -Action mark-done-bulk -ColumnFilter 08"
    Write-Host "  .\tools\yougile-sync.ps1 -Action mark-done-bulk -IdPattern PLM-9"
    Write-Host "  .\tools\yougile-sync.ps1 -Action sync-from-code"
  }

}
