<#
PowerShell helper: run_schema.ps1
Runs `db/schema.sql` using psql. Requires `psql` (Postgres client) on PATH.

Usage (Windows PowerShell):

$env:PGHOST = '<host>'
$env:PGPORT = '5432'
$env:PGUSER = '<user>'
$env:PGPASSWORD = '<password>'
$env:PGDATABASE = '<db>'
.\db\run_schema.ps1

Or set a full connection string in environment variable `PG_CONN`:
$env:PG_CONN = 'postgresql://user:pass@host:5432/db'
.\db\run_schema.ps1
#>

param()

function Get-ConnectionString {
    if ($env:PG_CONN) { return $env:PG_CONN }
    if (-not $env:PGHOST -or -not $env:PGUSER -or -not $env:PGPASSWORD -or -not $env:PGDATABASE) {
        Write-Error "Missing one of required env vars: PGHOST, PGUSER, PGPASSWORD, PGDATABASE. Or set PG_CONN with full connection string."
        exit 2
    }
    $host = $env:PGHOST
    $port = if ($env:PGPORT) { $env:PGPORT } else { '5432' }
    $user = $env:PGUSER
    $pass = $env:PGPASSWORD
    $db = $env:PGDATABASE
    return "postgresql://$user:$pass@$host:$port/$db"
}

$conn = Get-ConnectionString
Write-Output "Using connection: $conn"

# Execute the SQL file
$schemaFile = Join-Path -Path $PSScriptRoot -ChildPath 'schema.sql'
$schemaPath = Join-Path -Path $PSScriptRoot -ChildPath 'schema.sql'
if (-not (Test-Path $schemaPath)) {
    Write-Error "schema.sql not found in db directory: $schemaPath"
    exit 1
}

$psqlCmd = "psql `"$conn`" -f `"$schemaPath`""
Write-Output "Running: $psqlCmd"
Invoke-Expression $psqlCmd
if ($LASTEXITCODE -ne 0) {
    Write-Error "psql returned exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}
Write-Output "Schema applied successfully."
