$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectPath

Write-Host '正在启动 BioScope 人体解剖探索台…' -ForegroundColor Cyan

Write-Host '正在准备最新版本，请稍候…' -ForegroundColor Yellow
& npm.cmd run local-build
if ($LASTEXITCODE -ne 0) { throw '网站构建失败。' }

Start-Process 'http://127.0.0.1:3000/'
Write-Host '网站地址：http://127.0.0.1:3000/' -ForegroundColor Green
Write-Host '请保持此窗口打开；关闭窗口即停止网站。' -ForegroundColor DarkGray
& npm.cmd run local-start
