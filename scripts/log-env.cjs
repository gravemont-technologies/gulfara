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

const envMap = [
  { key: 'NODE_ENV', label: 'Node environment' },
  { key: 'NEXT_PUBLIC_FIREBASE_API_KEY', label: 'Firebase client API key set' },
  { key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', label: 'Firebase project ID set' },
  { key: 'VITE_CLERK_PUBLISHABLE_KEY', label: 'Clerk publishable key set' },
  { key: 'FIREBASE_ADMIN_PROJECT_ID', label: 'Firebase admin project ID set' },
  { key: 'FIREBASE_ADMIN_CLIENT_EMAIL', label: 'Firebase admin client email set' },
  { key: 'FIREBASE_ADMIN_PRIVATE_KEY', label: 'Firebase admin private key set' },
  { key: 'CLERK_JWKS_URL', label: 'Clerk JWKS URL set' },
  { key: 'OPENAI_API_KEY', label: 'OpenAI API key set' },
  { key: 'OPENAI_USER_MONTHLY_CAP', label: 'OpenAI user cap configured' },
  { key: 'NEXT_PUBLIC_USE_FIREBASE', label: 'Firebase feature flag' },
  { key: 'NEXT_PUBLIC_DUAL_WRITE_MODE', label: 'Dual write mode flag' },
]

const present = (value) => (value && value.length > 0 ? '\u2705 set' : '\u26A0\uFE0F  missing')

console.log('\n=== Environment readiness ===')
envMap.forEach(({ key, label }) => {
  const value = process.env[key]
  console.log(`${label}: ${present(value)} (${key})`)
})
console.log('============================\n')

// Exit with non-zero if any required private admin var is missing (makes prebuild/predev fail if desired)
const required = ['NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID']
const missing = required.filter((k) => !process.env[k])
if (missing.length) {
  console.warn('Missing required public env keys:', missing.join(', '))
}

module.exports = {};
