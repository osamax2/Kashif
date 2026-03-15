#!/usr/bin/env python3
"""
GPS-Extraktor für Dashcam .TS-Videodateien (GKU D600Pro u.ä.)

Extrahiert GPS-Koordinaten (Breitengrad, Längengrad, Geschwindigkeit, Zeitstempel)
aus dem OSD-Overlay des Videos alle N Sekunden.

Benötigte Abhängigkeiten:
    pip install Pillow pytesseract
    brew install tesseract ffmpeg     # macOS
    # oder: apt install tesseract-ocr ffmpeg   # Linux

Verwendung:
    python3 extract_gps.py /pfad/zum/video.TS
    python3 extract_gps.py /pfad/zum/video.TS --interval 5
    python3 extract_gps.py /pfad/zum/video.TS --interval 10 --output gps_data.csv
"""

import argparse
import csv
import os
import re
import subprocess
import sys
import tempfile

from PIL import Image, ImageEnhance


def get_video_duration(video_path: str) -> float:
    """Video-Dauer in Sekunden ermitteln."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet",
            "-show_entries", "format=duration",
            "-of", "csv=p=0",
            video_path,
        ],
        capture_output=True, text=True
    )
    return float(result.stdout.strip())


def extract_frame(video_path: str, timestamp: float, output_path: str) -> bool:
    """Einzelnen Frame bei gegebenem Zeitstempel extrahieren."""
    result = subprocess.run(
        [
            "ffmpeg", "-y", "-ss", str(timestamp),
            "-i", video_path,
            "-vframes", "1", "-q:v", "2",
            "-update", "1",
            output_path,
        ],
        capture_output=True, text=True
    )
    return result.returncode == 0 and os.path.exists(output_path)


def _run_tesseract(img_pil, psm=6) -> str:
    """Tesseract OCR auf einem PIL-Image ausfuehren."""
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp_path = tmp.name
        img_pil.save(tmp_path)
    try:
        result = subprocess.run(
            ["tesseract", tmp_path, "stdout", "--psm", str(psm)],
            capture_output=True, text=True
        )
        return result.stdout.strip()
    finally:
        os.unlink(tmp_path)


GPS_PATTERN = re.compile(r'[EW]\s*\d+[.,]\s*\d{3,5}', re.IGNORECASE)


def _preprocess(region, threshold=140):
    """Bild fuer OCR vorverarbeiten: skalieren, Graustufen, Schwellwert."""
    region = region.resize(
        (region.width * 3, region.height * 3), Image.LANCZOS
    )
    region = region.convert("L")
    enhancer = ImageEnhance.Contrast(region)
    region = enhancer.enhance(3.0)
    region = region.point(lambda x: 255 if x > threshold else 0)
    return region


def ocr_gps_region(frame_path: str) -> str:
    """GPS-Textregion aus dem Frame ausschneiden und per OCR lesen."""
    img = Image.open(frame_path)
    w, h = img.size

    # Mehrere Crop-Bereiche und Schwellwerte versuchen
    crop_boxes = [
        (0, int(h * 0.85), int(w * 0.35), h),
        (0, int(h * 0.82), int(w * 0.45), h),
    ]
    thresholds = [140, 120, 100, 160]

    for crop_box in crop_boxes:
        gps_region = img.crop(crop_box)
        for thresh in thresholds:
            processed = _preprocess(gps_region, thresh)
            text = _run_tesseract(processed)
            if GPS_PATTERN.search(text):
                return text

    # Fallback: Ganzes Bild mit Standard-PSM
    text = _run_tesseract(img, psm=3)
    return text


def parse_gps_text(text: str):
    """GPS-Daten aus OCR-Text parsen.

    Erwartet Format wie:
        E10. 52583 N52. 26813 10MPH
        GKU D600Pro
        03-07-2026 11:51:16 AM
    """
    if not text:
        return None

    result = {}

    # OCR-Korrekturen: haeufige Fehllesungen
    corrected = text
    # "No2" -> "N52", "No2." -> "N52."
    corrected = re.sub(r'(?<![A-Za-z])No(\d)', r'N5\1', corrected)
    # "N02" -> "N52" (0 statt 5)
    corrected = re.sub(r'(?<![A-Za-z])N02', 'N52', corrected)
    # "£" -> "E" am Anfang von Koordinaten
    corrected = corrected.replace('£', 'E')
    # "CKU" -> "GKU", "GRU" -> "GKU"
    corrected = re.sub(r'[CG]KU|GRU', 'GKU', corrected)

    # Kombiniertes Muster: E{lon} N{lat} {speed}MPH
    # Suche erst nach dem kombinierten Muster
    combined = re.search(
        r'([EW])\s*(\d+)[.,]\s*(\d{3,5})\D'
        r'.*?'
        r'([NS])\s*(\d+)[.,]\s*(\d{3,5})\s+'
        r'(\d{1,3})\s*(?:MPH|KMH|mph|kmh|[TIONM]MPH|NPH|MPr|MPH|MPE)',
        corrected, re.IGNORECASE
    )
    if combined:
        lon_dir = combined.group(1).upper()
        lon_val = float(f"{combined.group(2)}.{combined.group(3)}")
        if lon_dir == "W":
            lon_val = -lon_val
        result["longitude"] = lon_val

        lat_dir = combined.group(4).upper()
        lat_val = float(f"{combined.group(5)}.{combined.group(6)}")
        if lat_dir == "S":
            lat_val = -lat_val
        result["latitude"] = lat_val
        result["speed"] = int(combined.group(7))
    else:
        # Fallback: Einzelne Muster
        lon_match = re.search(
            r'([EW])\s*(\d+)[.,]\s*(\d{3,5})', corrected, re.IGNORECASE
        )
        if lon_match:
            direction = lon_match.group(1).upper()
            lon_val = float(f"{lon_match.group(2)}.{lon_match.group(3)}")
            if direction == "W":
                lon_val = -lon_val
            result["longitude"] = lon_val

        lat_match = re.search(
            r'([NS])\s*(\d+)[.,]\s*(\d{3,5})', corrected, re.IGNORECASE
        )
        if lat_match:
            direction = lat_match.group(1).upper()
            lat_val = float(f"{lat_match.group(2)}.{lat_match.group(3)}")
            if direction == "S":
                lat_val = -lat_val
            result["latitude"] = lat_val

        # Geschwindigkeit: Zahl (1-3 Stellen) gefolgt von MPH/KMH
        # Nur wenn NACH beiden Koordinaten
        speed_text = corrected
        if lat_match:
            speed_text = corrected[lat_match.end():]
        speed_match = re.search(
            r'(\d{1,3})\s*(?:MPH|KMH|mph|kmh|[TIONM]MPH|NPH|MPr|MPE)',
            speed_text, re.IGNORECASE
        )
        if speed_match:
            result["speed"] = int(speed_match.group(1))

    # Zeitstempel: DD-MM-YYYY HH:MM:SS AM/PM
    time_match = re.search(
        r"(\d{1,2}[-/]\d{1,2}[-/]\d{4})\s+(\d{1,2}:\d{2}:\d{2})\s*(AM|PM)?",
        corrected, re.IGNORECASE
    )
    if time_match:
        date_str = time_match.group(1)
        time_str = time_match.group(2)
        ampm = time_match.group(3) or ""
        result["timestamp"] = f"{date_str} {time_str} {ampm}".strip()

    if "latitude" in result and "longitude" in result:
        return result
    return None


def main():
    parser = argparse.ArgumentParser(
        description="GPS-Koordinaten aus Dashcam-Video extrahieren"
    )
    parser.add_argument("video", help="Pfad zur .TS Videodatei")
    parser.add_argument(
        "--interval", type=int, default=5,
        help="Intervall in Sekunden zwischen GPS-Abfragen (Standard: 5)"
    )
    parser.add_argument(
        "--output", "-o", default=None,
        help="Ausgabedatei (CSV). Wenn nicht angegeben, wird auf stdout ausgegeben."
    )
    args = parser.parse_args()

    if not os.path.exists(args.video):
        print(f"Fehler: Videodatei nicht gefunden: {args.video}", file=sys.stderr)
        sys.exit(1)

    # Video-Dauer ermitteln
    duration = get_video_duration(args.video)
    print(f"Video: {args.video}", file=sys.stderr)
    print(f"Dauer: {duration:.1f} Sekunden", file=sys.stderr)
    print(f"Intervall: alle {args.interval} Sekunden", file=sys.stderr)
    print(f"Erwartete GPS-Punkte: {int(duration // args.interval) + 1}", file=sys.stderr)
    print("-" * 60, file=sys.stderr)

    gps_points = []
    timestamp = 0.0

    with tempfile.TemporaryDirectory() as tmpdir:
        while timestamp <= duration:
            frame_path = os.path.join(tmpdir, f"frame_{int(timestamp):05d}.jpg")

            # Frame extrahieren
            if not extract_frame(args.video, timestamp, frame_path):
                print(
                    f"  [{timestamp:6.1f}s] Frame-Extraktion fehlgeschlagen",
                    file=sys.stderr,
                )
                timestamp += args.interval
                continue

            # OCR ausfuehren
            ocr_text = ocr_gps_region(frame_path)
            gps_data = parse_gps_text(ocr_text)

            if gps_data:
                gps_data["video_second"] = timestamp
                gps_points.append(gps_data)
                lat = gps_data.get("latitude", "?")
                lon = gps_data.get("longitude", "?")
                speed = gps_data.get("speed", "?")
                ts = gps_data.get("timestamp", "")
                print(
                    f"  [{timestamp:6.1f}s] Lat={lat}, Lon={lon}, "
                    f"Speed={speed}, Time={ts}",
                    file=sys.stderr,
                )
            else:
                print(
                    f"  [{timestamp:6.1f}s] GPS nicht erkannt "
                    f"(OCR: {ocr_text[:60]!r})",
                    file=sys.stderr,
                )

            # Temporaere Frame-Datei loeschen
            if os.path.exists(frame_path):
                os.unlink(frame_path)

            timestamp += args.interval

    print("-" * 60, file=sys.stderr)
    print(f"Erfolgreich: {len(gps_points)} GPS-Punkte extrahiert", file=sys.stderr)

    if not gps_points:
        print("Keine GPS-Daten gefunden!", file=sys.stderr)
        sys.exit(1)

    # Ausgabe
    fieldnames = ["video_second", "latitude", "longitude", "speed", "timestamp"]
    output_file = open(args.output, "w", newline="") if args.output else sys.stdout

    try:
        writer = csv.DictWriter(output_file, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for point in gps_points:
            writer.writerow(point)
    finally:
        if args.output:
            output_file.close()
            print(f"CSV gespeichert: {args.output}", file=sys.stderr)


if __name__ == "__main__":
    main()
