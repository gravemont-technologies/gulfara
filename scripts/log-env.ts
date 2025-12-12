const envMap: Array<{ key: string; label: string; redact?: boolean }> = [
  { key: 'NODE_ENV', label: 'Node environment' },
  { key: 'VITE_SUPABASE_URL', label: 'Supabase URL' },
  { key: 'VITE_SUPABASE_ANON_KEY', label: 'Supabase anon key set' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase service role key set' },
  { key: 'NEXT_PUBLIC_FIREBASE_API_KEY', label: 'Firebase client API key set' },
  { key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', label: 'Firebase project ID set' },
  { key: 'FIREBASE_ADMIN_PROJECT_ID', label: 'Firebase admin project ID set' },
  { key: 'FIREBASE_ADMIN_CLIENT_EMAIL', label: 'Firebase admin client email set' },
  { key: 'FIREBASE_ADMIN_PRIVATE_KEY', label: 'Firebase admin private key set' },
  { key: 'NEXT_PUBLIC_USE_FIREBASE', label: 'Firebase feature flag' },
  { key: 'NEXT_PUBLIC_DUAL_WRITE_MODE', label: 'Dual write mode flag' },
]

const present = (value: string | undefined) => (value && value.length > 0 ? '✅ set' : '⚠️  missing')

console.log('\n=== Environment readiness ===')
envMap.forEach(({ key, label }) => {
  const value = process.env[key]
  console.log(`${label}: ${present(value)} (${key})`)
})
console.log('============================\n')
