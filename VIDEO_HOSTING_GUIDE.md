# 🎥 Video Hosting Lösungen für OXS Promo Videos

## Problem
Die Video-Dateien sind zu groß für GitHub (GitHub hat ein 100MB Dateilimit).

## 🚀 Lösungsoptionen

### 1. **YouTube (Empfohlen - Kostenlos)**
**Vorteile:**
- ✅ Komplett kostenlos
- ✅ Unbegrenzte Bandbreite
- ✅ Automatische Qualitätsanpassung
- ✅ Videos können "unlisted" sein (nicht öffentlich suchbar)
- ✅ Weltweites CDN

**Setup:**
1. Videos auf YouTube hochladen
2. Video IDs in `PromoAd.tsx` ersetzen:
```tsx
const promoVideos = [
  'dQw4w9WgXcQ', // Deine echte YouTube Video ID
  '9bZkp7q19f0', // Weitere Video IDs...
]
```

### 2. **Cloudinary (Empfohlen - 25GB gratis)**
**Vorteile:**
- ✅ 25GB kostenloses Storage
- ✅ Automatische Videokomprimierung
- ✅ CDN-optimiert
- ✅ Einfache Upload-API

**Setup:**
1. Kostenloses Cloudinary Account erstellen
2. Videos hochladen
3. URLs in `PromoAdCloudinary.tsx` verwenden

### 3. **Vercel Blob Storage**
**Vorteile:**
- ✅ Perfekt für Next.js
- ✅ Einfache Integration
- ✅ 1GB kostenlos

### 4. **Firebase Storage**
**Vorteile:**
- ✅ 5GB kostenlos
- ✅ Google CDN
- ✅ Einfache Integration

## 📝 Empfehlung

**Für dich würde ich YouTube empfehlen:**
1. Schnell und kostenlos
2. Du kannst die Videos als "unlisted" markieren
3. Perfekte Integration bereits implementiert
4. Null Maintenance

## 🔧 Nächste Schritte

1. **Lade deine Videos auf YouTube hoch**
2. **Kopiere die Video IDs** (der Teil nach `watch?v=`)
3. **Ersetze die Beispiel-IDs** in `PromoAd.tsx`
4. **Fertig!** 🎉

Die YouTube-Version ist bereits in deiner `PromoAd.tsx` implementiert - du musst nur die Video IDs ersetzen!
