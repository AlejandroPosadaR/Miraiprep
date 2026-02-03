#!/bin/bash
set -e  # Exit on any error

echo "🧪 Running CI checks locally..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Backend checks
echo -e "${BLUE}📦 Backend CI Checks...${NC}"
cd backend

echo "  → Running tests..."
mvn clean verify -q
echo -e "  ${GREEN}✅ Backend tests passed${NC}"

cd ..

# Frontend checks
echo ""
echo -e "${BLUE}📦 Frontend CI Checks...${NC}"
cd frontend

echo "  → Installing dependencies..."
npm ci --silent > /dev/null 2>&1

echo "  → Running linter..."
npm run lint

echo "  → Building..."
npm run build > /dev/null 2>&1
echo -e "  ${GREEN}✅ Frontend checks passed${NC}"

cd ..

echo ""
echo -e "${GREEN}🎉 All CI checks passed! Ready to push.${NC}"
