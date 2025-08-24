# Tournament Portal - PostgreSQL Setup Guide

## Option 1: Cloud Database (Empfohlen für Entwicklung)

### Verwenden Sie eine kostenlose PostgreSQL-Cloud-Datenbank:

1. **Railway** (kostenlos): https://railway.app
2. **Supabase** (kostenlos): https://supabase.com
3. **Neon** (kostenlos): https://neon.tech

### Setup für Supabase (Empfehlung):

1. Registrieren Sie sich bei https://supabase.com
2. Erstellen Sie ein neues Projekt
3. Gehen Sie zu Settings > Database
4. Kopieren Sie die Connection String
5. Fügen Sie sie in die .env Datei ein:

```bash
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

## Option 2: Lokales PostgreSQL

### Windows Installation:

1. Download PostgreSQL: https://www.postgresql.org/download/windows/
2. Installieren Sie PostgreSQL
3. Erstellen Sie eine Datenbank namens "tournament_db"
4. Aktualisieren Sie die .env Datei:

```bash
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/tournament_db"
```

## Nach der Einrichtung:

```bash
# Datenbank Schema erstellen
npx prisma db push

# Datenbank mit Beispieldaten füllen
npx prisma db seed

# Anwendung starten
npm run dev
```

## Admin Login:
- Username: admin
- Password: rootmr
