#!/bin/bash

# Test runner script for all microservices
# This script runs tests in each service container after migrations

set -e

echo "========================================="
echo "🧪 Running Tests for All Services"
echo "========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run tests in a service
run_service_tests() {
    local service_name=$1
    echo ""
    echo "${YELLOW}Testing ${service_name}...${NC}"
    
    # Install test dependencies
    docker exec -it ${service_name} pip install -r /app/requirements-test.txt -q
    
    # Run pytest
    if docker exec -it ${service_name} pytest test_*.py -v; then
        echo "${GREEN}✓ ${service_name} tests passed${NC}"
        return 0
    else
        echo "${RED}✗ ${service_name} tests failed${NC}"
        return 1
    fi
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "${RED}Error: Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

# Check if containers are running
if ! docker-compose ps | grep -q "Up"; then
    echo "${YELLOW}Starting containers...${NC}"
    docker-compose up -d
    echo "Waiting 30 seconds for services to initialize..."
    sleep 30
fi

# Run migrations first
echo ""
echo "${YELLOW}Running database migrations...${NC}"
docker exec -it kashif-auth alembic upgrade head
docker exec -it kashif-reporting alembic upgrade head
docker exec -it kashif-gamification alembic upgrade head
docker exec -it kashif-coupons alembic upgrade head
docker exec -it kashif-notification alembic upgrade head
echo "${GREEN}✓ Migrations completed${NC}"

# Run tests for each service
failed_services=()

run_service_tests "kashif-auth" || failed_services+=("kashif-auth")
run_service_tests "kashif-reporting" || failed_services+=("kashif-reporting")
run_service_tests "kashif-gamification" || failed_services+=("kashif-gamification")
run_service_tests "kashif-coupons" || failed_services+=("kashif-coupons")
run_service_tests "kashif-notification" || failed_services+=("kashif-notification")

# Summary
echo ""
echo "========================================="
echo "📊 Test Summary"
echo "========================================="

if [ ${#failed_services[@]} -eq 0 ]; then
    echo "${GREEN}✓ All services passed tests!${NC}"
    exit 0
else
    echo "${RED}✗ Failed services: ${failed_services[*]}${NC}"
    exit 1
fi
