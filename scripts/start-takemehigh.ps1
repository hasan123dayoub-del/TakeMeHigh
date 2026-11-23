<#
  TakeMeHigh - one-command local start (Windows PowerShell 5.1+)

  1. Starts the local development PostgreSQL (port from DATABASE_URL) if it is not running.
     - Uses the data folder in $env:TAKEMEHIGH_PGDATA, or C:\Hakathon\pgdata-safarni by default.
     - If no such folder exists, it assumes your own PostgreSQL service is already running.
  2. Installs dependencies on first run.
  3. Applies database migrations (safe - never deletes data) and loads demo data if the DB is empty.
  4. Starts the API (http://localhost:3001) and the web app (http://localhost:3000).

  Usage (from the project folder):   powershell -ExecutionPolicy Bypass -File scripts\start-takemehigh.ps1
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Info($msg) { Write-Host "  > $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "  [ok] $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "  [x] $msg" -ForegroundColor Red; exit 1 }

Write-Host "`nTakeMeHigh - local start`n" -ForegroundColor White

# ---------------------------------------------------------------- .env
if (-not (Test-Path "$root\.env")) {
  Fail ".env not found. Copy .env.example to .env and set DATABASE_URL and JWT_SECRET (see README)."
}
$dbUrl = (Select-String -Path "$root\.env" -Pattern '^DATABASE_URL=(.*)$').Matches | Select-Object -First 1
if (-not $dbUrl) { Fail "DATABASE_URL is missing in .env" }
$uri = [uri]($dbUrl.Groups[1].Value)
$port = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }

# ---------------------------------------------------------------- PostgreSQL
$listening = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
if ($listening) {
  Ok "PostgreSQL is running on port $port"
} else {
  $pgData = if ($env:TAKEMEHIGH_PGDATA) { $env:TAKEMEHIGH_PGDATA } else { 'C:\Hakathon\pgdata-safarni' }
  $pgBin = Get-ChildItem 'C:\Program Files\PostgreSQL' -Directory -ErrorAction SilentlyContinue |
    Sort-Object { [int]($_.Name -replace '\D', '') } -Descending | Select-Object -First 1
  if (-not $pgBin -or -not (Test-Path $pgData)) {
    Fail "Nothing is listening on port $port. Start your PostgreSQL service (or set TAKEMEHIGH_PGDATA to a data folder)."
  }
  # Keep the log outside the data folder: after an unclean shutdown, recovery syncs every file in it
  # and stalls on a log file that pg_ctl holds open (Windows "sharing violation").
  $pgLog = "$pgData.log"
  Info "Starting PostgreSQL ($($pgBin.Name)) from $pgData on port $port ..."
  # Detached, so this window is not tied to the database process.
  Start-Process -FilePath "$($pgBin.FullName)\bin\pg_ctl.exe" `
    -ArgumentList @('-D', "`"$pgData`"", '-l', "`"$pgLog`"", '-o', "`"-p $port`"", 'start') `
    -WindowStyle Hidden
  for ($i = 0; $i -lt 30 -and -not (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue); $i++) {
    Start-Sleep -Milliseconds 500
  }
  if (-not (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue)) {
    Fail "PostgreSQL did not start. See $pgLog"
  }
  # The port opens before the server accepts connections ("the database system is starting up"),
  # e.g. while it recovers after an unclean shutdown. Wait until it is really ready.
  $pgIsReady = "$($pgBin.FullName)\bin\pg_isready.exe"
  if (Test-Path $pgIsReady) {
    $ready = $false
    for ($i = 0; $i -lt 180; $i++) {
      & $pgIsReady -h localhost -p $port -q
      if ($LASTEXITCODE -eq 0) { $ready = $true; break }
      Start-Sleep -Milliseconds 500
    }
    if (-not $ready) { Fail "PostgreSQL is not accepting connections yet. See $pgLog" }
  } else {
    Start-Sleep -Seconds 3
  }
  Ok "PostgreSQL started on port $port"
}

# ---------------------------------------------------------------- ports 3000 / 3001
foreach ($p in 3000, 3001) {
  $c = Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($c) {
    $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)").CommandLine
    if ($cmd -match 'travelos') {
      Fail "TakeMeHigh already seems to be running (port $p). Open http://localhost:3000 or close the other terminal first."
    }
    Fail "Port $p is used by another program: $cmd"
  }
}

# ---------------------------------------------------------------- dependencies, database
if (-not (Test-Path "$root\node_modules")) {
  Info "Installing dependencies (first run, a few minutes) ..."
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { Fail "npm install failed" }
}

Info "Applying database migrations ..."
npm run db:migrate --silent
if ($LASTEXITCODE -ne 0) { Fail "Migrations failed (is DATABASE_URL correct?)" }
Ok "Database schema is up to date"

Info "Loading demo data (skipped if it already exists) ..."
npm run db:seed --silent
if ($LASTEXITCODE -ne 0) { Fail "Seeding failed" }

# ---------------------------------------------------------------- run
Write-Host ""
Ok "Starting TakeMeHigh:"
Write-Host "      Public page http://localhost:3000"
Write-Host "      Dashboard  http://localhost:3000/dashboard   (admin@takemehigh.local / TakeMeHigh@2026)"
Write-Host "      API docs   http://localhost:3001/api/docs"
Write-Host "      Stop with Ctrl+C`n"
npm run dev
