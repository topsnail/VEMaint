param(
  [string]$ProjectPath = "C:\web\VEMaint",
  [int]$Port = 8788,
  [int]$FrontendPort = 5173,
  [switch]$Clean,
  [switch]$SkipInit
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Exit-WithPause {
  param(
    [int]$Code = 0
  )
  Write-Host ""
  Read-Host "按回车关闭窗口"
  exit $Code
}

$projectPath = $ProjectPath
if (-not (Test-Path $projectPath)) {
  Write-Host "项目目录不存在：$projectPath" -ForegroundColor Red
  Write-Host "请修改脚本顶部的 ProjectPath，或运行时传入 -ProjectPath。" -ForegroundColor Yellow
  Exit-WithPause 1
}

if (-not (Test-Path (Join-Path $projectPath "package.json"))) {
  Write-Host "在项目目录下未找到 package.json：$projectPath" -ForegroundColor Red
  Write-Host "请确认 ProjectPath 指向 VEMaint 根目录。" -ForegroundColor Yellow
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
Write-Host "        VEMaint 本地开发环境启动              " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] 检查端口占用中（API:$Port / Frontend:$FrontendPort）..." -ForegroundColor Yellow
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
      Write-Host "[1/4] 端口 $p 被其他程序占用，已跳过强制结束（避免误杀）" -ForegroundColor Red
      Write-Host "      请手动释放端口后重试，或改用 -Port / -FrontendPort。" -ForegroundColor Yellow
      Exit-WithPause 1
    }
  }
}
Write-Host "[1/4] 端口检查完成 [成功]" -ForegroundColor Green

Write-Host "[2/4] 进入项目目录中..." -ForegroundColor Yellow
Set-Location $projectPath
Write-Host "[2/4] 已进入项目目录 [成功]" -ForegroundColor Green

if ($Port -ne 8788) {
  Write-Host "提示：当前前端 /api 代理默认指向 8788，若修改 -Port 需同步调整 vite 代理配置。" -ForegroundColor Yellow
}

if ($Clean) {
  Write-Host "[3/4] 清理本地构建缓存..." -ForegroundColor Yellow
  if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue }
  if (Test-Path ".wrangler/state") { Remove-Item -Recurse -Force ".wrangler/state" -ErrorAction SilentlyContinue }
  Write-Host "[3/4] 已清理缓存 [成功]" -ForegroundColor Green
} else {
  Write-Host "[3/4] 跳过缓存清理（可用 -Clean 开启）" -ForegroundColor Green
}

Write-Host ""
Write-Host "[4/4] 启动本地环境（D1 初始化 → Seed → API Dev + 前端 HMR）" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Gray
Write-Host "           项目启动中，请稍候...             " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Gray
Write-Host ""

if (-not $SkipInit) {
  npm run db:init:local
  if ($LASTEXITCODE -ne 0) { Exit-WithPause $LASTEXITCODE }

  npm run db:seed:local
  if ($LASTEXITCODE -ne 0) { Exit-WithPause $LASTEXITCODE }
} else {
  Write-Host "跳过 D1 初始化与 Seed（-SkipInit）" -ForegroundColor Yellow
}

if (-not $env:AUTH_SECRET -or [string]::IsNullOrWhiteSpace($env:AUTH_SECRET)) {
  $env:AUTH_SECRET = "local-dev-auth-secret-please-change"
}

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
  Write-Host "启动本地 API 失败（wrangler pages dev）" -ForegroundColor Red
  Exit-WithPause 1
}

Start-Sleep -Seconds 2
if ($wranglerProcess.HasExited) {
  Write-Host "本地 API 进程异常退出，请检查 wrangler 输出日志。" -ForegroundColor Red
  Exit-WithPause 1
}

Write-Host ""
Write-Host "本地开发服务已启动：" -ForegroundColor Green
Write-Host "- API:      http://127.0.0.1:$Port" -ForegroundColor Cyan
Write-Host "- Frontend: http://127.0.0.1:$FrontendPort  (支持热更新)" -ForegroundColor Cyan
Write-Host ""
Write-Host "提示：修改 frontend/、functions/、drizzle/ 文件后会自动生效。" -ForegroundColor Yellow
Write-Host "按 Ctrl+C 可停止，脚本会自动清理后台 API 进程。" -ForegroundColor Yellow
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
Write-Host "项目已停止，窗口保持打开" -ForegroundColor Red
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "按回车关闭窗口"