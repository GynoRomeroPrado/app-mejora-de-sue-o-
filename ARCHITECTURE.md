# SleepWise - System Architecture

## Overview
SleepWise is a comprehensive sleep tracking platform with AI-powered analysis, family monitoring, and corporate wellness features.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  React Native Mobile App (iOS/Android)                          │
│  - TypeScript                                                    │
│  - Redux Toolkit (State Management)                             │
│  - React Navigation                                              │
│  - Native Audio Recording                                        │
│  - HealthKit/Google Fit Integration                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS/WSS
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  AWS API Gateway + ALB                                          │
│  - Rate Limiting                                                 │
│  - Authentication (JWT)                                          │
│  - Request Routing                                               │
│  - SSL/TLS Termination                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Microservices Layer (Node.js)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Auth      │  │    User      │  │   Family     │         │
│  │   Service    │  │   Service    │  │   Service    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Sleep     │  │    Audio     │  │  Corporate   │         │
│  │   Service    │  │  Processing  │  │   Service    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Notification │  │  Analytics   │  │ Subscription │         │
│  │   Service    │  │   Service    │  │   Service    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    ML/AI Layer (Python)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  Audio Analysis Model (PyTorch)                      │      │
│  │  - Sleep Phase Detection (REM, Light, Deep)          │      │
│  │  - Snoring Detection                                  │      │
│  │  - Breathing Pattern Analysis                         │      │
│  │  - Apnea Event Detection                             │      │
│  │  - Multi-person Separation                           │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  Prediction Models (LSTM/Transformer)                │      │
│  │  - Sleep Quality Forecasting                         │      │
│  │  - Apnea Risk Prediction                             │      │
│  │  - Cognitive Decline Indicators                      │      │
│  │  - Stress/Burnout Detection                          │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  AWS SageMaker - Model Training & Deployment                    │
│  AWS Lambda - Inference Endpoints                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐               │
│  │   PostgreSQL       │  │   TimescaleDB      │               │
│  │   - User Data      │  │   - Time Series    │               │
│  │   - Relationships  │  │   - Sleep Sessions │               │
│  │   - Subscriptions  │  │   - Audio Events   │               │
│  │   - Organizations  │  │   - Health Metrics │               │
│  └────────────────────┘  └────────────────────┘               │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐               │
│  │   Redis Cache      │  │   AWS S3           │               │
│  │   - Sessions       │  │   - Audio Files    │               │
│  │   - Real-time Data │  │   - Model Storage  │               │
│  └────────────────────┘  └────────────────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Mobile Application
- **Framework**: React Native 0.72+
- **Language**: TypeScript 5.0+
- **State Management**: Redux Toolkit + RTK Query
- **Navigation**: React Navigation 6
- **Audio**: react-native-audio-recorder-player
- **Health Integration**:
  - react-native-health (iOS HealthKit)
  - react-native-google-fit (Android)
- **Charts**: react-native-chart-kit
- **Notifications**: react-native-push-notification
- **Storage**: AsyncStorage + SQLite (offline)

### Backend Services
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js + NestJS (microservices)
- **Language**: TypeScript
- **API**: REST + GraphQL (Apollo Server)
- **WebSocket**: Socket.io (real-time updates)
- **Authentication**: JWT + OAuth2
- **Validation**: Zod
- **ORM**: Prisma
- **Testing**: Jest + Supertest

### ML/AI Services
- **Language**: Python 3.11+
- **Framework**: PyTorch 2.0+
- **Audio Processing**: librosa, scipy
- **Model Serving**: FastAPI + TorchServe
- **Training**: AWS SageMaker
- **Experimentation**: MLflow
- **Data Processing**: pandas, numpy

### Infrastructure (AWS)
- **Compute**:
  - ECS Fargate (microservices)
  - Lambda (serverless functions)
  - SageMaker (ML training/inference)
- **Storage**:
  - RDS PostgreSQL + TimescaleDB
  - ElastiCache Redis
  - S3 (audio files, models)
- **Network**:
  - API Gateway
  - Application Load Balancer
  - CloudFront (CDN)
- **Security**:
  - Cognito (user pools)
  - KMS (encryption)
  - WAF (firewall)
  - VPC (network isolation)
- **Monitoring**:
  - CloudWatch
  - X-Ray (distributed tracing)

### DevOps
- **CI/CD**: GitHub Actions
- **Containers**: Docker + Docker Compose
- **IaC**: Terraform
- **Monitoring**: Datadog/New Relic
- **Logging**: CloudWatch Logs + ELK Stack

## Data Flow

### Sleep Session Recording
1. User starts sleep session in mobile app
2. App records audio in chunks (5-minute segments)
3. Audio encrypted on device and uploaded to S3
4. Audio Processing Service triggered via Lambda
5. ML model analyzes audio → detects events
6. Results stored in TimescaleDB
7. Real-time updates sent to app via WebSocket

### ML Inference Pipeline
1. Audio chunk uploaded to S3
2. S3 event triggers Lambda
3. Lambda invokes SageMaker endpoint
4. Model processes audio:
   - Feature extraction (MFCC, spectrograms)
   - Sleep phase classification
   - Event detection (snoring, apnea)
5. Results returned and stored
6. Predictions aggregated for insights

### Family Monitoring
1. User adds family member (with consent)
2. Permissions stored in Family Service
3. Dashboard queries multiple user data
4. Aggregated view with privacy filters
5. Alerts triggered for concerning patterns

## Security & Compliance

### HIPAA Compliance
- **Encryption**:
  - At rest: AES-256 (AWS KMS)
  - In transit: TLS 1.3
  - End-to-end for audio data
- **Access Control**:
  - Role-based (RBAC)
  - Audit logging (CloudTrail)
  - Data isolation (multi-tenancy)
- **Data Retention**:
  - User-controlled deletion
  - Automated backup (point-in-time recovery)
  - Compliance reporting

### Privacy
- Audio data encrypted before leaving device
- ML models run on anonymized data
- Family sharing requires explicit consent
- Corporate data aggregated/anonymized
- GDPR/CCPA compliant

## Scalability

### Horizontal Scaling
- Microservices auto-scale based on load (ECS)
- Read replicas for PostgreSQL
- Redis cluster for caching
- S3 for unlimited storage
- ML inference auto-scaling (SageMaker)

### Performance Optimization
- Audio processing: max 30s latency
- API response: p95 < 200ms
- Real-time updates: < 1s delay
- Offline mode: full recording capability
- CDN for static assets

## Monitoring & Observability

### Metrics
- **Application**: Request rate, error rate, latency
- **Infrastructure**: CPU, memory, disk, network
- **ML Models**: Inference time, accuracy, drift
- **Business**: DAU, session duration, conversion

### Alerts
- High error rates (> 1%)
- ML model degradation
- Health anomalies (apnea events)
- Infrastructure issues
- Security incidents

## Disaster Recovery
- **RTO**: 4 hours
- **RPO**: 15 minutes
- **Backup**: Automated daily snapshots
- **Multi-region**: Failover to secondary region
- **Data replication**: Cross-region async

## Development Workflow
1. Feature branch → PR → Code review
2. Automated tests (unit, integration, e2e)
3. Staging deployment (preview environment)
4. QA validation
5. Production deployment (blue-green)
6. Monitoring & rollback if needed
