param(
  [string]$ProjectPath = "C:\web\VEMaint",
  [int]$Port = 8788,
  [int]$FrontendPort = 5173,
  [switch]$Clean,
  [switch]$SkipInit,
  # Keep console window open by default (double-click friendly)
  [string]$KeepOpen = "true"
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function As-Bool {
  param([string]$Value, [bool]$Default = $true)
  if ($null -eq $Value) { return $Default }
  $v = $Value.Trim().ToLowerInvariant()
  if ($v -eq "") { return $Default }
  if ($v -in @("1","true","t","yes","y","on")) { return $true }
  if ($v -in @("0","false","f","no","n","off")) { return $false }
  return $Default
}

$KeepOpenFlag = As-Bool -Value $KeepOpen -Default $true

function Exit-WithPause {
  param(
    [int]$Code = 0
  )
  Write-Host ""
  if ($KeepOpenFlag) {
    Write-Host ("Script finished (ExitCode={0}). Window will stay open; close it manually." -f $Code) -ForegroundColor Yellow
    while ($true) { Start-Sleep -Seconds 3600 }
  } else {
    Read-Host "Press Enter to close"
    exit $Code
  }
}

$projectPath = $ProjectPath
if (-not (Test-Path $projectPath)) {
  Write-Host ('Project path not found: {0}' -f $projectPath) -ForegroundColor Red
  Write-Host 'Fix ProjectPath or pass -ProjectPath when running.' -ForegroundColor Yellow
  Exit-WithPause 1
}

if (-not (Test-Path (Join-Path $projectPath "package.json"))) {
  Write-Host ('package.json not found under: {0}' -f $projectPath) -ForegroundColor Red
  Write-Host 'Make sure ProjectPath points to the VEMaint repo root.' -ForegroundColor Yellow
  Exit-WithPause 1
}

function Stop-LocalDevIfSafe {
  param(
    [int]$ProcessId,
    [string]$ProjectPath
  )
  try {
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
    if (-not $proc) { return $false }
    $cmd = if ($null -ne $proc.CommandLine) { [string]$proc.CommandLine } else { "" }
    $isNode = ($proc.Name -eq "node.exe" -or $cmd -match "node(\.exe)?")
    $isProject = ($cmd -like "*$ProjectPath*")
    $looksLikeWrangler = ($cmd -match "wrangler" -or $cmd -match "pages dev")
    if ($isNode -and ($isProject -or $looksLikeWrangler)) {
      Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
      return $true
    }
    return $false
  } catch {
    return $false
  }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "            VEMaint Local Dev Start           " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host ("[1/4] Checking ports (API:{0} / Frontend:{1})..." -f $Port, $FrontendPort) -ForegroundColor Yellow
$portsToCheck = @($Port, $FrontendPort) | Select-Object -Unique
foreach ($p in $portsToCheck) {
  $connections = @()
  try {
    $connections = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
  } catch {
    $connections = @()
  }

  if ($connections) {
    $killedAny = $false
    foreach ($c in $connections) {
      if ($null -ne $c.OwningProcess -and (Stop-LocalDevIfSafe -ProcessId $c.OwningProcess -ProjectPath $projectPath)) {
        $killedAny = $true
      }
    }
    if (-not $killedAny) {
      Write-Host ("[1/4] Port {0} is used by another process; not killing it for safety." -f $p) -ForegroundColor Red
      Write-Host "      Free the port or use -Port / -FrontendPort." -ForegroundColor Yellow
      Exit-WithPause 1
    }
  }
}
Write-Host "[1/4] Port check OK" -ForegroundColor Green

Write-Host "[2/4] Switching to project directory..." -ForegroundColor Yellow
Set-Location $projectPath
Write-Host "[2/4] Project directory OK" -ForegroundColor Green

if ($Port -ne 8788) {
  Write-Host "NOTE: frontend /api proxy defaults to 8788. If you change -Port, update Vite proxy accordingly." -ForegroundColor Yellow
}

if ($Clean) {
  Write-Host "[3/4] Cleaning local caches..." -ForegroundColor Yellow
  if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue }
  if (Test-Path ".wrangler/state") { Remove-Item -Recurse -Force ".wrangler/state" -ErrorAction SilentlyContinue }
  Write-Host "[3/4] Cache clean OK" -ForegroundColor Green
} else {
  Write-Host "[3/4] Skipping cache clean (use -Clean to enable)" -ForegroundColor Green
}

Write-Host ""
Write-Host "[4/4] Starting local env (D1 init/migrate/seed + Pages dev + Vite HMR)" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Gray
Write-Host "               Starting, please wait...       " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Gray
Write-Host ""

Write-Host "Building dist for wrangler pages dev..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { Exit-WithPause $LASTEXITCODE }

if (-not $SkipInit) {
  npm run db:init:local
  if ($LASTEXITCODE -ne 0) { Exit-WithPause $LASTEXITCODE }

  npm run db:migrate:local
  if ($LASTEXITCODE -ne 0) { Exit-WithPause $LASTEXITCODE }

  npm run db:seed:local
  if ($LASTEXITCODE -ne 0) { Exit-WithPause $LASTEXITCODE }
} else {
  Write-Host "Skipping D1 init/migrate/seed (-SkipInit)" -ForegroundColor Yellow
}

if (-not $env:AUTH_SECRET -or [string]::IsNullOrWhiteSpace($env:AUTH_SECRET)) { $env:AUTH_SECRET = "local-dev-auth-secret-please-change" }
if (-not $env:BOOTSTRAP_ADMIN_USER -or [string]::IsNullOrWhiteSpace($env:BOOTSTRAP_ADMIN_USER)) { $env:BOOTSTRAP_ADMIN_USER = "admin" }
if (-not $env:BOOTSTRAP_ADMIN_PASS -or [string]::IsNullOrWhiteSpace($env:BOOTSTRAP_ADMIN_PASS)) { $env:BOOTSTRAP_ADMIN_PASS = "123456" }

$wranglerArgs = @(
  "wrangler", "pages", "dev", "dist",
  "--compatibility-date=2024-10-22",
  "--port", "$Port"
)
$cmdArgs = @("/c", "npx") + $wranglerArgs

$wranglerProcess = Start-Process `
  -FilePath "cmd.exe" `
  -ArgumentList $cmdArgs `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $projectPath ".wrangler-dev.log") `
  -RedirectStandardError (Join-Path $projectPath ".wrangler-dev.err.log") `
  -WorkingDirectory $projectPath `
  -PassThru

if (-not $wranglerProcess) {
  Write-Host "Failed to start local API (wrangler pages dev)" -ForegroundColor Red
  Exit-WithPause 1
}

Start-Sleep -Seconds 2
if ($wranglerProcess.HasExited) {
  Write-Host "Local API process exited early; check .wrangler-dev.log/.wrangler-dev.err.log" -ForegroundColor Red
  Exit-WithPause 1
}

Write-Host ""
Write-Host "Local dev services started:" -ForegroundColor Green
Write-Host ("- API:      http://127.0.0.1:{0}" -f $Port) -ForegroundColor Cyan
Write-Host ("- Frontend: http://127.0.0.1:{0}  (HMR)" -f $FrontendPort) -ForegroundColor Cyan
Write-Host ""
Write-Host "Edits to frontend/, functions/, drizzle/ will take effect automatically." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop; the script will clean up the background API process." -ForegroundColor Yellow
Write-Host ""

try {
  npm run dev -- --host 127.0.0.1 --port $FrontendPort --strictPort
  if ($LASTEXITCODE -ne 0) { Exit-WithPause $LASTEXITCODE }
}
finally {
  if ($wranglerProcess -and -not $wranglerProcess.HasExited) {
    Stop-Process -Id $wranglerProcess.Id -Force -ErrorAction SilentlyContinue
  }
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Stopped. Window stays open." -ForegroundColor Red
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
  if ($KeepOpenFlag) {
  Write-Host "Window will stay open. Close it manually (or run with -KeepOpen false)." -ForegroundColor Yellow
  while ($true) { Start-Sleep -Seconds 3600 }
} else {
  Read-Host "Press Enter to close"
}