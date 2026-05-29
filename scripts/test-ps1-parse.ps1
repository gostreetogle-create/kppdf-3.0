$errors = $null
$null = [Management.Automation.Language.Parser]::ParseFile(
  (Join-Path $PSScriptRoot '..\start.ps1'),
  [ref]$null,
  [ref]$errors
)
if ($errors -and $errors.Count -gt 0) {
  $errors | ForEach-Object { Write-Error "$($_.Message) (line $($_.Extent.StartLineNumber))" }
  exit 1
}
Write-Host 'start.ps1: syntax OK'
