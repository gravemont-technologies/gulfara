const fs = require('fs')
const path = require('path')

function loadDotEnv() {
  const file = path.join(process.cwd(), '.env')
  if (!fs.existsSync(file)) return
  const content = fs.readFileSync(file, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadDotEnv()

const requiredForMigrate = [
  'FIREBASE_ADMIN_PROJECT_ID',
  'FIREBASE_ADMIN_CLIENT_EMAIL',
  'FIREBASE_ADMIN_PRIVATE_KEY',
  'CLERK_JWKS_URL',
  'OPENAI_API_KEY',
  'OPENAI_USER_MONTHLY_CAP',
]

const missing = requiredForMigrate.filter((k) => !process.env[k] || process.env[k].length === 0)
if (missing.length) {
  console.error('\n✖ Missing required environment variables for migration:')
  missing.forEach((m) => console.error(`  - ${m}`))
  console.error('\nFill these in `.env` before running migrations. Aborting.')
  process.exit(1)
}

// Validate private key format (allow either real newlines or escaped \n sequences)
const rawKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY
const looksLikePem = rawKey.includes('-----BEGIN PRIVATE KEY-----') && rawKey.includes('-----END PRIVATE KEY-----')
const hasEscapedNewlines = rawKey.includes('\\n')
if (!looksLikePem && !hasEscapedNewlines) {
  console.warn('\n⚠️  FIREBASE_ADMIN_PRIVATE_KEY does not look like a PEM or escaped key.')
  console.warn('Expected the key to include "-----BEGIN PRIVATE KEY-----" or use escaped newlines (\\n).')
  console.warn('Proceed only if you know what you are doing.')
}

console.log('\n✔ Environment validation passed for migration-critical keys.')
process.exit(0)
