#!/bin/bash

# Kashif App - Quick Android APK Build
# Simplified version for faster builds

echo "🤖 Building Kashif APK..."
echo ""

# Check Android SDK
if [ ! -d "$HOME/Library/Android/sdk" ] && [ ! -d "$HOME/Android/Sdk" ]; then
    echo "❌ Android SDK not found. Install Android Studio:"
    echo "https://developer.android.com/studio"
    exit 1
fi

# Set ANDROID_HOME
if [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME=$HOME/Library/Android/sdk
else
    export ANDROID_HOME=$HOME/Android/Sdk
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Generate Android project if needed
if [ ! -d "android" ]; then
    echo "🔧 Generating Android project..."
    npx expo prebuild --platform android
fi

# Build Debug APK
echo "🚀 Building Debug APK..."
cd android
chmod +x gradlew
./gradlew assembleDebug
cd ..

# Copy APK
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    cp "$APK_PATH" "kashif-app-debug.apk"
    APK_SIZE=$(ls -lh "kashif-app-debug.apk" | awk '{print $5}')
    echo ""
    echo "✅ APK ready: kashif-app-debug.apk ($APK_SIZE)"
    echo ""
    echo "Install on phone:"
    echo "  adb install kashif-app-debug.apk"
    echo ""
else
    echo "❌ Build failed!"
    exit 1
fi
