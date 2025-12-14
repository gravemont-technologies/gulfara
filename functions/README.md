Short notes for deploying and verifying the `helloWorld` and `logBlocked` functions.

Required environment variables
- `FIREBASE_ADMIN_KEY` : base64-encoded service-account JSON (optional when running in Firebase; required for Vercel).
- `LOGBLOCKED_API_KEY` : (optional) a short secret string. When set, `logBlocked` requires this value in the `x-logblocked-key` header.

Quick local build
```powershell
Set-Location -LiteralPath 'C:\Users\muzam\Projects\Gulfara\functions'
npm install
npm run build
```

Post-deploy verification (PowerShell)
```powershell
# Check helloWorld (should 503 when kill-switch disabled)
Invoke-RestMethod -Uri 'https://<region>-<project>.cloudfunctions.net/helloWorld' -Method Get | ConvertTo-Json

# Log a blocked action (include x-logblocked-key header if LOGBLOCKED_API_KEY is set)
$body = @{ action='checkout_error'; details = @{ step=2 } } | ConvertTo-Json
# Example using header
Invoke-RestMethod -Uri 'https://<region>-<project>.cloudfunctions.net/logBlocked' -Method Post -ContentType 'application/json' -Headers @{ 'x-logblocked-key' = 'REPLACE_ME' } -Body $body
```

Notes
- Functions are resilient to transient Firestore errors (read/write retries). Keep handlers minimal to avoid cold-start impact.
- For Vercel preview, set `FIREBASE_ADMIN_KEY` and `LOGBLOCKED_API_KEY` via the Vercel UI.
