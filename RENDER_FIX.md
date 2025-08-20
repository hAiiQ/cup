# 🚀 Render Deployment - Einfache Anleitung

## Problem: Seite startet nicht auf Render

### ✅ Lösung - Schritt für Schritt:

## 1. PostgreSQL Database erstellen

1. Gehe zu [render.com](https://render.com)
2. **New** → **PostgreSQL**
3. **Name:** `tournament-db`
4. **Database Name:** `tournament`
5. **User:** `tournament_user`
6. **Region:** Frankfurt (Europe West)
7. **Plan:** Free
8. **Create Database**

⏳ **Warte bis Database "Available" ist (2-3 Minuten)**

## 2. Web Service erstellen

1. **New** → **Web Service**
2. **Connect Repository:** `https://github.com/hAiiQ/cup`
3. **Settings:**
   - **Name:** `tournament-portal`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free

## 3. Environment Variables setzen

Im Web Service unter **Environment**:

```
NODE_ENV=production
DATABASE_URL=[Automatisch verlinkt zur PostgreSQL Database]
JWT_SECRET=dein-super-sicherer-jwt-secret-mindestens-32-zeichen-lang
```

**WICHTIG:** Bei DATABASE_URL wähle: **From Database** → `tournament-db`

## 4. Erste Deployment starten

1. **Create Web Service**
2. ⏳ **Warte auf ersten Build (5-10 Minuten)**

## 5. Database Migration (NACH erfolgreichem Build)

1. Öffne **Shell** in deinem Web Service
2. Führe aus:
```bash
npx prisma migrate deploy
npx prisma db seed
```

## 6. Admin Account erstellen

```bash
node create-admin-quick.js
```

## 🎯 Häufige Probleme & Lösungen

### Problem: Build Error "Prisma generate failed"
**Lösung:** Environment Variables korrekt gesetzt?

### Problem: "Cannot connect to database" 
**Lösung:** DATABASE_URL korrekt verlinkt zur PostgreSQL Database?

### Problem: "No tables found"
**Lösung:** Migration ausgeführt? `npx prisma migrate deploy`

### Problem: "Admin login not working"
**Lösung:** Admin Account erstellt? `node create-admin-quick.js`

## ✅ Erfolg Checklist

- [ ] PostgreSQL Database "Available"
- [ ] Web Service erfolgreich gebaut
- [ ] DATABASE_URL verlinkt
- [ ] JWT_SECRET gesetzt
- [ ] Migration ausgeführt
- [ ] Admin Account erstellt
- [ ] Website erreichbar

## 🌐 Nach erfolgreichem Deployment

**Deine URLs:**
- Website: `https://tournament-portal-XXXXX.onrender.com`
- Admin: `https://tournament-portal-XXXXX.onrender.com/admin`

**Login:**
- Username: `admin`
- Password: `admin123`

## 🔧 Debug Commands

Falls Probleme auftreten, führe in der Render Shell aus:

```bash
# Database Status prüfen
npx prisma db push

# Tables anzeigen
npx prisma studio

# Logs anzeigen
tail -f /opt/render/project/src/.next/server.log
```
