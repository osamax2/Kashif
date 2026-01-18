# Google Play Store Veröffentlichungs-Checkliste

## Erforderliche Assets

### ✓ Bereits vorhanden:
- [x] App-Icon (512x512 oder 1024x1024)
- [x] Store-Listing Text (Arabisch)
- [x] Kurzbeschreibung
- [x] Vollständige Beschreibung
- [x] Keywords

### ⚠ Noch zu erstellen:
- [ ] Feature Graphic (1024x500px) - ERFORDERLICH
- [ ] Mindestens 2 Screenshots - ERFORDERLICH
- [ ] App Bundle (.aab) signiert - ERFORDERLICH
- [ ] Datenschutzrichtlinie URL
- [ ] Kontakt E-Mail

### 📱 Optional (empfohlen):
- [ ] Promo-Grafik (180x120px)
- [ ] TV-Banner (1280x720px)
- [ ] 360° Icon (512x512px)
- [ ] YouTube Promo-Video

## Nächste Schritte:

### 1. Feature Graphic erstellen
```bash
# Erstelle mit Design-Tool (Canva/Figma/Photoshop)
# Speichere als: playstore-assets/graphics/feature-graphic.png
```

### 2. Screenshots aufnehmen
```bash
# Starte App im Emulator und mache Screenshots
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png playstore-assets/screenshots/
```

### 3. Signiertes App Bundle erstellen
```bash
# Mit EAS Build
npx eas build --platform android --profile production

# Oder lokal mit Gradle
cd android && ./gradlew bundleRelease
```

### 4. Play Console Upload
1. Gehe zu: https://play.google.com/console
2. Erstelle neue App
3. Lade App Bundle hoch
4. Füge Store Listing hinzu
5. Lade Screenshots und Graphics hoch
6. Fülle Content Rating aus
7. Submit für Review

## Kontaktdaten benötigt:
- [ ] Entwickler E-Mail
- [ ] Support E-Mail
- [ ] Datenschutzrichtlinie URL
- [ ] App-Website URL (optional)

