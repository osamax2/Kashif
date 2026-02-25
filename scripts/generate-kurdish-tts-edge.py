#!/usr/bin/env python3
"""
Generate Kurdish (Kurmanji) TTS audio files using Microsoft Edge TTS (free).
Uses Turkish voice since Kurmanji Kurdish uses Latin script similar to Turkish.

Usage:
    python3 scripts/generate-kurdish-tts-edge.py

Requirements:
    pip install edge-tts
"""

import asyncio
import os
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("❌ edge-tts not installed. Run: pip3 install edge-tts")
    exit(1)

# Output directory
output_dir = Path(__file__).parent.parent / "assets" / "sounds" / "ku"
output_dir.mkdir(parents=True, exist_ok=True)

# Kurdish (Kurmanji) warning messages
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

# Turkish male voice - closest to Kurdish pronunciation
# AhmetNeural is a clear male voice
VOICE = "tr-TR-AhmetNeural"
RATE = "-5%"  # Slightly slower for clarity

async def generate_audio(name: str, text: str):
    output_path = output_dir / f"{name}.mp3"
    
    try:
        communicate = edge_tts.Communicate(text, VOICE, rate=RATE)
        await communicate.save(str(output_path))
        
        file_size = output_path.stat().st_size
        print(f"  ✅ {name}.mp3 ({file_size:,} bytes) - \"{text}\"")
        return True
    except Exception as e:
        print(f"  ❌ {name}: {e}")
        return False

async def main():
    print(f"📁 Output: {output_dir}")
    print(f"🎙️ Voice: {VOICE}, Rate: {RATE}")
    print(f"📝 Generating {len(MESSAGES)} Kurdish audio files...\n")
    
    success = 0
    for name, text in MESSAGES.items():
        if await generate_audio(name, text):
            success += 1
    
    print(f"\n{'='*50}")
    print(f"✅ Generated {success}/{len(MESSAGES)} audio files")
    print(f"📁 Location: {output_dir}")

if __name__ == "__main__":
    asyncio.run(main())
