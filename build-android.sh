#!/bin/bash

# ===========================================
# Android Release Build Script for Kashif
# ===========================================

set -e

echo "🔧 Setting up build environment..."

# Use Java 17 (required for Android Gradle Plugin)
export JAVA_HOME="/opt/homebrew/Cellar/openjdk@17/17.0.15/libexec/openjdk.jdk/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"

# Use local Gradle
export GRADLE_HOME="/opt/homebrew/opt/gradle/libexec"
export PATH="$GRADLE_HOME/bin:$PATH"

# Set Android SDK
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$PATH"

echo "☕ Java version:"
java -version

echo ""
echo "🏗️ Gradle version:"
gradle --version | head -4

echo ""
echo "📱 Connected devices:"
adb devices

# Navigate to project directory
cd /Volumes/WorkSSD/Kashif

# Check if android folder exists
if [ ! -d "android" ]; then
    echo "❌ Android folder not found. Running prebuild..."
    npx expo prebuild --platform android
fi

cd android

# Clean previous builds
echo ""
echo "🧹 Cleaning previous builds..."
./gradlew clean 2>/dev/null || true

# Build release APK
echo ""
echo "🔨 Building release APK..."
./gradlew assembleRelease --no-daemon --stacktrace

# Find the APK
APK_PATH=$(find . -name "*.apk" -path "*release*" | head -1)

if [ -n "$APK_PATH" ]; then
    echo ""
    echo "✅ APK built successfully: $APK_PATH"
    
    # Check if device is connected
    DEVICE=$(adb devices | grep -v "List" | grep "device" | head -1 | awk '{print $1}')
    
    if [ -n "$DEVICE" ]; then
        echo ""
        echo "📲 Installing APK on device: $DEVICE"
        adb -s "$DEVICE" install -r "$APK_PATH"
        
        echo ""
        echo "🚀 Launching app..."
        adb -s "$DEVICE" shell am start -n com.kashifwarning/.MainActivity
        
        echo ""
        echo "📋 Starting logcat (Press Ctrl+C to stop)..."
        echo "=========================================="
        adb -s "$DEVICE" logcat -s ReactNativeJS:V ReactNative:V
    else
        echo ""
        echo "⚠️ No device connected. APK saved at: $APK_PATH"
    fi
else
    echo ""
    echo "❌ APK not found. Build may have failed."
    exit 1
fi
