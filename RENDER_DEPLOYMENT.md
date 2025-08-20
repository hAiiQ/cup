# 🚀 Render Deployment Guide

## Schritt-für-Schritt Anleitung

### 1. GitHub Repository erstellen
```bash
git init
git add .
git commit -m "Initial commit - Tournament Portal"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/DEIN-REPO-NAME.git
git push -u origin main
```

### 2. Render Account & Services erstellen

#### A) PostgreSQL Datenbank
1. Gehe zu [render.com](https://render.com)
2. Erstelle Account / Login
3. **New > PostgreSQL**
4. Name: `tournament-db`
5. Database Name: `tournament`
6. User: `tournament_user`
7. Region: Frankfurt (Europe West)
8. **Create Database**

#### B) Web Service
1. **New > Web Service**
2. Connect GitHub Repository
3. Name: `tournament-portal`
4. Environment: `Node`
5. Build Command: `npm install && npm run build:production`
6. Start Command: `npm start`
7. **Auto-Deploy: Yes**

### 3. Environment Variables in Render setzen

In der Web Service Konfiguration unter "Environment":

```
NODE_ENV=production
DATABASE_URL=[Automatisch von PostgreSQL Service]
JWT_SECRET=dein-super-sicherer-jwt-secret-key-mindestens-32-zeichen
NEXTAUTH_URL=https://tournament-portal-XXXXX.onrender.com
NEXTAUTH_SECRET=dein-nextauth-secret-key
```

### 4. Datenbank Migration
Nach dem ersten erfolgreichen Build:
1. Öffne **Shell** in deinem Web Service
2. Führe aus:
```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Admin Account erstellen
```bash
node create-admin-quick.js
```

## 🎯 Wichtige Hinweise

### Performance
- Render Free Tier "schläft" nach 15 min Inaktivität
- Erste Anfrage nach dem "Aufwachen" kann 30+ Sekunden dauern
- Für Production: Upgrade auf bezahlten Plan empfohlen

### Datenbank
- PostgreSQL ersetzt SQLite
- Alle bisherigen Features funktionieren weiterhin
- Bessere Performance und Skalierung

### URLs
- Web Service: `https://tournament-portal-XXXXX.onrender.com`
- Admin Panel: `https://tournament-portal-XXXXX.onrender.com/admin`

### Monitoring
- Logs verfügbar im Render Dashboard
- Automatische SSL-Zertifikate
- Custom Domain möglich

## 🔧 Nach dem Deployment

1. **Test alle Features:**
   - User Registration
   - Admin Login
   - Glücksrad
   - Team Management
   - Tournament Bracket

2. **Performance optimieren:**
   - Database Indexing überprüfen
   - Image optimization
   - Caching implementieren

3. **Backup Strategy:**
   - Regelmäßige Database Backups
   - Environment Variables dokumentieren

## 🚨 Troubleshooting

### Build Fehler
```bash
# Lokal testen
npm run build
```

### Database Connection Issues
- DATABASE_URL korrekt gesetzt?
- Prisma migration erfolgt?

### Umgebung zurücksetzen
```bash
# In Render Shell
npx prisma migrate reset
npx prisma db seed
```

## ✅ Checklist vor Go-Live

- [ ] Alle Environment Variables gesetzt
- [ ] Database Migration erfolgreich
- [ ] Admin Account erstellt
- [ ] Test User Registration
- [ ] Test Team Assignment
- [ ] Test Tournament Bracket
- [ ] SSL Zertifikat aktiv
- [ ] Custom Domain konfiguriert (optional)
- [ ] Backup Strategy implementiert
- [ ] Monitoring eingerichtet
