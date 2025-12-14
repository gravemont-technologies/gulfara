#!/usr/bin/env bash
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "Supabase CLI not installed in this container."
  exit 1
fi

echo "🔁 Seeding staging database and functions"
supabase db reset --yes
supabase db push
supabase functions deploy --force

echo "✅ Seeding complete"
