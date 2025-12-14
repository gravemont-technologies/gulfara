# DB Schema (canonical)

Canonical schema: `db/schema.sql`

Purpose
- `db/schema.sql` is the single source of truth for database schema used by Gulfara environments.
- `supabase-schema.sql` exists as a temporary compatibility copy for existing documentation that references that filename.
- `db/inverse-schema.sql` provides a minimal rollback for the small patch appended to `db/schema.sql`.

Quick usage
- Apply canonical schema (Supabase SQL Editor or psql):

```ps1
psql "postgresql://<user>:<password>@<host>:<port>/<db>" -f db\schema.sql
```

- Apply compatibility copy (if a doc references `supabase-schema.sql`):

```ps1
psql "postgresql://<user>:<password>@<host>:<port>/<db>" -f supabase-schema.sql
```

- Rollback the recent patch introduced at the end of `db/schema.sql`:

```ps1
psql "postgresql://<user>:<password>@<host>:<port>/<db>" -f db\inverse-schema.sql
```

Apply directly in Supabase (recommended for quick deployment)
- Supabase SQL Editor: open your project -> SQL Editor -> New Query. Paste the entire contents of `db/schema.sql` and click **RUN**. Review output for errors.

- Supabase CLI (if installed):

```powershell
supabase db remote set --project-ref <your-project-ref> --db-url "postgresql://<user>:<password>@<host>:<port>/<db>"
psql "%SUPABASE_DB_URL%" -f db\schema.sql
```

Local helper script (Windows PowerShell)
- If you prefer running locally and have `psql` installed, use `db\run_schema.ps1`. It reads connection info from environment variables:

```powershell
$env:PGHOST = '<host>'
$env:PGPORT = '5432'
$env:PGUSER = '<user>'
$env:PGPASSWORD = '<password>'
$env:PGDATABASE = '<db>'
.\db\run_schema.ps1
```

The script will construct a connection string and run `psql -f db/schema.sql`.

Migration guidance
- For small changes, add a timestamped pair under `db/migrations/` with a clear forward and inverse SQL file (see `db/migrations/20251211_add_usage_metadata.sql`).
- To roll out gradual changes, prefer migrations; reserve direct edits to `db/schema.sql` for final state snapshots after the migrations are applied.

Conventions
- Always prefer `db/schema.sql` in new docs and scripts.
- If an external doc or script still expects `supabase-schema.sql`, use the compatibility copy; schedule removal once all references are updated.

Contact
- If unsure about a schema change, open a draft PR and ping the maintainers for review.
