#!/bin/bash

set -e

echo "🚀 SleepWise - Setup Script"
echo "========================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js 20 or later.${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker.${NC}"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 is not installed. Please install Python 3.11 or later.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites met${NC}"

# Install backend dependencies
echo -e "\n${BLUE}Installing backend dependencies...${NC}"
cd backend/services/auth && npm install && cd ../../..
cd backend/services/sleep && npm install && cd ../../..
cd backend/services/family && npm install && cd ../../..
cd backend/services/subscription && npm install && cd ../../..
cd backend/services/analytics && npm install && cd ../../..
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

# Install mobile dependencies
echo -e "\n${BLUE}Installing mobile dependencies...${NC}"
cd mobile && npm install && cd ..
echo -e "${GREEN}✓ Mobile dependencies installed${NC}"

# Install ML dependencies
echo -e "\n${BLUE}Installing ML dependencies...${NC}"
cd ml/inference && pip install -r requirements.txt && cd ../..
echo -e "${GREEN}✓ ML dependencies installed${NC}"

# Setup database
echo -e "\n${BLUE}Setting up database...${NC}"
cd backend/shared/prisma
npx prisma generate
echo -e "${GREEN}✓ Prisma client generated${NC}"

# Create .env files if they don't exist
echo -e "\n${BLUE}Creating environment files...${NC}"

# Backend .env template
cat > ../../services/auth/.env << 'ENVEOF'
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://sleepwise:password@localhost:5432/sleepwise
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
ENVEOF

# Mobile .env template
cat > ../../../mobile/.env << 'ENVEOF'
API_URL=http://localhost:3000
ENVEOF

# ML .env template
cat > ../../../ml/inference/.env << 'ENVEOF'
MODEL_PATH=../models
DATABASE_URL=postgresql://sleepwise:password@localhost:5432/sleepwise
ENVEOF

echo -e "${GREEN}✓ Environment files created${NC}"

echo -e "\n${GREEN}========================================="
echo -e "✨ Setup complete!${NC}"
echo -e "\nNext steps:"
echo -e "1. Update .env files with your configuration"
echo -e "2. Run 'docker-compose up -d' to start services"
echo -e "3. Run 'npm run dev' in mobile/ to start the mobile app"
echo -e "4. Visit http://localhost:3000/health to check API status"
