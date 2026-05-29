$ErrorActionPreference = 'Stop'

$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$tools = Join-Path $workspace '.dev-tools'
$data = Join-Path $workspace '.dev-data'
$logs = Join-Path $data 'logs'
$redisExe = Join-Path $tools 'redis7\server\Redis-7.4.9-Windows-x64-msys2\redis-server.exe'
$minioExe = Join-Path $tools 'minio\minio.exe'
$mailpitExe = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\axllent.mailpit_Microsoft.Winget.Source_8wekyb3d8bbwe\mailpit.exe'

foreach ($path in @($redisExe, $minioExe, $mailpitExe)) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing development dependency: $path"
  }
}

foreach ($directory in @((Join-Path $data 'redis'), (Join-Path $data 'minio'), (Join-Path $data 'mailpit'), $logs)) {
  New-Item -ItemType Directory -Force -Path $directory | Out-Null
}

function Test-Listener([int]$port) {
  return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

if (-not (Test-Listener 6380)) {
  $redisData = Join-Path $data 'redis'
  Start-Process -WindowStyle Hidden -FilePath $redisExe `
    -ArgumentList @('--port', '6380', '--dir', "`"$redisData`"", '--dbfilename', 'dump.rdb') `
    -RedirectStandardOutput (Join-Path $logs 'redis.out.log') `
    -RedirectStandardError (Join-Path $logs 'redis.err.log')
}

if (-not (Test-Listener 9000)) {
  $env:MINIO_ROOT_USER = 'wattsstore'
  $env:MINIO_ROOT_PASSWORD = 'wattsstore_dev_pw'
  $minioData = Join-Path $data 'minio'
  Start-Process -WindowStyle Hidden -FilePath $minioExe `
    -ArgumentList @('server', "`"$minioData`"", '--address', ':9000', '--console-address', ':9001') `
    -RedirectStandardOutput (Join-Path $logs 'minio.out.log') `
    -RedirectStandardError (Join-Path $logs 'minio.err.log')
}

if (-not (Test-Listener 1025)) {
  $mailpitData = Join-Path $data 'mailpit\messages.db'
  Start-Process -WindowStyle Hidden -FilePath $mailpitExe `
    -ArgumentList @('--smtp', '127.0.0.1:1025', '--listen', '127.0.0.1:8025', '--database', "`"$mailpitData`"", '--disable-version-check') `
    -RedirectStandardOutput (Join-Path $logs 'mailpit.out.log') `
    -RedirectStandardError (Join-Path $logs 'mailpit.err.log')
}

Start-Sleep -Seconds 2
$ports = 6380, 9000, 9001, 1025, 8025
$status = foreach ($port in $ports) {
  [pscustomobject]@{ Port = $port; Listening = Test-Listener $port }
}
$status | Format-Table -AutoSize

if ($status.Listening -contains $false) {
  throw 'One or more development services failed to start. Review .dev-data\logs.'
}
