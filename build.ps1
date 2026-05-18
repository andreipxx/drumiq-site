# DRUMIQ — Build + Auto-Update Download Links
# Utilizare: .\build.ps1
# Face EAS build, extrage link-ul DIRECT al APK-ului, actualizeaza site-ul automat.

$ErrorActionPreference = "Stop"
$root = "D:\Exercitiu instalare\DrumIQ"
$appDir = "$root\app"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  DRUMIQ — Build & Update" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. EAS Build
Write-Host "[1/4] Pornesc EAS build..." -ForegroundColor Yellow
Set-Location $appDir
$output = eas build --platform android --profile preview --non-interactive 2>&1 | Out-String

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build ESUAT!" -ForegroundColor Red
    Write-Host $output
    exit 1
}

Write-Host "Build REUSIT!" -ForegroundColor Green

# 2. Extrage build ID
Write-Host "`n[2/4] Extrag build ID..." -ForegroundColor Yellow

$idMatch = [regex]::Match($output, 'builds/([a-f0-9\-]{36})')
if (-not $idMatch.Success) {
    Write-Host "Nu am gasit build ID in output!" -ForegroundColor Red
    exit 1
}
$buildId = $idMatch.Groups[1].Value
Write-Host "Build ID: $buildId" -ForegroundColor Green

# 3. Extrage URL-ul DIRECT al APK-ului
Write-Host "`n[3/4] Extrag link direct APK..." -ForegroundColor Yellow

$json = eas build:view $buildId --json 2>&1 | Out-String
$apkMatch = [regex]::Match($json, '"buildUrl":\s*"(https://expo\.dev/artifacts/eas/[^"]+\.apk)"')

if (-not $apkMatch.Success) {
    Write-Host "Nu am gasit URL-ul direct APK!" -ForegroundColor Red
    Write-Host "JSON: $json"
    exit 1
}

$apkUrl = $apkMatch.Groups[1].Value
Write-Host "APK direct: $apkUrl" -ForegroundColor Green

# 4. Actualizeaza link-urile pe site
Write-Host "`n[4/4] Actualizez link-urile pe site..." -ForegroundColor Yellow

$files = @(
    "$root\instalare.html",
    "$root\drumiq-site-full.html"
)

$updated = 0
foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw -Encoding utf8
        $newContent = $content -replace 'href="https://expo\.dev/artifacts/eas/[^"]+\.apk"', "href=`"$apkUrl`""
        if ($content -ne $newContent) {
            $newContent | Set-Content $file -Encoding utf8 -NoNewline
            $updated++
            Write-Host "  OK $(Split-Path $file -Leaf)" -ForegroundColor Green
        } else {
            Write-Host "  SKIP $(Split-Path $file -Leaf) (link deja la zi)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  GATA! $updated fisiere actualizate." -ForegroundColor Green
Write-Host "  APK DIRECT: $apkUrl" -ForegroundColor White
Write-Host "  Fa git push pe drumiq.ro sa fie live." -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan
