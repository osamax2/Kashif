#!/usr/bin/env python3
"""
Generate Kurdish (Kurmanji) TTS audio files using KurdishTTS.com API.
Uses real Kurmanji Kurdish voice (not Turkish approximation).

API: https://www.kurdishtts.com/settings/api
Speaker: kurmanji_6 (male, free plan)

Usage:
    python3 scripts/generate-kurdish-tts.py

Requirements:
    pip3 install requests
    ffmpeg (optional, for WAV→MP3 conversion)
"""

import json
import os
import subprocess
import sys
from pathlib import Path

try:
    import requests
except ImportError:
    print("❌ requests not installed. Run: pip3 install requests")
    sys.exit(1)

# ─── Configuration ───────────────────────────────────────────────
API_URL = "https://www.kurdishtts.com/api/tts-proxy"
API_KEY = "07ab8aa64ad83280246c2ce0d2d761f7f32aa734"
SPEAKER_ID = "kurmanji_6"  # Kurmanji male voice (free plan)

# Output directory
OUTPUT_DIR = Path(__file__).parent.parent / "assets" / "sounds" / "ku"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ─── Kurdish (Kurmanji) warning messages ─────────────────────────
MESSAGES = {
    # Alert screen & location monitoring - by category
    "warning_pothole": "Hişyarî! Çalêk li pêşiya te heye. Lezê kêm bike!",
    "warning_environment": "Hişyarî! Metirsiya çevreyî li pêşiya te heye.",
    "warning_accident": "Hişyarî! Qezayek li pêşiya te heye. Hişyar bê!",
    "warning_speed_camera": "Hişyarî! Kameraya lezê li pêşiya te heye.",
    "warning_mines": "Hişyarî! Devera mînan li pêşiya te heye.",
    "warning_generic": "Hişyarî! Metirsî li pêşiya te heye.",

    # Route hazards summary
    "warning_route": "Hişyarî! Li ser rêya te metirsî heye.",

    # Simple short warnings
    "warn_pothole_short": "Hişyarî! Çalêk li pêşiya te heye!",
    "warn_accident_short": "Hişyarî! Qezayek li ser rê heye!",
    "warn_speed_short": "Hişyarî! Kameraya lezê li pêşiya te heye!",
}


def has_ffmpeg() -> bool:
    """Check if ffmpeg is available."""
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def convert_wav_to_mp3(wav_path: Path, mp3_path: Path) -> bool:
    """Convert WAV to MP3 using ffmpeg."""
    try:
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", str(wav_path),
                "-codec:a", "libmp3lame",
                "-b:a", "128k",
                "-ar", "22050",
                "-ac", "1",
                str(mp3_path),
            ],
            capture_output=True,
            check=True,
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"    ⚠️ ffmpeg error: {e.stderr.decode()[:200]}")
        return False


def generate_audio(name: str, text: str, use_mp3: bool) -> bool:
    """Generate audio for a single Kurdish text via KurdishTTS API."""
    wav_path = OUTPUT_DIR / f"{name}.wav"
    mp3_path = OUTPUT_DIR / f"{name}.mp3"

    try:
        response = requests.post(
            API_URL,
            headers={
                "x-api-key": API_KEY,
                "Content-Type": "application/json",
            },
            json={
                "text": text,
                "speaker_id": SPEAKER_ID,
            },
            timeout=30,
        )

        if response.status_code != 200:
            print(f"  ❌ {name}: HTTP {response.status_code} - {response.text[:200]}")
            return False

        content_type = response.headers.get("content-type", "")
        if "audio" not in content_type:
            print(f"  ❌ {name}: Unexpected content-type: {content_type}")
            return False

        # Save WAV
        wav_path.write_bytes(response.content)

        if use_mp3:
            # Convert to MP3
            if convert_wav_to_mp3(wav_path, mp3_path):
                wav_path.unlink()  # Remove WAV after successful conversion
                file_size = mp3_path.stat().st_size
                print(f"  ✅ {name}.mp3 ({file_size:,} bytes) - \"{text}\"")
            else:
                # Keep WAV as fallback
                file_size = wav_path.stat().st_size
                print(f"  ⚠️ {name}.wav ({file_size:,} bytes) [ffmpeg failed, kept WAV] - \"{text}\"")
        else:
            file_size = wav_path.stat().st_size
            print(f"  ✅ {name}.wav ({file_size:,} bytes) - \"{text}\"")

        return True

    except requests.exceptions.Timeout:
        print(f"  ❌ {name}: Request timeout (30s)")
        return False
    except requests.exceptions.RequestException as e:
        print(f"  ❌ {name}: {e}")
        return False


def main():
    print("=" * 60)
    print("  Kurdish TTS Generator - kurdishtts.com")
    print("=" * 60)
    print(f"📁 Output:     {OUTPUT_DIR}")
    print(f"🎙️  Speaker:    {SPEAKER_ID} (Kurmanji male)")
    print(f"🌐 API:        {API_URL}")

    ffmpeg_available = has_ffmpeg()
    output_format = "mp3" if ffmpeg_available else "wav"
    print(f"🔧 ffmpeg:     {'✅ available' if ffmpeg_available else '❌ not found'}")
    print(f"📦 Format:     {output_format}")
    print(f"📝 Files:      {len(MESSAGES)}")
    print()

    success = 0
    for name, text in MESSAGES.items():
        if generate_audio(name, text, use_mp3=ffmpeg_available):
            success += 1

    print(f"\n{'=' * 60}")
    print(f"✅ Generated {success}/{len(MESSAGES)} audio files")
    print(f"📁 Location: {OUTPUT_DIR}")

    if success < len(MESSAGES):
        print(f"⚠️ {len(MESSAGES) - success} files failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
