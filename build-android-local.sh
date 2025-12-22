#!/bin/bash

# Kashif App - Local Android APK Build
# No Google Play Developer Account needed!

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

# Step 1: Check if Java is installed
echo -e "${BLUE}Step 1: Checking Java installation...${NC}"
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1)
    echo -e "${GREEN}✓ $JAVA_VERSION installed${NC}"
else
    echo -e "${RED}✗ Java not installed${NC}"
    echo ""
    echo "Installing Java via Homebrew..."
    if ! command -v brew &> /dev/null; then
        echo "Homebrew not found. Installing Homebrew first..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    fi
    brew install openjdk@17
    sudo ln -sfn $(brew --prefix)/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk
    echo -e "${GREEN}✓ Java installed${NC}"
fi
echo ""

# Step 2: Check if Android SDK is installed
echo -e "${BLUE}Step 2: Checking Android SDK...${NC}"
if [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME=$HOME/Library/Android/sdk
    export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin
    echo -e "${GREEN}✓ Android SDK found at: $ANDROID_HOME${NC}"
elif [ -d "$HOME/Android/Sdk" ]; then
    export ANDROID_HOME=$HOME/Android/Sdk
    export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin
    echo -e "${GREEN}✓ Android SDK found at: $ANDROID_HOME${NC}"
else
    echo -e "${RED}✗ Android SDK not found${NC}"
    echo ""
    echo "Please install Android Studio:"
    echo "https://developer.android.com/studio"
    echo ""
    echo "Or install Android SDK via Homebrew:"
    echo "  brew install --cask android-commandlinetools"
    echo ""
    exit 1
fi
echo ""

# Step 3: Install dependencies
echo -e "${BLUE}Step 3: Installing npm dependencies...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
else
    echo "Installing dependencies..."
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi
echo ""

# Step 4: Clean previous builds
echo -e "${BLUE}Step 4: Cleaning previous builds...${NC}"
if [ -d "android" ]; then
    echo "Cleaning Android build folder..."
    rm -rf android/app/build
    rm -rf android/.gradle
    echo -e "${GREEN}✓ Clean complete${NC}"
else
    echo -e "${YELLOW}⚠ No previous Android build found (will be created)${NC}"
fi
echo ""

# Step 5: Prebuild Android project
echo -e "${BLUE}Step 5: Generating Android native project...${NC}"
echo "This creates the Android Studio project files..."
npx expo prebuild --platform android --clean
echo -e "${GREEN}✓ Android project generated${NC}"
echo ""

# Step 6: Choose build type
echo -e "${BLUE}Step 6: Choose APK type:${NC}"
echo "1) Debug APK (Fast build, for testing)"
echo "2) Release APK (Optimized, smaller size, takes longer)"
echo ""
read -p "Enter your choice (1-2): " APK_CHOICE

if [ "$APK_CHOICE" = "2" ]; then
    BUILD_TYPE="Release"
    GRADLE_TASK="assembleRelease"
    APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
else
    BUILD_TYPE="Debug"
    GRADLE_TASK="assembleDebug"
    APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
fi
echo -e "${GREEN}Building $BUILD_TYPE APK${NC}"
echo ""

# Step 7: Build APK
echo -e "${BLUE}Step 7: Building Android APK...${NC}"
echo -e "${YELLOW}⚠ This will take 5-15 minutes for first build${NC}"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

cd android
chmod +x gradlew
./gradlew $GRADLE_TASK
cd ..

echo -e "${GREEN}✓ APK built successfully!${NC}"
echo ""

# Step 8: Find and display APK location
echo "=========================================="
echo -e "${GREEN}✓ Build Complete!${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}APK Location:${NC}"
echo "  $APK_PATH"
echo ""

# Get APK size
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(ls -lh "$APK_PATH" | awk '{print $5}')
    echo -e "${BLUE}APK Size:${NC} $APK_SIZE"
    echo ""
    
    # Copy APK to root directory for easy access
    DEST_APK="kashif-app-$BUILD_TYPE.apk"
    cp "$APK_PATH" "$DEST_APK"
    echo -e "${GREEN}✓ APK copied to: ./$DEST_APK${NC}"
    echo ""
fi

echo "Next steps:"
echo "1. Copy APK to your Android phone:"
echo "   - Via USB: adb install $APK_PATH"
echo "   - Via Email/Drive: Send APK file to phone"
echo ""
echo "2. On phone:"
echo "   - Enable 'Install from Unknown Sources' in Settings"
echo "   - Open APK file and install"
echo ""
echo "To rebuild:"
echo "  ./build-android-local.sh"
echo ""
