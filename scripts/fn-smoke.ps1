Write-Output 'GET helloWorld:'
Try {
  $r = Invoke-RestMethod -Uri 'http://localhost:5001/gulfara-cards/us-central1/helloWorld' -Method Get
  $r | ConvertTo-Json -Depth 5
} Catch {
  Write-Output 'GET_ERR:'
  Write-Output $_.Exception.Message
}

Write-Output ''
Write-Output 'POST logBlocked:'
$body = @{ action='checkout_error'; details = @{ step = 2 } } | ConvertTo-Json
Try {
  $p = Invoke-RestMethod -Uri 'http://localhost:5001/gulfara-cards/us-central1/logBlocked' -Method Post -ContentType 'application/json' -Body $body
  $p | ConvertTo-Json -Depth 5
} Catch {
  Write-Output 'POST_ERR:'
  Write-Output $_.Exception.Message
}

Write-Output ''
Write-Output 'Enable kill switch:'
$enableBody = @{ fields = @{ enabled = @{ booleanValue = $true } } } | ConvertTo-Json -Depth 5
Try {
  Invoke-RestMethod -Uri 'http://localhost:8080/v1/projects/gulfara-cards/databases/(default)/documents/kill_switch?documentId=helloWorld' -Method Post -ContentType 'application/json' -Body $enableBody
  Write-Output 'ENABLED set true'
} Catch {
  Write-Output 'ENABLE_ERR:'
  Write-Output $_.Exception.Message
}

Write-Output ''
Write-Output 'Re-test helloWorld:'
Try {
  $r2 = Invoke-RestMethod -Uri 'http://localhost:5001/gulfara-cards/us-central1/helloWorld' -Method Get
  $r2 | ConvertTo-Json -Depth 5
} Catch {
  Write-Output 'GET2_ERR:'
  Write-Output $_.Exception.Message
}

Write-Output ''
Write-Output 'Disable kill switch:'
$disableBody = @{ fields = @{ enabled = @{ booleanValue = $false } } } | ConvertTo-Json -Depth 5
Try {
  Invoke-RestMethod -Uri 'http://localhost:8080/v1/projects/gulfara-cards/databases/(default)/documents/kill_switch/helloWorld' -Method Patch -ContentType 'application/json' -Body $disableBody
  Write-Output 'ENABLED set false'
} Catch {
  Write-Output 'DISABLE_ERR:'
  Write-Output $_.Exception.Message
}

Write-Output ''
Write-Output 'List blocked_actions:'
Try {
  Invoke-RestMethod -Uri 'http://localhost:8080/v1/projects/gulfara-cards/databases/(default)/documents/blocked_actions' -Method Get | ConvertTo-Json -Depth 5
} Catch {
  Write-Output 'LIST_ERR:'
  Write-Output $_.Exception.Message
}
