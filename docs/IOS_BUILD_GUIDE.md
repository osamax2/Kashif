# iOS App Build Guide - Kashif App

## Voraussetzungen

1. **Apple Developer Account** (kostenpflichtig - $99/Jahr)
   - Registriere dich bei: https://developer.apple.com/programs/

2. **EAS CLI installieren** (falls noch nicht installiert)
   ```bash
   npm install -g eas-cli
   ```

3. **Bei Expo anmelden**
   ```bash
   eas login
   ```

## Build-Prozess

### Option 1: Production Build (für App Store)

```bash
cd /Volumes/WorkSSD/Kashif
eas build --platform ios --profile production
```

**Was passiert:**
- Erstellt einen Production Build
- Generiert eine `.ipa` Datei
- Kann direkt im App Store veröffentlicht werden

### Option 2: Preview Build (zum Testen)

```bash
eas build --platform ios --profile preview
```

**Was passiert:**
- Erstellt einen internen Test-Build
- Du kannst die App über TestFlight an Tester verteilen

### Option 3: Development Build (für Entwicklung)

```bash
eas build --platform ios --profile development
```

**Was passiert:**
- Erstellt einen Development Build für den Simulator
- Für lokale Tests auf deinem Mac

## Nach dem Build

### 1. Build Status überprüfen
Nach dem Start des Builds:
- Du erhältst einen Link zur EAS Build-Seite
- Du kannst den Build-Status dort verfolgen
- Nach Fertigstellung kannst du die `.ipa` Datei herunterladen

### 2. TestFlight (Empfohlen für Tests)

```bash
eas submit --platform ios --profile preview
```

**Vorteile:**
- Teste die App vor der offiziellen Veröffentlichung
- Lade bis zu 10.000 externe Tester ein
- Sammle Feedback

### 3. App Store Veröffentlichung

```bash
eas submit --platform ios --profile production
```

**Nächste Schritte:**
1. Gehe zu [App Store Connect](https://appstoreconnect.apple.com/)
2. Erstelle eine neue App
3. Fülle alle erforderlichen Informationen aus:
   - App Name: "Kashif"
   - Kategorie: Navigation/Utilities
   - Screenshots (verschiedene iPhone-Größen)
   - App-Beschreibung (Arabisch & Englisch)
   - Keywords
   - Support-URL
   - Datenschutzrichtlinien-URL
4. Wähle den hochgeladenen Build aus
5. Sende zur Überprüfung ein

## Wichtige Konfigurationen (bereits erledigt ✓)

- ✓ Bundle Identifier: `com.kashif.app`
- ✓ Version: `1.0.0`
- ✓ Build Number: `1.0.0`
- ✓ Location Permissions (für Straßenüberwachung)
- ✓ Camera/Photo Library Permissions (für Foto-Upload)
- ✓ Background Modes (Location, Notifications)
- ✓ Google Maps API Key konfiguriert

## Benötigte Assets für App Store

### Screenshots erforderlich für:
1. **iPhone 6.7" Display** (iPhone 14 Pro Max, 15 Pro Max)
   - 1290 x 2796 pixels
   
2. **iPhone 6.5" Display** (iPhone 11 Pro Max, XS Max)
   - 1242 x 2688 pixels
   
3. **iPad Pro 12.9" Display**
   - 2048 x 2732 pixels

### App Icon
- Bereits vorhanden in: `./assets/images/icon.png`
- Muss 1024x1024 pixels sein (ohne Transparenz)

### App Preview Video (Optional)
- Bis zu 3 Videos pro Gerätegröße
- Max. 30 Sekunden

## Kosten Übersicht

1. **Apple Developer Program**: $99/Jahr
2. **EAS Build (Expo)**: 
   - Kostenlos: Begrenzte Builds
   - Production Plan: $29/Monat (unbegrenzte Builds)

## Häufige Probleme

### Problem: "Missing Credentials"
**Lösung:**
```bash
eas credentials
```
Folge den Anweisungen zur Erstellung von Certificates & Provisioning Profiles

### Problem: "Bundle Identifier bereits verwendet"
**Lösung:** Ändere in `app.json`:
```json
"bundleIdentifier": "com.kashif.app.unique"
```

### Problem: Build schlägt fehl
**Lösung:**
```bash
# Überprüfe die Logs
eas build:list

# Überprüfe die App-Konfiguration
eas build:configure
```

## Support & Ressourcen

- **Expo Documentation**: https://docs.expo.dev/
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **App Store Connect Guide**: https://developer.apple.com/app-store-connect/
- **TestFlight**: https://developer.apple.com/testflight/

## Nächste Schritte

1. ✅ Konfiguration abgeschlossen
2. ⏳ Apple Developer Account erstellen/anmelden
3. ⏳ EAS CLI installieren und anmelden
4. ⏳ Production Build starten
5. ⏳ TestFlight-Test durchführen
6. ⏳ App Store Listing erstellen
7. ⏳ Zur Überprüfung einreichen

---

**Hinweis:** Der erste Build-Prozess kann 20-30 Minuten dauern. Sei geduldig! 🚀
