# Setup Supabase + Vercel per Garofalo Barberia
# Uso: .\scripts\setup-supabase-vercel.ps1

param(
    [string]$SupabaseUrl,
    [string]$AnonKey,
    [string]$ServiceRoleKey
)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

function Add-VercelEnv($name, $value) {
    if (-not $value) { Write-Warning "Salto $name (vuoto)"; return }
    $existing = npx vercel env ls production 2>$null | Select-String [regex]::Escape($name)
    if ($existing) {
        Write-Host "↻ $name già presente, aggiorno..."
        npx vercel env rm $name production --yes 2>$null | Out-Null
    }
    $value | npx vercel env add $name production --yes
    if ($LASTEXITCODE -eq 0) { Write-Host "✅ $name" } else { Write-Error "❌ $name" }
}

Write-Host "=== Garofalo Barberia — Setup Supabase + Vercel ===" -ForegroundColor Cyan

if (-not $SupabaseUrl) {
    $SupabaseUrl = Read-Host "NEXT_PUBLIC_SUPABASE_URL (es. https://xxx.supabase.co)"
}
if (-not $AnonKey) {
    $AnonKey = Read-Host "NEXT_PUBLIC_SUPABASE_ANON_KEY"
}
if (-not $ServiceRoleKey) {
    $ServiceRoleKey = Read-Host "SUPABASE_SERVICE_ROLE_KEY"
}

# Salva .env.local
@(
    "NEXT_PUBLIC_SUPABASE_URL=$SupabaseUrl",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=$AnonKey",
    "SUPABASE_SERVICE_ROLE_KEY=$ServiceRoleKey",
    "ADMIN_EMAIL=luigigarofalo1996@gmail.com",
    "NEXT_PUBLIC_WHATSAPP_NUMBER=393201886277",
    "NEXT_PUBLIC_SITE_URL=https://garofalo-barberia.vercel.app"
) | Set-Content -Path ".env.local" -Encoding UTF8
Write-Host "✅ .env.local creato"

# Vercel env
Add-VercelEnv "NEXT_PUBLIC_SUPABASE_URL" $SupabaseUrl
Add-VercelEnv "NEXT_PUBLIC_SUPABASE_ANON_KEY" $AnonKey
Add-VercelEnv "SUPABASE_SERVICE_ROLE_KEY" $ServiceRoleKey
Add-VercelEnv "ADMIN_EMAIL" "luigigarofalo1996@gmail.com"
Add-VercelEnv "NEXT_PUBLIC_WHATSAPP_NUMBER" "393201886277"
Add-VercelEnv "NEXT_PUBLIC_SITE_URL" "https://garofalo-barberia.vercel.app"

Write-Host ""
Write-Host "Deploy produzione..." -ForegroundColor Cyan
npx vercel --prod --yes
Write-Host ""
Write-Host "Fatto! Configura OAuth in Supabase:" -ForegroundColor Green
Write-Host "  Authentication → URL Configuration → Redirect URLs:"
Write-Host "  https://garofalo-barberia.vercel.app/auth/callback"