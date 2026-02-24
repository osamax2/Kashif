#!/usr/bin/env python3
"""
Generate Kurdish (Kurmanji) TTS audio files using OpenAI's TTS API.
These files are bundled with the app for offline playback.

Usage:
    export OPENAI_API_KEY="sk-..."
    python3 scripts/generate-kurdish-tts.py

Requirements:
    pip install openai
"""

import os
import sys
from pathlib import Path

try:
    from openai import OpenAI
except ImportError:
    print("❌ openai package not installed. Run: pip install openai")
    sys.exit(1)

# Check API key
api_key = os.environ.get("OPENAI_API_KEY")
if not api_key:
    print("❌ Set OPENAI_API_KEY environment variable first:")
    print("   export OPENAI_API_KEY='sk-...'")
    sys.exit(1)

client = OpenAI(api_key=api_key)

# Output directory
output_dir = Path(__file__).parent.parent / "assets" / "sounds" / "ku"
output_dir.mkdir(parents=True, exist_ok=True)

# Kurdish (Kurmanji) warning messages to generate
MESSAGES = {
    # Alert screen & location monitoring - by category
    "warning_pothole": "Hişyarî! Çalêk li pêş te heye. Lezê kêm bike!",
    "warning_environment": "Hişyarî! Metirsiya jîngeyê li pêş te heye. Hay ji xwe hebin!",
    "warning_accident": "Hişyarî! Qezayek li pêş te heye. Hişyar bin!",
    "warning_speed_camera": "Hişyarî! Kameraya lezê li pêş e. Lezê kêm bike!",
    "warning_mines": "Hişyarî! Devera mînan li pêş te heye. Pir hay ji xwe hebin!",
    "warning_generic": "Hişyarî! Metirsî li pêşiya te heye.",
    
    # Route hazards summary
    "warning_route": "Hişyarî! Li ser rêya te metirsî hene. Hay ji xwe hebin!",
    
    # Simple short warnings (for quick alerts)
    "warn_pothole_short": "Hişyarî! Çalêk li pêş te heye!",
    "warn_accident_short": "Hişyarî! Qezayek li ser rê heye!",
    "warn_speed_short": "Hişyarî! Kameraya lezê li pêş e!",
}

# OpenAI TTS settings
VOICE = "nova"       # Female voice, clear and natural
MODEL = "tts-1-hd"   # High quality
SPEED = 0.95         # Slightly slower for clarity

print(f"📁 Output directory: {output_dir}")
print(f"🎙️ Voice: {VOICE}, Model: {MODEL}, Speed: {SPEED}")
print(f"📝 Generating {len(MESSAGES)} audio files...\n")

success_count = 0
for name, text in MESSAGES.items():
    output_path = output_dir / f"{name}.mp3"
    print(f"  🔊 {name}: \"{text}\"")
    
    try:
        response = client.audio.speech.create(
            model=MODEL,
            voice=VOICE,
            input=text,
            speed=SPEED,
            response_format="mp3",
        )
        
        response.stream_to_file(str(output_path))
        file_size = output_path.stat().st_size
        print(f"     ✅ Saved: {output_path.name} ({file_size:,} bytes)")
        success_count += 1
        
    except Exception as e:
        print(f"     ❌ Failed: {e}")

print(f"\n{'='*50}")
print(f"✅ Generated {success_count}/{len(MESSAGES)} audio files")
print(f"📁 Location: {output_dir}")
print(f"\nNext: These files will be played automatically for Kurdish users.")
