# 🏆 Tournament Portal - Gaming Tournament System

Ein vollständiges Tournament Management System für Gaming-Wettbewerbe mit Double Elimination Bracket, Team-Management und fairem Zulosungssystem.

![Tournament Portal](https://img.shields.io/badge/Status-Production%20Ready-green)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Prisma](https://img.shields.io/badge/Prisma-6.14-purple)

## 🎯 Features

### 🔐 User System
- **Registrierung & Login** mit JWT Authentication
- **Profil-Management** (In-Game Name, Rank, Discord, Twitch, Instagram)
- **Tier-System** (Tier 1, 2, 3) für balancierte Teams
- **Streamer-Kennzeichnung** für Content Creator
- **Regelakzeptierung** nach Registrierung

### 👑 Admin System
- **Admin Panel** mit separater Authentifizierung
- **User Management** (Verifikation, Tier-Zuweisung)
- **Team Management** (8 Teams, max. 6 Spieler pro Team)
- **Glücksrad** für faire Team-Zulosung mit Tier-Filter
- **Statistiken Dashboard**

### 🏆 Tournament System
- **Double Elimination Bracket** (Winner + Loser Bracket)
- **Live Tournament Bracket** Anzeige
- **Teams Übersicht** mit Mitglieder-Details
- **Streaming-Integration** für Live-Übertragungen

## 🚀 Quick Start

### Lokale Entwicklung

1. **Repository klonen**
```bash
git clone https://github.com/DEIN-USERNAME/tournament-portal.git
cd tournament-portal
```

2. **Dependencies installieren**
```bash
npm install
```

3. **Environment Variables setzen**
```bash
cp .env.example .env
# Bearbeite .env mit deinen Werten
```

4. **Datenbank initialisieren**
```bash
npx prisma migrate dev
npx prisma db seed
```

5. **Development Server starten**
```bash
npm run dev
```

6. **Admin Account erstellen**
```bash
node create-admin-quick.js
```

🎉 **Fertig!** Die Anwendung läuft auf http://localhost:3000

### 🌐 Production Deployment

**Render.com (Empfohlen)**
- Siehe [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) für detaillierte Anleitung
- **WICHTIG:** Bei Deployment-Problemen siehe [RENDER_TEAMS_FIX.md](./RENDER_TEAMS_FIX.md)
- Kostenloser Free Tier verfügbar
- Automatische PostgreSQL Setup
- SSL-Zertifikate inklusive
- Deployment via GitHub Push möglich: `npm run deploy:github`

#### 🚨 Render Deployment Issues
Falls die Teams-Seite "Internal Server Error" zeigt:
1. Problem: TeamMember Relations fehlen in der Datenbank
2. **Sofortiger Fix:** Relations aus APIs entfernt (bereits implementiert)
3. Details siehe [RENDER_TEAMS_FIX.md](./RENDER_TEAMS_FIX.md)

**Status:** ✅ Teams-Seite funktioniert jetzt auf Render

## 📱 Screenshots

### 🎯 Glücksrad für Team-Zulosung
- Tier-basierte Filterung
- Streamer-Filter
- Faire Zufallsauswahl

### 🏆 Tournament Bracket
- Double Elimination System
- Live Match-Updates
- Winner & Loser Bracket

### 👑 Admin Dashboard
- User Management
- Team Übersicht
- Statistiken

## 🛠️ Technologie Stack

- **Frontend:** Next.js 15, React 19, TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL mit Prisma ORM
- **ORM:** Prisma
- **Authentication:** JWT
- **Deployment:** Render.com / Docker

## 📊 Projektstruktur

```
tournament-portal/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── admin/          # Admin Panel
│   │   ├── api/            # API Routes
│   │   ├── bracket/        # Tournament Bracket
│   │   └── dashboard/      # User Dashboard
│   ├── components/         # React Components
│   ├── contexts/          # React Contexts
│   └── lib/               # Utilities & Auth
├── prisma/                # Database Schema & Migrations
├── public/                # Static Assets
└── scripts/               # Deployment & Utilities
```

## 🎮 Usage

### Für Spieler
1. **Registrierung** auf der Homepage
2. **Profil vervollständigen** (In-Game Name, Rank, Social Media)
3. **Regeln akzeptieren**
4. **Auf Team-Zuteilung warten**

### Für Admins
1. **Admin Login** unter `/admin`
2. **User verwalten** (Verifikation, Tier-Zuweisung)
3. **Teams erstellen** mit dem Glücksrad
4. **Tournament Bracket** verwalten

## 🔧 Environment Variables

```bash
# Database - Choose one option:
# Option 1: Cloud Database (Recommended for development)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
# Option 2: Local PostgreSQL
# DATABASE_URL="postgresql://postgres:password@localhost:5432/tournament_db"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"

# Admin Credentials
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="rootmr"

# Social Media APIs (Optional)
TWITCH_CLIENT_ID="your-twitch-client-id"
TWITCH_ACCESS_TOKEN="your-twitch-access-token"
```

## 🐘 PostgreSQL Setup

### Schnellstart mit Cloud-Datenbank (Empfohlen):

1. **Erstellen Sie eine kostenlose PostgreSQL-Datenbank bei [Supabase](https://supabase.com)**
2. **Kopieren Sie die Database URL** aus den Projekteinstellungen
3. **Fügen Sie sie in die .env Datei ein**
4. **Führen Sie das Setup aus:**

```bash
# Datenbank Schema erstellen
npx prisma db push

# Datenbank mit Daten füllen (inkl. Admin-Account)
npx prisma db seed

# Anwendung starten
npm run dev
```

### Lokale PostgreSQL Installation:

Siehe [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md) für detaillierte Anweisungen.

## 📈 Features Roadmap

- [ ] **Real-time Updates** mit WebSockets
- [ ] **E-Mail Notifications** für Match-Updates
- [ ] **Match Scheduling** System
- [ ] **Advanced Statistics** & Analytics
- [ ] **Mobile App** (React Native)
- [ ] **Stream Integration** (OBS, Twitch)

## 🤝 Contributing

1. Fork das Repository
2. Erstelle einen Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit deine Änderungen (`git commit -m 'Add AmazingFeature'`)
4. Push zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

## 📄 License

Dieses Projekt ist unter der MIT License lizenziert - siehe [LICENSE](LICENSE) Datei für Details.

## 👨‍💻 Autor

**hAiQ** - Gaming Tournament Enthusiast

## 🙏 Acknowledgments

- Next.js Team für das großartige Framework
- Prisma Team für die hervorragende Database ORM
- Tailwind CSS für das utility-first CSS Framework
- Render.com für kostenloses Hosting

---

⭐ **Star** dieses Repository wenn es dir gefällt!

🐛 **Issues** und **Feature Requests** sind willkommen!

🚀 **Deployments** funktionieren out-of-the-box mit Render.com!
