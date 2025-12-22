#!/bin/bash

# Kashif App - Quick Local iOS Build
# Simplified version for faster builds

echo "🍎 Building Kashif for iOS Simulator..."
echo ""

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode not installed. Install from App Store:"
    echo "https://apps.apple.com/app/xcode/id497799835"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build and run
echo "🚀 Building and launching..."
npx expo run:ios

echo ""
echo "✅ Done! The app should open in the iOS Simulator."
echo ""
