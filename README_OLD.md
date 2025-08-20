# Tournament Portal

Ein vollständiges Tournament-Management-System mit Double Elimination Bracket, gebaut mit Next.js, TypeScript und Tailwind CSS.

## 🏁 **PROJEKT STATUS: VOLLSTÄNDIG ABGESCHLOSSEN** ✅

Das Tournament Portal ist **produktionsbereit** und enthält alle gewünschten Features:

### ✅ **Vollständig implementierte Features:**
- 🔐 **User Registration/Login System** mit JWT Authentication
- 👤 **Profil-Management** mit optionalen Gaming-Details
- 📜 **Regelakzeptierung** nach Registrierung
- 🔥 **Automatische Social Media Verifikation** (Twitch, Instagram, Discord)
- 🎯 **Admin Panel** mit separater Authentifizierung
- ✅ **User Verifikation** mit Tier 1/2/3 System
- 🎲 **Glücksrad Team-Zulosung** mit Tier-Balance
- 👥 **Team Management** (8 Teams, max. 6 Spieler)
- 🏆 **Double Elimination Tournament Bracket**
- ⚡ **Live Match System** mit START/STOP Controls
- 📊 **Admin Statistiken Dashboard**
- 📱 **Responsive Design** für alle Geräte

### �🚀 **Sofort einsatzbereit für:**
- Gaming Tournaments
- E-Sports Events  
- Community Competitions
- Clan Wars

---

### Benutzer-Features
- **Registrierung & Anmeldung** - Sichere Authentifizierung mit JWT
- **Profil-Management** - In-Game Name, Rank, Discord, Twitch
- **Regelakzeptierung** - Pflichtfeld nach Registrierung
- **🔥 Social Media Verifikation** - Automatische Prüfung von Twitch/Instagram/Discord
- **Dashboard** - Übersicht über Profil und Tournament-Status
- **Team-Übersicht** - Alle Teams und Mitglieder einsehen
- **Live Tournament Bracket** - Double Elimination System verfolgen

### Admin-Features
- **Admin Panel** - Vollständige Tournament-Verwaltung
- **User Management** - Verifikation und Tier-Zuweisung (Tier 1, 2, 3)
- **Glücksrad** - Faire Team-Zulosung mit Tier-Filter
- **Team Management** - Teams bearbeiten, Spieler hinzufügen/entfernen
- **Tournament Bracket** - Match-Ergebnisse eingeben und verwalten
- **Statistiken** - Übersicht über Registrierungen und Verifikationen

## 🏗️ Technologie-Stack

- **Frontend:** Next.js 15, React, TypeScript
- **Styling:** Tailwind CSS 3
- **Backend:** Next.js API Routes
- **Datenbank:** SQLite mit Prisma ORM
- **Authentifizierung:** JWT + HTTP-Only Cookies
- **Passwort-Hashing:** bcryptjs

## 📦 Installation

1. **Projekt klonen**
   ```bash
   git clone <repository-url>
   cd cup
   ```

2. **Dependencies installieren**
   ```bash
   npm install
   ```

3. **Datenbank setup**
   ```bash
   npx prisma generate
   npx prisma db push
   npx tsx prisma/seed.ts
   ```

4. **Development Server starten**
   ```bash
   npm run dev
   ```

5. **App öffnen**
   - Hauptseite: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

## 🔑 Standard Admin-Zugangsdaten

- **Username:** admin
- **Passwort:** admin123

## 📊 Tournament System

### Double Elimination Format
- **8 Teams** mit je bis zu 6 Spielern
- **Winner Bracket** - alle starten hier
- **Loser Bracket** - zweite Chance für verlorene Teams
- **Finale** - Winner vs. Loser Bracket Gewinner

### Tier System
- **Tier 1** - Höchste Skill-Kategorie (Blau)
- **Tier 2** - Mittlere Skill-Kategorie (Grün)  
- **Tier 3** - Niedrigste Skill-Kategorie (Gelb)

### Team-Zulosung
- Nur verifizierte User können gelost werden
- Glücksrad mit Tier-Filter für faire Verteilung
- Automatische Team-Balance

## 🛠️ API Endpoints

### User APIs
- `POST /api/auth/register` - User registrieren
- `POST /api/auth/login` - User anmelden
- `POST /api/auth/logout` - User abmelden
- `POST /api/auth/accept-rules` - Regeln akzeptieren
- `GET /api/user/profile` - Profil abrufen
- `PUT /api/user/profile` - Profil aktualisieren

### Admin APIs
- `POST /api/admin/login` - Admin anmelden
- `GET /api/admin/users` - Alle User auflisten
- `POST /api/admin/users/[id]/verify` - User verifizieren
- `GET /api/admin/teams` - Alle Teams auflisten
- `GET /api/admin/wheel/users` - Verfügbare User für Glücksrad
- `POST /api/admin/wheel/assign` - User zu Team zuweisen

### Public APIs
- `GET /api/teams` - Teams öffentlich anzeigen
- `GET /api/bracket/matches` - Tournament Matches
- `GET /api/bracket/teams` - Teams für Bracket

## 📁 Projektstruktur

```
src/
├── app/
│   ├── admin/          # Admin Panel
│   │   ├── dashboard/  # Admin Dashboard
│   │   └── wheel/      # Glücksrad
│   ├── api/            # API Routes
│   │   ├── admin/      # Admin APIs
│   │   ├── auth/       # Authentifizierung
│   │   ├── user/       # User APIs
│   │   ├── teams/      # Team APIs
│   │   └── bracket/    # Tournament APIs
│   ├── bracket/        # Tournament Bracket
│   ├── dashboard/      # User Dashboard
│   ├── login/          # Anmeldung
│   ├── register/       # Registrierung
│   ├── rules/          # Regelakzeptierung
│   └── teams/          # Team Übersicht
├── lib/
│   ├── auth.ts         # Auth Utilities
│   └── prisma.ts       # DB Connection
└── prisma/
    ├── schema.prisma   # DB Schema
    └── seed.ts         # Initial Data
```

## 🎯 User Journey

1. **Registrierung** → Benutzername + Passwort
2. **Regelakzeptierung** → Tournament-Regeln akzeptieren
3. **Profil vervollständigen** → In-Game Daten eingeben
4. **🔥 Social Media Verifikation** → Automatische Prüfung der Follows
5. **Warten auf Admin-Freigabe** → Admin prüft und weist Tier zu
6. **Team-Zulosung** → Admin lost User zu Teams
7. **Tournament** → Bracket verfolgen und Live Matches anschauen

## 🔐 Social Media Verification

Das System prüft automatisch:
- ✅ **Twitch Follow** von JoeDom_
- ✅ **Instagram Follow** von oxsaudio  
- ✅ **Discord Membership** im Server

**Setup:** Siehe [SOCIAL_VERIFICATION.md](SOCIAL_VERIFICATION.md) für Details

## 🔧 Entwicklung

### Scripts
- `npm run dev` - Development Server
- `npm run build` - Production Build
- `npm run start` - Production Server
- `npm run lint` - ESLint

### Datenbank
- `npx prisma studio` - Datenbank GUI
- `npx prisma db push` - Schema änderungen anwenden
- `npx tsx prisma/seed.ts` - Test-Daten erstellen

## 🎨 Design System

### Farben
- **Primary:** Purple/Pink Gradient
- **Secondary:** Gray-800 Backgrounds
- **Success:** Green-600
- **Warning:** Yellow-600
- **Error:** Red-600
- **Info:** Blue-600

### Tiers
- **Tier 1:** Blau (bg-blue-600)
- **Tier 2:** Grün (bg-green-600)
- **Tier 3:** Gelb (bg-yellow-600)

## 📱 Responsive Design

- **Mobile First** - Optimiert für alle Bildschirmgrößen
- **Tailwind Breakpoints** - sm, md, lg, xl
- **Touch-Friendly** - Große Buttons und Tap-Targets

## 🔒 Sicherheit

- **JWT Tokens** in HTTP-Only Cookies
- **Passwort Hashing** mit bcryptjs (12 Rounds)
- **Input Validation** auf Frontend und Backend
- **Admin-only Routes** mit Token-Verifikation

## 🚧 Zukünftige Features

- [ ] Real-time Updates mit WebSockets
- [ ] E-Mail Benachrichtigungen
- [ ] Match-Streaming Integration
- [ ] Erweiterte Statistiken
- [ ] Chat-System
- [ ] Mobile App

---

**Entwickelt für Gaming Tournaments mit ❤️**
