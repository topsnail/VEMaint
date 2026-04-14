param(
  [int]$Port = 3000,
  [switch]$Clean
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "              VEMaint 一键启动               " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] 检查端口 $Port 占用中..." -ForegroundColor Yellow
$connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

function Stop-LocalDevIfSafe($pid, $projectPath) {
  try {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId = $pid" -ErrorAction SilentlyContinue
    if (-not $p) { return $false }
    $cmd = ""
    if ($null -ne $p.CommandLine) { $cmd = [string]$p.CommandLine }
    $isNode = ($p.Name -eq "node.exe" -or $cmd -match "node\.exe")
    $isProject = ($cmd -like "*$projectPath*")
    $looksLikeNext = ($cmd -match "next" -or $cmd -match "start-server\.js")
    if ($isNode -and ($isProject -or $looksLikeNext)) {
      Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
      return $true
    }
    return $false
  } catch {
    return $false
  }
}

if ($connections) {
  $killedAny = $false
  foreach ($c in $connections) {
    if ($null -ne $c.OwningProcess -and (Stop-LocalDevIfSafe -pid $c.OwningProcess -projectPath $projectPath)) {
      $killedAny = $true
    }
  }
  if ($killedAny) {
    Write-Host "[1/4] 已结束占用端口的本地服务进程 [成功]" -ForegroundColor Green
  } else {
    Write-Host "[1/4] 端口被其他程序占用，已跳过强制结束（避免误杀）" -ForegroundColor Red
    Write-Host "      请手动释放端口后重试，或使用 -Port 3001 启动。" -ForegroundColor Yellow
    exit 1
  }
}
else {
  Write-Host "[1/4] 端口未占用 [成功]" -ForegroundColor Green
}

Write-Host "[2/4] 进入项目目录中..." -ForegroundColor Yellow
Set-Location $projectPath
Write-Host "[2/4] 已进入项目目录 [成功]" -ForegroundColor Green

if ($Clean) {
  Write-Host "[3/4] 清理 Next 构建缓存..." -ForegroundColor Yellow
  if (Test-Path ".next") { Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue }
  if (Test-Path ".next-dev") { Remove-Item -Recurse -Force ".next-dev" -ErrorAction SilentlyContinue }
  Write-Host "[3/4] 已清理缓存 [成功]" -ForegroundColor Green
} else {
  Write-Host "[3/4] 跳过缓存清理（可用 -Clean 开启）" -ForegroundColor Green
}

Write-Host ""
Write-Host "[4/4] 启动本地环境（迁移 → 种子 → 启动 dev）" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Gray
Write-Host "           项目启动中，请稍候...             " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Gray
Write-Host ""

npm run db:migrate:local
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm run db:seed:local
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$env:NEXT_DISABLE_TRACE = "1"
npx next dev -p $Port

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "项目已停止，窗口保持打开" -ForegroundColor Red
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""