# DRUMIQ — Actualizare automată link descărcare APK pe site
# Rulează după fiecare EAS build reușit
# Utilizare: .\update-download-links.ps1
# Sau cu URL manual: .\update-download-links.ps1 -BuildUrl "https://expo.dev/artifacts/eas/..."

param(
    [string]$BuildUrl
)

$root = "D:\Exercitiu instalare\DrumIQ"

# Dacă nu s-a dat URL manual, ia ultimul build reușit de pe EAS
if (-not $BuildUrl) {
    Write-Host "Caut ultimul build Android reusit pe EAS..." -ForegroundColor Cyan
    $json = eas build:list --platform android --status finished --limit 1 --json 2>$null | ConvertFrom-Json
    if ($json -and $json.Count -gt 0) {
        $BuildUrl = $json[0].artifacts.buildUrl
        $buildId = $json[0].id
        Write-Host "Gasit build: $buildId" -ForegroundColor Green
        Write-Host "APK URL: $BuildUrl" -ForegroundColor Green
    } else {
        Write-Host "Nu am gasit niciun build reusit. Specifica URL manual." -ForegroundColor Red
        exit 1
    }
}

if (-not $BuildUrl) {
    Write-Host "Lipseste URL-ul APK." -ForegroundColor Red
    exit 1
}

Write-Host "`nActualizez link-urile pe site..." -ForegroundColor Cyan

$files = @(
    "$root\instalare.html",
    "$root\drumiq-site-full.html"
)

$pattern = 'href="[^"]*"(\s+class="btn-primary"[^>]*>)\s*⬇\s*DESCARCĂ DRUMIQ\.APK'
$count = 0

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw -Encoding utf8
        $newContent = $content -replace 'href="[^"]*"(\s+class="btn-primary")', "href=`"$BuildUrl`"`$1"
        if ($content -ne $newContent) {
            $newContent | Set-Content $file -Encoding utf8 -NoNewline
            $count++
            Write-Host "  Actualizat: $(Split-Path $file -Leaf)" -ForegroundColor Green
        } else {
            Write-Host "  Neschimbat: $(Split-Path $file -Leaf)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`nGata! $count fisiere actualizate cu noul link APK." -ForegroundColor Cyan
Write-Host "Link: $BuildUrl" -ForegroundColor White
