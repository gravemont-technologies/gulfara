# Smoke test for Firestore rules against the emulator
# Attempts an unauthenticated write to /blocked_actions and expects a rejection (403)

$emulatorHost = $env:FIRESTORE_EMULATOR_HOST
if (-not $emulatorHost) { $emulatorHost = 'localhost:8080' }
$project = 'gulfara-cards'

$url = "http://$emulatorHost/emulator/v1/projects/$project/databases/(default)/documents/blocked_actions"

Write-Host "Attempting unauthenticated write to $url"

$body = @{
  fields = @{
    action = @{ stringValue = 'smoke_test' }
    details = @{ mapValue = @{ fields = @{ info = @{ stringValue = 'smoke' } } } }
  }
} | ConvertTo-Json -Depth 6

# Try a couple of candidate base paths the emulator may expose
$candidates = @("/emulator/v1/projects", "/v1/projects")
$passed = $false
foreach ($base in $candidates) {
  $tryUrl = "http://$emulatorHost$base/$project/databases/(default)/documents/blocked_actions"
  Write-Host "Trying $tryUrl"
  try {
    $r = Invoke-RestMethod -Uri $tryUrl -Method Post -ContentType 'application/json' -Body $body -ErrorAction Stop
    Write-Host "Unexpected success: response:`n$r"
    exit 2
  } catch {
    $err = $_.Exception.Response
    if ($err) {
      $status = $err.StatusCode.Value__
      Write-Host "Response status: $status for $tryUrl"
      if ($status -eq 403) {
        Write-Host "Rules smoke-test passed: unauthenticated write rejected (403)"
        $passed = $true; break
      } elseif ($status -eq 404) {
        Write-Host "Not found at $tryUrl; trying next candidate"
        continue
      } else {
        Write-Host "Rules smoke-test unexpected status: $status for $tryUrl"
        try {
          $sr = New-Object System.IO.StreamReader($err.GetResponseStream())
          $bodyText = $sr.ReadToEnd()
          Write-Host "Response body:\n$bodyText"
        } catch {
          Write-Host "Unable to read error response body: $_"
        }
        exit 3
      }
    } else {
      Write-Host "No HTTP response captured for $tryUrl. Exception: $_"
      continue
    }
  }
}

if ($passed) { exit 0 } else { Write-Host "All candidates tried; rules smoke-test failed"; exit 4 }
