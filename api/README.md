Vercel fallback for Firebase functions

Setup
- Add a Vercel project and set an encrypted environment variable named FIREBASE_ADMIN_KEY containing your Firebase service account JSON, base64-encoded.

How to create the value (locally) (PowerShell):
1. Save your service account JSON to `service-account.json`.
2. Run:
   $json = Get-Content service-account.json -Raw
   $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json))
   Write-Output $b64

In Vercel UI, add a secret `FIREBASE_ADMIN_KEY` with that value.

Endpoints
- GET /api/helloWorld — returns 200 if `kill_switch/helloWorld` doc is enabled, 503 when disabled.
- POST /api/logBlocked — accepts JSON body with `action` and optional `details`, writes to `blocked_actions`.

Security note: you can protect the ingestion endpoint with a simple API key. Set a Vercel environment variable `LOGBLOCKED_API_KEY` (a short random string). When set, the endpoint requires the header `x-api-key: <value>` or query param `?api_key=<value>`.

Example curl with header:
```bash
curl -X POST -H "Content-Type: application/json" -H "x-api-key: $LOGBLOCKED_API_KEY" \
   -d '{"action":"test","details":{"info":"x"}}' https://<project>.vercel.app/api/logBlocked
```

Quick curl checks (after deploying preview and setting secret):
curl -i https://<project>.vercel.app/api/helloWorld

curl -X POST -H "Content-Type: application/json" -d '{"action":"test","details":{"info":"x"}}' https://<project>.vercel.app/api/logBlocked

Notes
- These endpoints initialize `firebase-admin` at runtime using the provided service account. Keep the key secret and rotate as needed.
- For simple staging without Firebase billing this provides parity with the Firebase functions behavior; prefer using the Firebase emulator and CI smoke tests for final verification.
