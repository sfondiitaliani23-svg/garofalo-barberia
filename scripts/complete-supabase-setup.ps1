# Setup completo Supabase + Vercel — Garofalo Barberia
# Esegui dopo aver creato il progetto su supabase.com
#
# Uso rapido:
#   .\scripts\complete-supabase-setup.ps1 `
#     -SupabaseUrl "https://XXXX.supabase.co" `
#     -AnonKey "eyJ..." `
#     -ServiceRoleKey "eyJ..." `
#     -DatabaseUrl "postgresql://postgres.[ref]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

param(
    [Parameter(Mandatory = $true)][string]$SupabaseUrl,
    [Parameter(Mandatory = $true)][string]$AnonKey,
    [Parameter(Mandatory = $true)][string]$ServiceRoleKey,
    [string]$DatabaseUrl
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Host "=== Setup Supabase + Vercel ===" -ForegroundColor Cyan

# 1. .env.local
@"
NEXT_PUBLIC_SUPABASE_URL=$SupabaseUrl
NEXT_PUBLIC_SUPABASE_ANON_KEY=$AnonKey
SUPABASE_SERVICE_ROLE_KEY=$ServiceRoleKey
ADMIN_EMAIL=luigigarofalo1996@gmail.com
NEXT_PUBLIC_WHATSAPP_NUMBER=393201886277
NEXT_PUBLIC_SITE_URL=https://garofalo-barberia.vercel.app
"@ | Set-Content ".env.local" -Encoding UTF8
Write-Host "OK .env.local"

# 2. Database schema
if ($DatabaseUrl) {
    $env:DATABASE_URL = $DatabaseUrl
    node scripts/setup-database.mjs
    if ($LASTEXITCODE -ne 0) { throw "Errore setup database" }
} else {
    Write-Host "DatabaseUrl non fornito — esegui manualmente supabase/full_setup.sql nel SQL Editor" -ForegroundColor Yellow
}

# 3. Vercel env
function Set-VercelEnv($name, $value) {
    npx vercel env rm $name production --yes 2>$null | Out-Null
    $value | npx vercel env add $name production --yes | Out-Null
    Write-Host "OK Vercel: $name"
}

Set-VercelEnv "NEXT_PUBLIC_SUPABASE_URL" $SupabaseUrl
Set-VercelEnv "NEXT_PUBLIC_SUPABASE_ANON_KEY" $AnonKey
Set-VercelEnv "SUPABASE_SERVICE_ROLE_KEY" $ServiceRoleKey
Set-VercelEnv "ADMIN_EMAIL" "luigigarofalo1996@gmail.com"
Set-VercelEnv "NEXT_PUBLIC_WHATSAPP_NUMBER" "393201886277"
Set-VercelEnv "NEXT_PUBLIC_SITE_URL" "https://garofalo-barberia.vercel.app"

# 4. Deploy
Write-Host "Deploy produzione..." -ForegroundColor Cyan
npx vercel --prod --yes

Write-Host ""
Write-Host "=== Completato ===" -ForegroundColor Green
Write-Host "Sito: https://garofalo-barberia.vercel.app"
Write-Host ""
Write-Host "Ultimi passi in Supabase Dashboard:" -ForegroundColor Yellow
Write-Host "1. Authentication -> URL Configuration -> Redirect URLs:"
Write-Host "   https://garofalo-barberia.vercel.app/auth/callback"
Write-Host "2. Authentication -> Providers -> Google -> Enable (opzionale)"
Write-Host "3. Authentication -> Providers -> GitHub -> Enable (opzionale)"
Write-Host "4. Crea utente admin e esegui SQL:"
Write-Host "   UPDATE profiles SET role = 'admin' WHERE email = 'luigigarofalo1996@gmail.com';"