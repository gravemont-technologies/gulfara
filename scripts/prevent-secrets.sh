#!/usr/bin/env bash
# Lightweight secret detector for pre-commit use.
# Exits non-zero if likely secrets are present in staged files.

set -euo pipefail

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

FAIL=0

for f in $STAGED_FILES; do
  # Only check text files
  if file --mime-type "$f" | grep -q text; then
    if git show :"$f" | grep -E --quiet "sk-[A-Za-z0-9_-]{20,}"; then
      echo "[prevent-secrets] Found possible OpenAI secret in $f"
      FAIL=1
    fi
    if git show :"$f" | grep -E --quiet "SUPABASE_SERVICE_ROLE_KEY|SUPABASE_ANON_KEY|CLERK_SECRET_KEY"; then
      echo "[prevent-secrets] Found possible service key name in $f"
      FAIL=1
    fi
    if git show :"$f" | grep -E --quiet "-----BEGIN PRIVATE KEY-----|PRIVATE KEY"; then
      echo "[prevent-secrets] Found private key block in $f"
      FAIL=1
    fi
  fi
done

if [ "$FAIL" -ne 0 ]; then
  echo "Commit aborted. Remove secrets from staged files or add to .gitignore/backing store."
  exit 1
fi

exit 0
