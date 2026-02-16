#!/bin/bash

# Kashif App - Local Android APK Build
# No Google Play Developer Account needed!
# All caches and temp files are stored on /Volumes/WorkSSD

set -e  # Exit on error

echo "=========================================="
echo "🤖 Kashif App - Local Android APK Build"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========================================
# Configure ALL paths to use WorkSSD
# ========================================
WORK_DIR="/Volumes/WorkSSD/Kashif"
CACHE_DIR="/Volumes/WorkSSD/.build-cache"

# Create all cache directories on WorkSSD
mkdir -p "$CACHE_DIR/gradle"
mkdir -p "$CACHE_DIR/gradle-home"
mkdir -p "$CACHE_DIR/npm"
mkdir -p "$CACHE_DIR/tmp"
mkdir -p "$CACHE_DIR/metro"
mkdir -p "$CACHE_DIR/expo"
mkdir -p "$CACHE_DIR/yarn"
mkdir -p "$CACHE_DIR/kotlin"

# Set ALL environment variables to use WorkSSD
export GRADLE_USER_HOME="$CACHE_DIR/gradle-home"
export GRADLE_OPTS="-Dorg.gradle.daemon=false -Dorg.gradle.jvmargs=-Xmx4096m -Djava.io.tmpdir=$CACHE_DIR/tmp"
export npm_config_cache="$CACHE_DIR/npm"
export YARN_CACHE_FOLDER="$CACHE_DIR/yarn"
export TMPDIR="$CACHE_DIR/tmp"
export TEMP="$CACHE_DIR/tmp"
export TMP="$CACHE_DIR/tmp"
export EXPO_CACHE_DIR="$CACHE_DIR/expo"
export REACT_NATIVE_PACKAGER_HOSTNAME="localhost"
export KOTLIN_DAEMON_HOME="$CACHE_DIR/kotlin"

# Also set Java temp directory
export _JAVA_OPTIONS="-Djava.io.tmpdir=$CACHE_DIR/tmp"

echo -e "${GREEN}✓ All caches configured on /Volumes/WorkSSD${NC}"
echo "  GRADLE_USER_HOME: $GRADLE_USER_HOME"
echo "  npm_config_cache: $npm_config_cache"
echo "  TMPDIR: $TMPDIR"
echo "  EXPO_CACHE_DIR: $EXPO_CACHE_DIR"
echo ""

# Step 1: Check if Java is installed
echo -e "${BLUE}Step 1: Checking Java installation...${NC}"

# Find best Java version (prefer 17 or 21 for Android)
echo "Searching for compatible Java versions..."
JAVA_21=$(/usr/libexec/java_home -v 21 2>/dev/null || echo "")
JAVA_17=$(/usr/libexec/java_home -v 17 2>/dev/null || echo "")

if [ -n "$JAVA_21" ]; then
    export JAVA_HOME=$JAVA_21
    echo -e "${GREEN}✓ Using Java 21: $JAVA_HOME${NC}"
elif [ -n "$JAVA_17" ]; then
    export JAVA_HOME=$JAVA_17
    echo -e "${GREEN}✓ Using Java 17: $JAVA_HOME${NC}"
else
    echo -e "${RED}✗ Compatible Java not found (need Java 17 or 21)${NC}"
    exit 1
fi

export PATH=$JAVA_HOME/bin:$PATH
java -version
echo ""

# Step 2: Check Android SDK
echo -e "${BLUE}Step 2: Checking Android SDK...${NC}"
if [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME=$HOME/Library/Android/sdk
    echo -e "${GREEN}✓ Android SDK found: $ANDROID_HOME${NC}"
elif [ -d "/Volumes/WorkSSD/.android-sdk" ]; then
    export ANDROID_HOME=/Volumes/WorkSSD/.android-sdk
    echo -e "${GREEN}✓ Android SDK found: $ANDROID_HOME${NC}"
elif [ -d "/Volumes/Data/android-sdk" ]; then
    export ANDROID_HOME=/Volumes/Data/android-sdk
    echo -e "${GREEN}✓ Android SDK found: $ANDROID_HOME${NC}"
elif [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME=$HOME/Android/Sdk
    echo -e "${GREEN}✓ Android SDK found: $ANDROID_HOME${NC}"
else
    echo -e "${RED}✗ Android SDK not found${NC}"
    echo "Please install Android SDK or set ANDROID_HOME environment variable"
    exit 1
fi

# Add Android SDK tools to PATH
export PATH=$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$PATH
echo ""

# Step 3: Install dependencies
echo -e "${BLUE}Step 3: Installing dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    npm install
fi
echo -e "${GREEN}✓ Dependencies ready${NC}"
echo ""

# Step 4: Clean
echo -e "${BLUE}Step 4: Cleaning previous builds...${NC}"
# Only clean build directories, not the cache (reuse cache for faster builds)
if [ -d "android" ]; then
    rm -rf android/app/build android/.gradle android/build
fi
echo -e "${GREEN}✓ Clean complete${NC}"
echo ""

# Step 5: Prebuild
echo -e "${BLUE}Step 5: Generating Android project...${NC}"
npx expo prebuild --platform android --clean
echo -e "${GREEN}✓ Generated${NC}"
echo ""

# Step 5b: Patch signing config for release keystore
KEYSTORE_FILE="$WORK_DIR/kashif-release.keystore"
if [ -f "$KEYSTORE_FILE" ]; then
    echo -e "${BLUE}Step 5b: Configuring release signing...${NC}"
    # Copy keystore to android/app
    cp "$KEYSTORE_FILE" android/app/kashif-release.keystore

    # Patch build.gradle to add release signing config
    sed -i '' '/signingConfigs {/,/^    }/{
        /debug {/,/}/!b
        /}/a\
        release {\
            storeFile file("kashif-release.keystore")\
            storePassword "Kashif2026Release"\
            keyAlias "kashif-key"\
            keyPassword "Kashif2026Release"\
        }
    }' android/app/build.gradle

    # Update release buildType to use release signingConfig
    sed -i '' 's/signingConfig signingConfigs.debug/signingConfig signingConfigs.release/' android/app/build.gradle

    # Verify
    if grep -q "kashif-release.keystore" android/app/build.gradle; then
        echo -e "${GREEN}✓ Release signing configured${NC}"
    else
        echo -e "${YELLOW}⚠ Signing patch failed, using debug keystore${NC}"
    fi
    echo ""
fi

# Step 6: Choose build type
echo -e "${BLUE}Step 6: Choosing APK type...${NC}"

# Accept command line argument or use default (release)
APK_CHOICE="${1:-2}"

if [ "$APK_CHOICE" = "1" ] || [ "$APK_CHOICE" = "debug" ]; then
    BUILD_TYPE="Debug"
    GRADLE_TASK="assembleDebug"
    APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
else
    BUILD_TYPE="Release"
    GRADLE_TASK="assembleRelease"
    APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
fi

echo -e "${GREEN}✓ Building $BUILD_TYPE APK${NC}"
echo ""

# Step 7: Build APK
echo -e "${BLUE}Step 7: Building $BUILD_TYPE APK...${NC}"
echo -e "${YELLOW}⚠ This will take 5-15 minutes${NC}"
echo ""

# Create gradle wrapper if needed
if [ ! -f "android/gradlew" ]; then
    echo "Creating Gradle wrapper..."
    cd android
    gradle wrapper --gradle-version 8.10.2
    cd ..
fi

cd android
chmod +x gradlew
echo "Building with Java 21..."
./gradlew clean --no-daemon 2>/dev/null || echo -e "${YELLOW}⚠ Gradle clean had warnings (continuing)${NC}"
./gradlew $GRADLE_TASK --no-daemon
cd ..

# Step 8: Success
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(ls -lh "$APK_PATH" | awk '{print $5}')
    DEST_APK="kashif-app-$BUILD_TYPE.apk"
    cp "$APK_PATH" "$DEST_APK"
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}✓ Build Complete!${NC}"
    echo "=========================================="
    echo ""
    echo -e "${BLUE}APK:${NC} ./$DEST_APK ($APK_SIZE)"
    echo ""
    echo "Install on phone:"
    echo "  adb install $DEST_APK"
    echo ""
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi
