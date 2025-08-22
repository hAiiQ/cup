@echo off
echo.
echo ========================================
echo   Render CLI Setup für direkten Zugriff
echo ========================================
echo.

echo 1. Gehe zu https://dashboard.render.com/user/settings
echo 2. Scrolle runter zu "API Keys"
echo 3. Klicke "Create API Key"
echo 4. Gib einen Namen ein (z.B. "Cup Tournament CLI")
echo 5. Kopiere den generierten API Key
echo.

echo 6. Setze den API Key als Environment Variable:
echo    $env:RENDER_API_KEY="dein-api-key-hier"
echo.

echo 7. Teste die Verbindung:
echo    node render-deploy.js
echo.

echo ========================================
echo   Verfügbare Commands nach Setup:
echo ========================================
echo.

echo 🚀 Deployment:
echo    node quick-deploy.js                - Deploy mit Monitoring
echo.

echo 🔍 Environment Check:
echo    node render-env.js env              - Prüfe Environment Variables
echo    node render-env.js db               - Prüfe Datenbank-Verbindung
echo    node render-env.js restart          - Service neustarten
echo    node render-env.js logs             - Logs anzeigen
echo.

echo 🛠️ Debugging:
echo    node render-deploy.js               - Alle Services anzeigen
echo    node fix-user-deletion.js           - Lokale DB-Tests
echo.

pause
