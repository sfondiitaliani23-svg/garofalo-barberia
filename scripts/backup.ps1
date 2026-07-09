# Backup automatico progetto Garofalo Barberia
# Copia progetto + ZIP con timestamp + push GitHub

param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$BackupDir = "D:\UsersData\Eliseo Miraglia\Desktop\BARBERIA GAROFALO BACKUPS"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ProjectRoot)) {
    Write-Error "Cartella progetto non trovata: $ProjectRoot"
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$archiveName = "garofalo-barberia_$timestamp.zip"
$archivePath = Join-Path $BackupDir $archiveName
$tempCopy = Join-Path $env:TEMP "garofalo-backup-$timestamp"

if (Test-Path $tempCopy) { Remove-Item $tempCopy -Recurse -Force }
New-Item -ItemType Directory -Force -Path $tempCopy | Out-Null

$robocopyArgs = @(
    $ProjectRoot,
    $tempCopy,
    '/MIR',
    '/XD', 'node_modules', '.next', '.vercel', 'dist', 'build', '.turbo',
    '/XF', '*.zip', '*.log',
    '/NFL', '/NDL', '/NJH', '/NJS', '/NC', '/NS'
)

& robocopy @robocopyArgs | Out-Null
$rc = $LASTEXITCODE
if ($rc -ge 8) {
    Write-Error "Robocopy fallito con codice $rc"
}

Compress-Archive -Path (Join-Path $tempCopy '*') -DestinationPath $archivePath -Force
Remove-Item $tempCopy -Recurse -Force

$sizeMb = [math]::Round((Get-Item $archivePath).Length / 1MB, 2)
Write-Host "Backup creato: $archivePath ($sizeMb MB)"

Push-Location $ProjectRoot
try {
    $branch = git rev-parse --abbrev-ref HEAD 2>$null
    if ($LASTEXITCODE -eq 0) {
        $status = git status --porcelain
        if ($status) {
            Write-Host "Attenzione: ci sono modifiche non committate."
        }
        git push origin $branch 2>&1 | ForEach-Object { Write-Host $_.ToString() }
        if ($LASTEXITCODE -eq 0) {
            Write-Host "GitHub sincronizzato (branch $branch)"
        } else {
            Write-Warning "Push GitHub non riuscito - backup locale disponibile."
        }
    }
} finally {
    Pop-Location
}

Get-ChildItem -Path $BackupDir -Filter "garofalo-barberia_*.zip" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 10 |
    ForEach-Object {
        Remove-Item $_.FullName -Force
        Write-Host "Rimosso backup vecchio: $($_.Name)"
    }

Write-Host "Backup completato."