# Renders every posts/src/*.html screen to posts/png/*.png at 1600x1000 @2x (3200x2000).
# Usage:  powershell -ExecutionPolicy Bypass -File posts\render.ps1   [optional: name filter, e.g. "1-inbox"]
param([string]$Only = "")

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "C:\Program Files\Google\Chrome\Application\chrome.exe" }

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src  = Join-Path $root "src"
$out  = Join-Path $root "png"
New-Item -ItemType Directory -Force $out | Out-Null
$profileDir = Join-Path $env:TEMP "catalyst-render-profile"

Get-ChildItem $src -Filter *.html | Where-Object { $_.BaseName -like "*$Only*" } | ForEach-Object {
  $png = Join-Path $out ($_.BaseName + ".png")
  $url = "file:///" + ($_.FullName -replace '\\', '/')
  & $edge --headless=new --disable-gpu --hide-scrollbars --no-first-run `
    "--user-data-dir=$profileDir" `
    --force-device-scale-factor=2 --window-size=1600,1000 `
    --virtual-time-budget=6000 "--screenshot=$png" $url 2>$null | Out-Null
  Write-Host "rendered $png"
}
