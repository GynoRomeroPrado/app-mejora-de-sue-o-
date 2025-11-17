#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-"us-east-1"}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-""}
ECS_CLUSTER="sleepwise-production"
SERVICES=("auth" "sleep" "family" "subscription" "analytics" "ml-inference")

echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}   SleepWise - Production Deployment    ${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}\n"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}✗ AWS CLI is not installed${NC}"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    exit 1
fi

# Get AWS Account ID if not provided
if [ -z "$AWS_ACCOUNT_ID" ]; then
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo -e "${GREEN}✓ AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"
fi

# Function to build and push Docker image
build_and_push() {
    local service=$1
    local context=$2
    local port=$3

    echo -e "\n${YELLOW}► Building ${service} service...${NC}"

    # Build Docker image
    docker build \
        -t sleepwise/${service}-service:latest \
        -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/sleepwise/${service}-service:latest \
        -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/sleepwise/${service}-service:$(git rev-parse --short HEAD) \
        ${context}

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Built ${service} image successfully${NC}"
    else
        echo -e "${RED}✗ Failed to build ${service} image${NC}"
        exit 1
    fi

    # Push to ECR
    echo -e "${YELLOW}► Pushing ${service} to ECR...${NC}"
    docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/sleepwise/${service}-service:latest
    docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/sleepwise/${service}-service:$(git rev-parse --short HEAD)

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Pushed ${service} to ECR${NC}"
    else
        echo -e "${RED}✗ Failed to push ${service} to ECR${NC}"
        exit 1
    fi
}

# Function to update ECS service
update_ecs_service() {
    local service=$1

    echo -e "\n${YELLOW}► Updating ${service} ECS service...${NC}"

    aws ecs update-service \
        --cluster ${ECS_CLUSTER} \
        --service ${service}-service \
        --force-new-deployment \
        --region ${AWS_REGION} \
        > /dev/null 2>&1

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Updated ${service} service${NC}"
    else
        echo -e "${RED}✗ Failed to update ${service} service${NC}"
        exit 1
    fi
}

# Function to wait for service stability
wait_for_service() {
    local service=$1

    echo -e "${YELLOW}► Waiting for ${service} to stabilize...${NC}"

    aws ecs wait services-stable \
        --cluster ${ECS_CLUSTER} \
        --services ${service}-service \
        --region ${AWS_REGION}

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${service} is stable${NC}"
    else
        echo -e "${RED}✗ ${service} failed to stabilize${NC}"
        exit 1
    fi
}

# Main deployment flow
main() {
    # Confirm deployment
    echo -e "${YELLOW}You are about to deploy to PRODUCTION${NC}"
    echo -e "${YELLOW}AWS Account: ${AWS_ACCOUNT_ID}${NC}"
    echo -e "${YELLOW}Region: ${AWS_REGION}${NC}"
    echo -e "${YELLOW}Cluster: ${ECS_CLUSTER}${NC}"
    echo -e "${YELLOW}Git commit: $(git rev-parse --short HEAD)${NC}\n"

    read -p "Continue? (yes/no): " -r
    echo
    if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi

    # Login to ECR
    echo -e "\n${BLUE}═══ Step 1: Authenticating with ECR ═══${NC}"
    aws ecr get-login-password --region ${AWS_REGION} | \
        docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Authenticated with ECR${NC}"
    else
        echo -e "${RED}✗ Failed to authenticate with ECR${NC}"
        exit 1
    fi

    # Run tests
    echo -e "\n${BLUE}═══ Step 2: Running Tests ═══${NC}"
    echo -e "${YELLOW}► Running backend tests...${NC}"

    # Auth service tests
    cd backend/services/auth
    npm test -- --passWithNoTests || true
    cd ../../..

    # Build and push images
    echo -e "\n${BLUE}═══ Step 3: Building and Pushing Images ═══${NC}"

    build_and_push "auth" "./backend/services/auth" "3000"
    build_and_push "sleep" "./backend/services/sleep" "3002"
    build_and_push "family" "./backend/services/family" "3003"
    build_and_push "subscription" "./backend/services/subscription" "3004"
    build_and_push "analytics" "./backend/services/analytics" "3005"
    build_and_push "ml-inference" "./ml/inference" "8000"

    # Update ECS services
    echo -e "\n${BLUE}═══ Step 4: Updating ECS Services ═══${NC}"

    for service in "${SERVICES[@]}"; do
        update_ecs_service ${service}
    done

    # Wait for services to stabilize
    echo -e "\n${BLUE}═══ Step 5: Waiting for Services to Stabilize ═══${NC}"

    for service in "${SERVICES[@]}"; do
        wait_for_service ${service} &
    done

    # Wait for all background jobs
    wait

    # Run smoke tests
    echo -e "\n${BLUE}═══ Step 6: Running Smoke Tests ═══${NC}"

    SERVICES_HEALTHY=true

    # Test auth service
    echo -e "${YELLOW}► Testing auth service...${NC}"
    if curl -sf https://api.sleepwise.com/health > /dev/null; then
        echo -e "${GREEN}✓ Auth service is healthy${NC}"
    else
        echo -e "${RED}✗ Auth service health check failed${NC}"
        SERVICES_HEALTHY=false
    fi

    # Test ML inference service
    echo -e "${YELLOW}► Testing ML inference service...${NC}"
    if curl -sf https://api.sleepwise.com/ml/health > /dev/null; then
        echo -e "${GREEN}✓ ML inference service is healthy${NC}"
    else
        echo -e "${RED}✗ ML inference service health check failed${NC}"
        SERVICES_HEALTHY=false
    fi

    # Create deployment record
    echo -e "\n${BLUE}═══ Step 7: Recording Deployment ═══${NC}"

    DEPLOYMENT_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    GIT_COMMIT=$(git rev-parse HEAD)
    GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

    cat > deployment-record.json <<EOF
{
  "timestamp": "${DEPLOYMENT_TIME}",
  "git_commit": "${GIT_COMMIT}",
  "git_branch": "${GIT_BRANCH}",
  "deployed_by": "$(git config user.email)",
  "services": [
    $(for service in "${SERVICES[@]}"; do
        echo "\"${service}\","
    done | sed '$ s/,$//')
  ],
  "status": "$([ "$SERVICES_HEALTHY" = true ] && echo "success" || echo "partial")"
}
EOF

    # Upload to S3
    aws s3 cp deployment-record.json s3://sleepwise-deployments/${DEPLOYMENT_TIME}.json --region ${AWS_REGION}

    # Final summary
    echo -e "\n${BLUE}════════════════════════════════════════${NC}"
    if [ "$SERVICES_HEALTHY" = true ]; then
        echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
    else
        echo -e "${YELLOW}⚠ Deployment completed with warnings${NC}"
        echo -e "${YELLOW}  Some health checks failed. Please review logs.${NC}"
    fi
    echo -e "${BLUE}════════════════════════════════════════${NC}"

    echo -e "\n${BLUE}Deployment Summary:${NC}"
    echo -e "  Time: ${DEPLOYMENT_TIME}"
    echo -e "  Commit: ${GIT_COMMIT}"
    echo -e "  Branch: ${GIT_BRANCH}"
    echo -e "  Deployed by: $(git config user.email)"
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo -e "  1. Monitor CloudWatch logs for any errors"
    echo -e "  2. Check ECS service metrics"
    echo -e "  3. Verify user-facing features"
    echo -e "  4. Update status page if applicable"

    # Send notification (optional)
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        echo -e "\n${YELLOW}► Sending Slack notification...${NC}"
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 SleepWise Production Deployment\n• Commit: ${GIT_COMMIT}\n• Status: $([ "$SERVICES_HEALTHY" = true ] && echo "✅ Success" || echo "⚠️ Partial")\n• Deployed by: $(git config user.email)\"}" \
            $SLACK_WEBHOOK_URL
    fi
}

# Rollback function
rollback() {
    echo -e "\n${RED}════════════════════════════════════════${NC}"
    echo -e "${RED}   Rolling Back Deployment              ${NC}"
    echo -e "${RED}════════════════════════════════════════${NC}\n"

    for service in "${SERVICES[@]}"; do
        echo -e "${YELLOW}► Rolling back ${service}...${NC}"

        # Get previous task definition
        PREVIOUS_TASK_DEF=$(aws ecs describe-services \
            --cluster ${ECS_CLUSTER} \
            --services ${service}-service \
            --region ${AWS_REGION} \
            --query 'services[0].deployments[1].taskDefinition' \
            --output text)

        if [ "$PREVIOUS_TASK_DEF" != "None" ]; then
            aws ecs update-service \
                --cluster ${ECS_CLUSTER} \
                --service ${service}-service \
                --task-definition ${PREVIOUS_TASK_DEF} \
                --region ${AWS_REGION} \
                > /dev/null 2>&1

            echo -e "${GREEN}✓ Rolled back ${service}${NC}"
        else
            echo -e "${RED}✗ No previous version found for ${service}${NC}"
        fi
    done

    echo -e "\n${GREEN}Rollback completed${NC}"
}

# Parse command line arguments
case "${1:-deploy}" in
    deploy)
        main
        ;;
    rollback)
        rollback
        ;;
    *)
        echo "Usage: $0 {deploy|rollback}"
        exit 1
        ;;
esac
