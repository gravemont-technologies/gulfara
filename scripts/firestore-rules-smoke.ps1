# Smoke test for Firestore rules against the emulator
# Attempts an unauthenticated write to /blocked_actions and expects a rejection (403)

$host = $env:FIRESTORE_EMULATOR_HOST
if (-not $host) { $host = 'localhost:8080' }
$project = 'gulfara-cards'

$url = "http://$host/emulator/v1/projects/$project/databases/(default)/documents/blocked_actions"

Write-Host "Attempting unauthenticated write to $url"

$body = @{
  fields = @{
    action = @{ stringValue = 'smoke_test' }
    details = @{ mapValue = @{ fields = @{ info = @{ stringValue = 'smoke' } } } }
  }
} | ConvertTo-Json -Depth 6

try {
  $r = Invoke-RestMethod -Uri $url -Method Post -ContentType 'application/json' -Body $body -ErrorAction Stop
  Write-Host "Unexpected success: response:`n$r"
  exit 2
} catch {
  $err = $_.Exception.Response
  if ($err) {
    $status = $err.StatusCode.Value__
    Write-Host "Response status: $status"
    if ($status -eq 403) {
      Write-Host "Rules smoke-test passed: unauthenticated write rejected (403)"
      exit 0
    } else {
      Write-Host "Rules smoke-test unexpected status: $status"
      exit 3
    }
  } else {
    Write-Host "No HTTP response captured. Exception: $_"
    exit 4
  }
}
