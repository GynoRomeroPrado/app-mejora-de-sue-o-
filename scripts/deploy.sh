#!/bin/bash
# SleepWise Deployment Script

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
AWS_REGION=${AWS_REGION:-us-east-1}
ECR_REGISTRY=${ECR_REGISTRY}
ECS_CLUSTER="sleepwise-${ENVIRONMENT}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  SleepWise Deployment Script${NC}"
echo -e "${GREEN}  Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}========================================${NC}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}Error: Environment must be 'staging' or 'production'${NC}"
    exit 1
fi

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Confirmation for production
if [ "$ENVIRONMENT" == "production" ]; then
    echo -e "${YELLOW}WARNING: You are about to deploy to PRODUCTION${NC}"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 0
    fi
fi

echo -e "${GREEN}[1/7] Authenticating with AWS ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY

echo -e "${GREEN}[2/7] Building Docker images...${NC}"

# Build ML service
echo "Building ML service..."
docker build -t sleepwise/ml-service:latest -t sleepwise/ml-service:$ENVIRONMENT ./ml
docker tag sleepwise/ml-service:latest $ECR_REGISTRY/sleepwise-ml:$ENVIRONMENT
docker push $ECR_REGISTRY/sleepwise-ml:$ENVIRONMENT

# Build Auth service
echo "Building Auth service..."
docker build -t sleepwise/auth-service:latest -t sleepwise/auth-service:$ENVIRONMENT ./backend/services/auth
docker tag sleepwise/auth-service:latest $ECR_REGISTRY/sleepwise-auth:$ENVIRONMENT
docker push $ECR_REGISTRY/sleepwise-auth:$ENVIRONMENT

echo -e "${GREEN}[3/7] Running database migrations...${NC}"
cd backend/shared
DATABASE_URL=$DATABASE_URL npm run migrate

echo -e "${GREEN}[4/7] Deploying to ECS...${NC}"

# Update ML service
echo "Updating ML service..."
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service sleepwise-ml-service \
    --force-new-deployment \
    --region $AWS_REGION

# Update Auth service
echo "Updating Auth service..."
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service sleepwise-auth-service \
    --force-new-deployment \
    --region $AWS_REGION

# Update Sleep service
echo "Updating Sleep service..."
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service sleepwise-sleep-service \
    --force-new-deployment \
    --region $AWS_REGION

echo -e "${GREEN}[5/7] Waiting for services to stabilize...${NC}"
aws ecs wait services-stable \
    --cluster $ECS_CLUSTER \
    --services sleepwise-ml-service sleepwise-auth-service sleepwise-sleep-service \
    --region $AWS_REGION

echo -e "${GREEN}[6/7] Running health checks...${NC}"

# Get service endpoints
ML_ENDPOINT=$(aws ecs describe-services --cluster $ECS_CLUSTER --services sleepwise-ml-service --query 'services[0].loadBalancers[0].containerName' --output text --region $AWS_REGION)
AUTH_ENDPOINT=$(aws ecs describe-services --cluster $ECS_CLUSTER --services sleepwise-auth-service --query 'services[0].loadBalancers[0].containerName' --output text --region $AWS_REGION)

# Health check with retry
max_retries=10
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if curl -f "https://api-${ENVIRONMENT}.sleepwise.app/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Health check passed${NC}"
        break
    fi

    retry_count=$((retry_count + 1))
    if [ $retry_count -eq $max_retries ]; then
        echo -e "${RED}✗ Health check failed after ${max_retries} attempts${NC}"
        exit 1
    fi

    echo "Waiting for services to be healthy... (${retry_count}/${max_retries})"
    sleep 10
done

echo -e "${GREEN}[7/7] Deployment verification...${NC}"

# Test critical endpoints
echo "Testing authentication endpoint..."
curl -f "https://api-${ENVIRONMENT}.sleepwise.app/api/v1/auth/health" || {
    echo -e "${RED}✗ Auth service not responding${NC}"
    exit 1
}

echo "Testing ML inference endpoint..."
curl -f "https://ml-${ENVIRONMENT}.sleepwise.app/health" || {
    echo -e "${RED}✗ ML service not responding${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment Successful! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "API URL: https://api-${ENVIRONMENT}.sleepwise.app"
echo -e "ML URL: https://ml-${ENVIRONMENT}.sleepwise.app"
echo ""
echo -e "Next steps:"
echo -e "  1. Monitor CloudWatch logs"
echo -e "  2. Check application metrics"
echo -e "  3. Verify mobile app connectivity"
echo ""

# Send deployment notification
if [ -n "$SLACK_WEBHOOK" ]; then
    curl -X POST $SLACK_WEBHOOK \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"✅ SleepWise deployed to ${ENVIRONMENT} successfully\"}"
fi

exit 0
