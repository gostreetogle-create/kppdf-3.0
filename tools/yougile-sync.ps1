# YouGile Sync — simple UTF-8 safe version
param(
  [string]$Action = "report",
  [string]$TaskId,
  [bool]$Completed,
  [string]$Description
)

$PSDefaultParameterValues['*:Encoding'] = 'utf8'
$apiKey = "Za17DZkKgxjHfFSaKb+6I28QqdmUPNPeTSP77FsewPG-cnZBY2BoaEMZJ4mmJjdu"
$headers = @{ Authorization = "Bearer $apiKey"; "Content-Type" = "application/json" }
$base = "https://yougile.com/api-v2"

function Get-Json($Uri) {
  try { return Invoke-RestMethod -Uri $Uri -Headers $headers -Method Get }
  catch { Write-Error "GET $Uri failed"; return $null }
}

function Put-Json($Uri, $Body) {
  $json = $Body | ConvertTo-Json -Depth 10
  try { return Invoke-RestMethod -Uri $Uri -Headers $headers -Method Put -Body $json }
  catch { Write-Error "PUT $Uri failed"; return $null }
}

try {
  $allTasks = Get-Json "$base/tasks?limit=100"
} catch {
  Write-Host "Cannot connect to YouGile API. Check network." -ForegroundColor Red
  exit 1
}

if (-not $allTasks) { Write-Host "No tasks received"; exit 1 }

$taskMap = @{}
$allTasks.content | ForEach-Object { $taskMap[$_.idTaskCommon] = $_ }

switch ($Action) {
  "status" {
    Write-Host "=== YOUGILE STATUS ==="
    $done = ($taskMap.Values | Where-Object { $_.completed }).Count
    Write-Host "Total tasks: $($taskMap.Count), Completed: $done"
    
    $colGroups = $taskMap.Values | Group-Object columnId
    $board1cols = @("eefe08af","01b9b340","c834c3ee","71fd00a0","3100756d","05bb4c60","0e372003","ab6b980a")
    $board2cols = @("0029cfa9","4f7dd161","53a25095","38b2adf2","556d0d9f","67400dc8","e6b95d79","0fda9135")
    
    Write-Host "Board 1 (Business):"
    $colGroups | Where-Object { $_.Name -in $board1cols } | Sort-Object Name | ForEach-Object {
      $t = $_.Count; $d = ($_.Group | Where-Object { $_.completed }).Count
      Write-Host "  $($_.Name): $d/$t"
    }
    
    Write-Host "Board 2 (Infrastructure):"
    $colGroups | Where-Object { $_.Name -in $board2cols } | Sort-Object Name | ForEach-Object {
      $t = $_.Count; $d = ($_.Group | Where-Object { $_.completed }).Count
      Write-Host "  $($_.Name): $d/$t"
    }
  }
  "list-done" {
    Write-Host "=== COMPLETED ==="
    $taskMap.Values | Where-Object { $_.completed } | Sort-Object idTaskCommon | ForEach-Object {
      Write-Host "$($_.idTaskCommon) - $($_.title)"
    }
  }
  "mark-done" {
    if (-not $TaskId) { Write-Error "Need -TaskId"; return }
    $task = $taskMap[$TaskId]
    if (-not $task) { Write-Error "Task $TaskId not found"; return }
    $r = Put-Json "$base/tasks/$($task.id)" @{ completed = $true }
    if ($r) { Write-Host "Completed: $TaskId ($($task.title))" }
  }
  "update-desc" {
    if (-not $TaskId -or -not $Description) { Write-Error "Need -TaskId and -Description"; return }
    $task = $taskMap[$TaskId]
    if (-not $task) { Write-Error "Task $TaskId not found"; return }
    $body = @{ description = $Description }
    if ($PSBoundParameters.ContainsKey('Completed')) { $body.completed = $Completed }
    $r = Put-Json "$base/tasks/$($task.id)" $body
    if ($r) { Write-Host "Updated: $TaskId" }
  }
  "report" {
    Write-Host "YOUGILE FULL REPORT"
    $total = $taskMap.Count
    $doneTotal = ($taskMap.Values | Where-Object { $_.completed }).Count
    Write-Host "Total: $total, Done: $doneTotal ($([math]::Round($doneTotal/$total*100))%)"
    Write-Host ""
    $colGroups = $taskMap.Values | Group-Object columnId
    $colGroups | Sort-Object Name | ForEach-Object {
      $t = $_.Count; $d = ($_.Group | Where-Object { $_.completed }).Count
      $pct = if ($t -gt 0) { [math]::Round($d/$t*100) } else { 0 }
      Write-Host "  [$pct%] col=$($_.Name): $d/$t"
    }
  }
}
