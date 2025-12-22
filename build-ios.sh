#!/bin/bash

# Kashif App - iOS Build Script
# This script handles all iOS build setup and execution

set -e  # Exit on error

echo "=========================================="
echo "🍎 Kashif App - iOS Build Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Install EAS CLI (with sudo to fix permission issues)
echo -e "${BLUE}Step 1: Installing EAS CLI...${NC}"
if command -v eas &> /dev/null; then
    echo -e "${GREEN}✓ EAS CLI already installed${NC}"
    eas --version
else
    echo "Installing EAS CLI with sudo (requires password)..."
    sudo npm install -g eas-cli
    echo -e "${GREEN}✓ EAS CLI installed successfully${NC}"
fi
echo ""

# Step 2: Check Expo account
echo -e "${BLUE}Step 2: Checking Expo account...${NC}"
if eas whoami &> /dev/null; then
    EXPO_USER=$(eas whoami)
    echo -e "${GREEN}✓ Already logged in as: $EXPO_USER${NC}"
else
    echo -e "${YELLOW}⚠ Not logged in to Expo${NC}"
    echo "Please login to your Expo account:"
    eas login
    echo -e "${GREEN}✓ Logged in successfully${NC}"
fi
echo ""

# Step 3: Validate configuration
echo -e "${BLUE}Step 3: Validating configuration...${NC}"
echo "Checking app.json..."
if [ -f "app.json" ]; then
    echo -e "${GREEN}✓ app.json found${NC}"
else
    echo -e "${RED}✗ app.json not found${NC}"
    exit 1
fi

echo "Checking eas.json..."
if [ -f "eas.json" ]; then
    echo -e "${GREEN}✓ eas.json found${NC}"
else
    echo -e "${RED}✗ eas.json not found${NC}"
    exit 1
fi
echo ""

# Step 4: Configure EAS project
echo -e "${BLUE}Step 4: Configuring EAS project...${NC}"
if grep -q "projectId" app.json; then
    echo -e "${GREEN}✓ EAS project already configured${NC}"
else
    echo "Configuring EAS project..."
    eas build:configure
fi
echo ""

# Step 5: Install dependencies
echo -e "${BLUE}Step 5: Installing dependencies...${NC}"
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Dependencies already installed${NC}"
else
    echo "Installing dependencies..."
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi
echo ""

# Step 6: Choose build type
echo -e "${BLUE}Step 6: Choose build type:${NC}"
echo "1) Production (for App Store)"
echo "2) Preview (for TestFlight testing)"
echo "3) Development (for Simulator)"
echo ""
read -p "Enter your choice (1-3): " BUILD_CHOICE

case $BUILD_CHOICE in
    1)
        PROFILE="production"
        echo -e "${GREEN}Building for App Store (Production)${NC}"
        ;;
    2)
        PROFILE="preview"
        echo -e "${GREEN}Building for TestFlight (Preview)${NC}"
        ;;
    3)
        PROFILE="development"
        echo -e "${GREEN}Building for Simulator (Development)${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice. Defaulting to Production.${NC}"
        PROFILE="production"
        ;;
esac
echo ""

# Step 7: Start iOS build
echo -e "${BLUE}Step 7: Starting iOS build...${NC}"
echo -e "${YELLOW}⚠ This will take 20-30 minutes${NC}"
echo -e "${YELLOW}⚠ You will see a build URL - save it!${NC}"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Start the build
eas build --platform ios --profile $PROFILE

# Step 8: Success message
echo ""
echo "=========================================="
echo -e "${GREEN}✓ Build submitted successfully!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Visit the build URL shown above to track progress"
echo "2. Once complete, download the .ipa file"
echo ""
if [ "$PROFILE" = "production" ]; then
    echo "3. Submit to App Store:"
    echo "   eas submit --platform ios --profile production"
elif [ "$PROFILE" = "preview" ]; then
    echo "3. Submit to TestFlight:"
    echo "   eas submit --platform ios --profile preview"
else
    echo "3. Install on simulator:"
    echo "   Download the .app file from the build page"
fi
echo ""
echo -e "${BLUE}📱 App Store Connect: https://appstoreconnect.apple.com/${NC}"
echo ""
