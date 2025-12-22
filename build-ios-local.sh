#!/bin/bash

# Kashif App - Local iOS Build (Simulator)
# No Apple Developer Account needed!

set -e  # Exit on error

echo "=========================================="
echo "🍎 Kashif App - Local iOS Build"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Check if Xcode is installed
echo -e "${BLUE}Step 1: Checking Xcode installation...${NC}"
if command -v xcodebuild &> /dev/null; then
    XCODE_VERSION=$(xcodebuild -version | head -n 1)
    echo -e "${GREEN}✓ $XCODE_VERSION installed${NC}"
else
    echo -e "${RED}✗ Xcode not installed${NC}"
    echo ""
    echo "Please install Xcode from App Store:"
    echo "https://apps.apple.com/app/xcode/id497799835"
    echo ""
    exit 1
fi
echo ""

# Step 2: Check if Xcode Command Line Tools are installed
echo -e "${BLUE}Step 2: Checking Xcode Command Line Tools...${NC}"
if xcode-select -p &> /dev/null; then
    echo -e "${GREEN}✓ Xcode Command Line Tools installed${NC}"
else
    echo -e "${YELLOW}⚠ Installing Xcode Command Line Tools...${NC}"
    xcode-select --install
    echo "Please complete the installation and run this script again."
    exit 1
fi
echo ""

# Step 3: Accept Xcode license
echo -e "${BLUE}Step 3: Checking Xcode license...${NC}"
if sudo xcodebuild -license check &> /dev/null; then
    echo -e "${GREEN}✓ Xcode license accepted${NC}"
else
    echo -e "${YELLOW}⚠ Accepting Xcode license (requires password)...${NC}"
    sudo xcodebuild -license accept
    echo -e "${GREEN}✓ License accepted${NC}"
fi
echo ""

# Step 4: Install CocoaPods (iOS dependency manager)
echo -e "${BLUE}Step 4: Checking CocoaPods...${NC}"
if command -v pod &> /dev/null; then
    POD_VERSION=$(pod --version)
    echo -e "${GREEN}✓ CocoaPods $POD_VERSION installed${NC}"
else
    echo -e "${YELLOW}⚠ Installing CocoaPods...${NC}"
    sudo gem install cocoapods
    echo -e "${GREEN}✓ CocoaPods installed${NC}"
fi
echo ""

# Step 5: Install dependencies
echo -e "${BLUE}Step 5: Installing npm dependencies...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
else
    echo "Installing dependencies..."
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi
echo ""

# Step 6: Clean previous builds
echo -e "${BLUE}Step 6: Cleaning previous builds...${NC}"
if [ -d "ios" ]; then
    echo "Cleaning iOS build folder..."
    rm -rf ios/build
    echo -e "${GREEN}✓ Clean complete${NC}"
else
    echo -e "${YELLOW}⚠ No previous iOS build found (will be created)${NC}"
fi
echo ""

# Step 7: Prebuild iOS project
echo -e "${BLUE}Step 7: Generating iOS native project...${NC}"
echo "This creates the Xcode project files..."
npx expo prebuild --platform ios --clean
echo -e "${GREEN}✓ iOS project generated${NC}"
echo ""

# Step 8: Install iOS pods
echo -e "${BLUE}Step 8: Installing iOS CocoaPods...${NC}"
cd ios
pod install
cd ..
echo -e "${GREEN}✓ Pods installed${NC}"
echo ""

# Step 9: Choose simulator or device
echo -e "${BLUE}Step 9: Choose target:${NC}"
echo "1) iOS Simulator (Recommended - No Developer Account needed)"
echo "2) Physical Device (Requires Apple Developer Account)"
echo ""
read -p "Enter your choice (1-2): " TARGET_CHOICE

if [ "$TARGET_CHOICE" = "2" ]; then
    echo -e "${YELLOW}⚠ Physical device requires Apple Developer Account${NC}"
    echo "You will need to:"
    echo "1. Open ios/kashifapp.xcworkspace in Xcode"
    echo "2. Select your device"
    echo "3. Sign the app with your Apple ID"
    echo "4. Click Run"
    echo ""
    echo "Opening Xcode..."
    open ios/kashifapp.xcworkspace
    exit 0
fi

# Step 10: List available simulators
echo ""
echo -e "${BLUE}Step 10: Available iOS Simulators:${NC}"
xcrun simctl list devices available --json | grep -o '"name" : "[^"]*"' | grep -o '"[^"]*"$' | grep -o '[^"]*' | grep "iPhone" | head -10
echo ""

# Step 11: Build and run on simulator
echo -e "${BLUE}Step 11: Building and launching app on simulator...${NC}"
echo -e "${YELLOW}⚠ This will take 5-10 minutes for first build${NC}"
echo -e "${YELLOW}⚠ The iOS Simulator will open automatically${NC}"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Run on iOS simulator
npx expo run:ios --device

# Success message
echo ""
echo "=========================================="
echo -e "${GREEN}✓ App launched successfully!${NC}"
echo "=========================================="
echo ""
echo "The Kashif app is now running in the iOS Simulator!"
echo ""
echo "Next time, you can run:"
echo "  npm run ios"
echo "  or"
echo "  npx expo run:ios"
echo ""
echo "To open in Xcode:"
echo "  open ios/kashifapp.xcworkspace"
echo ""
