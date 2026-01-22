#!/bin/bash
# Process HEIC images locally and create reports
# Usage: ./process_images.sh [directory]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGES_DIR="${1:-$SCRIPT_DIR/../images}"

echo "=============================================="
echo "🔍 Kashif Pothole Detection - Local Processor"
echo "=============================================="
echo ""
echo "Images directory: $IMAGES_DIR"
echo ""

# Check if Python dependencies are installed
if ! python3 -c "import ultralytics" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip3 install -r "$SCRIPT_DIR/requirements.txt"
fi

# Run the processor
echo "🚀 Starting pothole detection..."
python3 "$SCRIPT_DIR/processor.py" "$IMAGES_DIR"

echo ""
echo "✅ Processing complete!"
echo "📁 Check output in: $SCRIPT_DIR/output/"
