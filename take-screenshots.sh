#!/bin/bash
# Screenshot Script - Macht automatisch Screenshots von der laufenden App

echo "📱 Screenshot Tool für Google Play Store"
echo "========================================="
echo ""

# Prüfe ob adb verfügbar ist
if ! command -v adb &> /dev/null; then
    echo "❌ ADB nicht gefunden!"
    echo "Installiere Android SDK Platform-Tools"
    exit 1
fi

# Prüfe ob Gerät verbunden ist
DEVICE=$(adb devices | grep -w "device" | head -1 | awk '{print $1}')
if [ -z "$DEVICE" ]; then
    echo "❌ Kein Android-Gerät gefunden!"
    echo "Verbinde dein Gerät oder starte den Emulator"
    exit 1
fi

echo "✓ Gerät gefunden: $DEVICE"
echo ""

# Screenshot-Verzeichnis
SCREENSHOT_DIR="./playstore-assets/screenshots"
mkdir -p "$SCREENSHOT_DIR"

# Zähler für Dateinamen
COUNTER=1

echo "ANLEITUNG:"
echo "1. Navigiere in der App zum gewünschten Screen"
echo "2. Drücke ENTER um Screenshot zu machen"
echo "3. Wiederhole für alle gewünschten Screens"
echo "4. Drücke 'q' und ENTER zum Beenden"
echo ""
echo "Empfohlene Screens:"
echo "  - Home/Map Screen"
echo "  - Report erstellen"
echo "  - Alert/Warnung"  
echo "  - Notifications"
echo "  - Coupons"
echo "  - Profil"
echo ""

while true; do
    echo -n "Screenshot #$COUNTER - Drücke ENTER (oder 'q' zum Beenden): "
    read -r input
    
    if [ "$input" = "q" ] || [ "$input" = "Q" ]; then
        echo "✓ Fertig! Screenshots gespeichert in: $SCREENSHOT_DIR"
        echo ""
        echo "Anzahl Screenshots: $((COUNTER - 1))"
        ls -lh "$SCREENSHOT_DIR"
        exit 0
    fi
    
    # Screenshot machen
    FILENAME="screenshot-$COUNTER.png"
    echo "  → Mache Screenshot..."
    adb shell screencap -p /sdcard/temp_screenshot.png
    adb pull /sdcard/temp_screenshot.png "$SCREENSHOT_DIR/$FILENAME" > /dev/null 2>&1
    adb shell rm /sdcard/temp_screenshot.png
    
    # Größe prüfen
    if [ -f "$SCREENSHOT_DIR/$FILENAME" ]; then
        SIZE=$(identify -format "%wx%h" "$SCREENSHOT_DIR/$FILENAME" 2>/dev/null || echo "?")
        FILE_SIZE=$(ls -lh "$SCREENSHOT_DIR/$FILENAME" | awk '{print $5}')
        echo "  ✓ Gespeichert: $FILENAME ($SIZE, $FILE_SIZE)"
        COUNTER=$((COUNTER + 1))
    else
        echo "  ❌ Fehler beim Erstellen"
    fi
    echo ""
done
