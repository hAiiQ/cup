# Render Deployment Fix Guide

## Problem
Das Tournament Portal wurde auf Render deployed, aber zeigt einen "Internal Server Error" beim Laden der Teams.

## Ursache
Die PostgreSQL-Datenbank ist verbunden, aber die Tabellen wurden nicht korrekt erstellt oder die Initial-Daten wurden nicht geladen.

## Lösung

### Schritt 1: Neues Deployment triggern
1. Gehe zu deinem Render Dashboard
2. Wähle deinen "path-of-loki" Service
3. Klicke auf "Manual Deploy" > "Deploy latest commit"

### Schritt 2: Build-Logs überwachen
Achte auf folgende Ausgaben im Build-Log:
```
🚀 Starting production database setup...
✅ Database connection successful
✅ Admin user created
✅ Default teams created
```

### Schritt 3: Falls der Build fehlschlägt
Überprüfe die Environment Variables:
- `DATABASE_URL` sollte automatisch von der Datenbank gesetzt werden
- `NEXTAUTH_SECRET` sollte automatisch generiert werden
- `JWT_SECRET` sollte automatisch generiert werden
- `NODE_ENV` sollte auf "production" gesetzt sein

### Schritt 4: Database-URL Format
Die URL sollte so aussehen:
```
postgresql://tournament_user:PASSWORD@HOST/tournament_db_SUFFIX
```

## Verbesserte render.yaml
Die neue Konfiguration nutzt:
- `--force-reset` um die Datenbank komplett neu zu erstellen
- Bessere Fehlerbehandlung im Setup-Script
- Erweiterte Logging-Ausgaben

## Troubleshooting

### Error: "Internal Server Error"
- Das bedeutet meist, dass die Datenbank-Tabellen nicht existieren
- Lösung: Neues Manual Deploy starten

### Error: "Database connection failed"
- Überprüfe die DATABASE_URL Environment Variable
- Stelle sicher, dass die PostgreSQL-Datenbank läuft

### Error: "Admin table doesn't exist"
- Die Datenbank-Migration war nicht erfolgreich
- Lösung: Manual Deploy mit force-reset

## Nächste Schritte
1. Committe die Änderungen zu GitHub
2. Triggere ein neues Manual Deploy auf Render
3. Überwache die Build-Logs
4. Teste die Website nach erfolgreichem Deployment

## Login-Daten
- Admin Username: `admin`
- Admin Password: `rootmr`
