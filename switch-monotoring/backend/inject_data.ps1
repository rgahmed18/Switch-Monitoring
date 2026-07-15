# ═══════════════════════════════════════════════════════════════════════════════
# Script d'Injection de Données - Switch Monitoring Dashboard
# Windows PowerShell
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [Parameter(Mandatory=$false)]
    [string]$Username = "PFE_SW_MON",
    
    [Parameter(Mandatory=$false)]
    [string]$Password = "PFE_SW_MON_PWD",
    
    [Parameter(Mandatory=$false)]
    [string]$Database = "//localhost:1521/XEPDB1",
    
    [Parameter(Mandatory=$false)]
    [string]$ScriptPath = ".\inject_test_data_production.sql"
)

Clear-Host

Write-Host "╔════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     INJECTION DE DONNÉES - Switch-Monitoring Dashboard                    ║" -ForegroundColor Cyan
Write-Host "║     Data Generator for PowerShell                                         ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host ""
Write-Host "Configuration" -ForegroundColor Yellow
Write-Host "═════════════════════════════════════════════════════════════════════════════"
Write-Host "Username:   $Username"
Write-Host "Password:   $(('*' * $Password.Length))"
Write-Host "Database:   $Database"
Write-Host "Script:     $ScriptPath"
Write-Host ""

# Vérifier que le script existe
if (-not (Test-Path $ScriptPath)) {
    Write-Host "ERREUR: Script SQL non trouvé à: $ScriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "Script SQL trouvé" -ForegroundColor Green

# Vérifier que sqlplus est disponible
if (-not (Get-Command sqlplus -ErrorAction SilentlyContinue)) {
    Write-Host "ERREUR: sqlplus n'est pas disponible dans le PATH" -ForegroundColor Red
    Write-Host "   Installez Oracle Client Tools ou ajoutez le répertoire au PATH"
    exit 1
}

Write-Host "SQL*Plus est disponible" -ForegroundColor Green

Write-Host ""
Write-Host "Démarrage de l'injection..." -ForegroundColor Green
Write-Host "═════════════════════════════════════════════════════════════════════════════"
Write-Host ""

# Préparer la connexion
$ConnectionString = "$Username/$Password@$Database"

# Exécuter le script
$StartTime = Get-Date

try {
    # Exécution via sqlplus directement
    Write-Host "Exécution: sqlplus ... @$ScriptPath" -ForegroundColor Cyan
    Write-Host ""
    
    # Exécuter le script SQL via sqlplus
    sqlplus -S "$ConnectionString" "@$ScriptPath" 2>&1 | ForEach-Object {
        # Afficher la sortie
        if ($_ -match "Inserted|Total|SUCCESS|ERROR|ORA-") {
            if ($_ -match "Inserted|Total|SUCCESS") {
                Write-Host $_ -ForegroundColor Green
            } else {
                Write-Host $_ -ForegroundColor Red
            }
        } else {
            Write-Host $_
        }
    }
    
    $ExitCode = $LASTEXITCODE
    
} catch {
    Write-Host "ERREUR lors de l'exécution: $_" -ForegroundColor Red
    $ExitCode = 1
}

# Temps d'exécution
$EndTime = Get-Date
$Duration = $EndTime - $StartTime

Write-Host ""
Write-Host "═════════════════════════════════════════════════════════════════════════════"

if ($ExitCode -eq 0 -or $ExitCode -eq "") {
    Write-Host "INJECTION COMPLÈTE!" -ForegroundColor Green
    Write-Host "Durée: $($Duration.Minutes)m $($Duration.Seconds)s" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines étapes:" -ForegroundColor Yellow
    Write-Host "  1. Naviguez à: http://localhost:4200" -ForegroundColor Cyan
    Write-Host "  2. Tous les 19 graphes affichent les données!" -ForegroundColor Cyan
    Write-Host "  3. Analysez et éditez selon vos besoins" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host "ERREUR LORS DE L'INJECTION" -ForegroundColor Red
    Write-Host "Code d'erreur: $ExitCode" -ForegroundColor Red
    Write-Host ""
    Write-Host "Dépannage:" -ForegroundColor Yellow
    Write-Host "  • Vérifiez les credentials (username/password)" -ForegroundColor Cyan
    Write-Host "  • Assurez-vous que la base de données est en cours d'exécution" -ForegroundColor Cyan
    Write-Host "  • Vérifiez le fichier SQL pour les erreurs" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "═════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan

exit $ExitCode
