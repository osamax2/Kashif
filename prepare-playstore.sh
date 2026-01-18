#!/bin/bash

# Google Play Store Release Script
# Dieses Script bereitet alle notwendigen Dateien für die Play Store Veröffentlichung vor

set -e

echo "🚀 Google Play Store Release Vorbereitung"
echo "=========================================="

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PLAYSTORE_DIR="./playstore-assets"
SCREENSHOTS_DIR="$PLAYSTORE_DIR/screenshots"
GRAPHICS_DIR="$PLAYSTORE_DIR/graphics"

# 1. Prüfe ob Icon vorhanden ist
echo -e "\n${YELLOW}1. Prüfe App-Icon...${NC}"
if [ -f "./assets/images/icon.png" ]; then
    echo -e "${GREEN}✓ App-Icon gefunden${NC}"
    cp ./assets/images/icon.png "$GRAPHICS_DIR/app-icon.png"
else
    echo -e "${RED}✗ App-Icon nicht gefunden!${NC}"
    exit 1
fi

# 2. Erstelle Feature Graphic Template
echo -e "\n${YELLOW}2. Erstelle Feature Graphic Template...${NC}"
cat > "$GRAPHICS_DIR/feature-graphic-instructions.txt" << EOF
FEATURE GRAPHIC ANFORDERUNGEN:
- Größe: 1024x500px
- Format: PNG oder JPG
- Inhalt: App-Logo + "كاشف" Text + "Road Safety" Untertitel
- Hintergrund: Gradient (Blau #0D2B66 zu Hellblau)
- Design-Tool: Canva, Figma, oder Photoshop

Erstelle die Grafik und speichere sie als: feature-graphic.png
EOF
echo -e "${GREEN}✓ Instructions erstellt${NC}"

# 3. Prüfe ob APK/AAB existiert
echo -e "\n${YELLOW}3. Prüfe Build-Dateien...${NC}"
if [ -f "kashif-app-Release.apk" ]; then
    echo -e "${GREEN}✓ Release APK gefunden${NC}"
    APK_SIZE=$(ls -lh kashif-app-Release.apk | awk '{print $5}')
    echo "  Größe: $APK_SIZE"
else
    echo -e "${YELLOW}⚠ Keine Release APK gefunden${NC}"
    echo "  Erstelle mit: ./build-android-local.sh"
fi

# 4. Erstelle Screenshot Instructions
echo -e "\n${YELLOW}4. Erstelle Screenshot-Anleitung...${NC}"
cat > "$SCREENSHOTS_DIR/screenshot-guide.txt" << EOF
SCREENSHOT ANFORDERUNGEN:
=========================

MINDESTANZAHL: 2 Screenshots
EMPFOHLEN: 4-8 Screenshots

AUFLÖSUNGEN:
- Handy: 1080x1920px (oder höher, 16:9 Format)
- 7" Tablet: 1200x1920px  
- 10" Tablet: 1600x2560px

SCREENSHOTS AUFNEHMEN:
1. Installiere die App auf einem Android-Gerät oder Emulator
2. Navigiere durch folgende Screens:
   - Login/Welcome Screen
   - Hauptansicht (Karte mit Markierungen)
   - Report-Screen (Meldung erstellen)
   - Notifications Screen  
   - Coupons/Rewards Screen
   - Alert/Warning Screen

3. Nutze Android Studio Device Frame Generator für professionelle Frames

TOOLS:
- Android Emulator Screenshot: Cmd+S (Mac) oder Ctrl+S (Windows)
- Device Frame Generator: https://developer.android.com/distribute/marketing-tools/device-art-generator
- adb screenshot: adb shell screencap -p /sdcard/screenshot.png

BENENNUNG:
screenshot-1-home.png
screenshot-2-report.png
screenshot-3-alerts.png
screenshot-4-coupons.png
etc.
EOF
echo -e "${GREEN}✓ Screenshot-Anleitung erstellt${NC}"

# 5. Erstelle Store Listing Checkliste
echo -e "\n${YELLOW}5. Erstelle Checkliste...${NC}"
cat > "$PLAYSTORE_DIR/checklist.md" << EOF
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
\`\`\`bash
# Erstelle mit Design-Tool (Canva/Figma/Photoshop)
# Speichere als: playstore-assets/graphics/feature-graphic.png
\`\`\`

### 2. Screenshots aufnehmen
\`\`\`bash
# Starte App im Emulator und mache Screenshots
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png playstore-assets/screenshots/
\`\`\`

### 3. Signiertes App Bundle erstellen
\`\`\`bash
# Mit EAS Build
npx eas build --platform android --profile production

# Oder lokal mit Gradle
cd android && ./gradlew bundleRelease
\`\`\`

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

EOF
echo -e "${GREEN}✓ Checkliste erstellt${NC}"

# 6. Zusammenfassung
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Vorbereitung abgeschlossen!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📁 Alle Dateien sind in: $PLAYSTORE_DIR"
echo ""
echo "📋 NÄCHSTE SCHRITTE:"
echo "1. Erstelle Feature Graphic (1024x500px)"
echo "   → Speichere in: $GRAPHICS_DIR/feature-graphic.png"
echo ""
echo "2. Mache mindestens 2 Screenshots"
echo "   → Speichere in: $SCREENSHOTS_DIR/"
echo ""
echo "3. Erstelle signiertes App Bundle"
echo "   → npx eas build --platform android --profile production"
echo ""
echo "4. Öffne: $PLAYSTORE_DIR/checklist.md für Details"
echo ""
echo -e "${YELLOW}⚠  Vergiss nicht, Kontakt-E-Mail und Datenschutzrichtlinie URL hinzuzufügen!${NC}"
