# Collega Git all'account GitHub corretto: sfondiitaliani23-svg
# Esegui da PowerShell: .\scripts\github-login.ps1

$gcm = "C:\Program Files\Git\mingw64\bin\git-credential-manager.exe"

if (-not (Test-Path $gcm)) {
    Write-Error "Git Credential Manager non trovato. Installa Git for Windows."
    exit 1
}

Write-Host "Account GitHub attualmente registrati:"
& $gcm github list
Write-Host ""

Write-Host "Apertura login GitHub per l'account sfondiitaliani23-svg..."
Write-Host "Si aprira' il browser: accedi con l'account che possiede il repo garofalo-barberia."
Write-Host ""

Remove-Item Env:GIT_TERMINAL_PROMPT -ErrorAction SilentlyContinue
& $gcm github login --username sfondiitaliani23-svg --browser

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Login riuscito. Verifica con:"
    Write-Host "  git credential-manager github list"
    Write-Host "  git push -u origin master:main"
} else {
    Write-Host ""
    Write-Host "Login non completato. Prova il device flow:"
    Write-Host "  git credential-manager github login --username sfondiitaliani23-svg --device"
}