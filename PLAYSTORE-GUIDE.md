# 🚀 Google Play Store Veröffentlichungs-Guide

## ✅ Fertig / Bereits erstellt:

### 1. **Store-Listing Texte**
- ✓ App-Name: كاشف (Kashif)
- ✓ Kurzbeschreibung (80 Zeichen)
- ✓ Vollständige Beschreibung (Arabisch)
- ✓ Keywords
- 📄 Datei: `playstore-assets/store-listing-arabic.txt`

### 2. **App-Icon**
- ✓ Icon vorhanden: `assets/images/icon.png`
- ✓ Kopiert nach: `playstore-assets/graphics/app-icon.png`

### 3. **Build-Datei**
- ✓ APK: `kashif-app-Release.apk` (95MB)
- ✓ EAS Konfiguration für AAB aktualisiert

### 4. **Tools & Scripts**
- ✓ `prepare-playstore.sh` - Vorbereitung
- ✓ `take-screenshots.sh` - Screenshot-Tool
- ✓ `feature-graphic-generator.html` - Graphic Generator (IM BROWSER GEÖFFNET!)

---

## 📋 TODO - Diese Schritte musst DU durchführen:

### Schritt 1: Feature Graphic erstellen (5 Min) ⚠️ ERFORDERLICH
Der Feature Graphic Generator wurde im Browser geöffnet:
1. ✏️ Passe Text und Farben an
2. 💾 Klicke auf "تنزيل Feature Graphic"
3. 📁 Speichere als: `playstore-assets/graphics/feature-graphic.png`

**Alternative**: Erstelle in Canva/Figma (1024x500px)

---

### Schritt 2: Screenshots machen (10 Min) ⚠️ ERFORDERLICH

**Option A - Automatisch mit Script:**
```bash
./take-screenshots.sh
```

**Option B - Manuell:**
1. Öffne die App auf deinem Handy/Emulator
2. Navigiere zu wichtigen Screens:
   - 🏠 Home/Map Screen
   - 📝 Report erstellen
   - 🔔 Notifications
   - 🎁 Coupons
   - ⚠️ Alert Screen
3. Mache Screenshots (Power + Volume Down)
4. Übertrage auf PC: `adb pull /sdcard/screenshot.png playstore-assets/screenshots/`

**Mindestanzahl**: 2 Screenshots (besser: 4-8)

---

### Schritt 3: Signiertes App Bundle erstellen (15 Min) ⚠️ ERFORDERLICH

```bash
# Mit EAS Build (empfohlen für Play Store)
npx eas build --platform android --profile production

# Oder lokal
cd android && ./gradlew bundleRelease
```

Die `.aab` Datei wird für Play Store benötigt!

---

### Schritt 4: Zusätzliche Informationen vorbereiten

Du benötigst noch:
- [ ] **Kontakt E-Mail** (für Play Console)
- [ ] **Datenschutzrichtlinie URL** (erforderlich!)
- [ ] **App-Website URL** (optional)
- [ ] **Support E-Mail** (für Benutzer)

**Tipp**: Erstelle eine einfache Privacy Policy Seite auf GitHub Pages oder deiner Website.

---

### Schritt 5: Upload zum Play Store

1. **Gehe zu Play Console**: https://play.google.com/console
2. **Erstelle neue App**:
   - Name: كاشف  
   - Standard-Sprache: Arabisch
   - App/Spiel: App
   - Kostenlos/Kostenpflichtig: Kostenlos

3. **Store-Listing ausfüllen**:
   - Kopiere Text aus: `store-listing-arabic.txt`
   - Lade Feature Graphic hoch
   - Lade Screenshots hoch
   - Lade App-Icon hoch

4. **App-Inhalte konfigurieren**:
   - Datenschutzrichtlinie URL eingeben
   - Werbung: Ja/Nein (je nach App)
   - Zielgruppe: Alle Altersgruppen
   - App-Kategorie: Karten & Navigation

5. **Release erstellen**:
   - Production Track
   - Lade `.aab` Datei hoch
   - Release-Name: "v1.0.0"
   - Release-Notizen schreiben

6. **Review einreichen** 🎉

---

## 🎯 Quick Start - In 3 Schritten zum Upload:

```bash
# 1. Feature Graphic erstellen
open playstore-assets/feature-graphic-generator.html
# → Download und speichere als: playstore-assets/graphics/feature-graphic.png

# 2. Screenshots machen
./take-screenshots.sh

# 3. AAB erstellen
npx eas build --platform android --profile production
```

---

## 📞 Support

Bei Fragen oder Problemen:
- 📖 Dokumentation: `playstore-assets/checklist.md`
- 🛠️ Tools: Alle Scripts im Root-Verzeichnis
- 📧 Google Play Support: https://support.google.com/googleplay/android-developer/

---

## ⚡ Wichtige Links:

- **Play Console**: https://play.google.com/console
- **App Content Policies**: https://support.google.com/googleplay/android-developer/answer/9858738
- **Launch Checklist**: https://developer.android.com/distribute/best-practices/launch/launch-checklist
- **Store Listing Assets**: https://developer.android.com/distribute/marketing-tools/device-art-generator

---

**Geschätzte Zeit bis zur Veröffentlichung**: 30-60 Minuten  
**Review-Zeit von Google**: 1-7 Tage

Viel Erfolg! 🚀
