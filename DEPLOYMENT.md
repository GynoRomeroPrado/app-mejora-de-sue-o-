# 🚀 Guía de Despliegue - SleepWise

Esta guía proporciona instrucciones paso a paso para desplegar SleepWise en producción.

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Configuración de Infraestructura](#configuración-de-infraestructura)
3. [Configuración de Base de Datos](#configuración-de-base-de-datos)
4. [Configuración de Servicios Backend](#configuración-de-servicios-backend)
5. [Configuración de ML Services](#configuración-de-ml-services)
6. [Despliegue de Mobile App](#despliegue-de-mobile-app)
7. [Configuración de Servicios Externos](#configuración-de-servicios-externos)
8. [Monitoring y Logs](#monitoring-y-logs)
9. [Troubleshooting](#troubleshooting)

---

## 🔧 Requisitos Previos

### Software Requerido

```bash
# Node.js 20 o superior
node --version  # v20.x.x

# Docker y Docker Compose
docker --version  # 24.x.x o superior
docker-compose --version  # 2.x.x o superior

# Python 3.11 o superior
python3 --version  # 3.11.x

# Git
git --version  # 2.x.x
```

### Cuentas y Servicios Externos

- ☁️ **AWS Account** (ECS, S3, RDS, SageMaker)
- 💳 **Stripe Account** (Pagos y suscripciones)
- 📧 **SMTP Server** (Gmail, SendGrid, Mailgun, etc.)
- 🔐 **Certificados SSL** (Let's Encrypt o AWS Certificate Manager)

---

## 🏗️ Configuración de Infraestructura

### Opción A: Deployment en AWS ECS (Recomendado)

#### 1. Configurar AWS CLI

```bash
# Instalar AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configurar credenciales
aws configure
# AWS Access Key ID: [Tu Access Key]
# AWS Secret Access Key: [Tu Secret Key]
# Default region: us-east-1
# Default output format: json
```

#### 2. Crear ECR Repositories

```bash
# Crear repositorios para cada servicio
aws ecr create-repository --repository-name sleepwise/auth-service
aws ecr create-repository --repository-name sleepwise/sleep-service
aws ecr create-repository --repository-name sleepwise/family-service
aws ecr create-repository --repository-name sleepwise/subscription-service
aws ecr create-repository --repository-name sleepwise/analytics-service
aws ecr create-repository --repository-name sleepwise/ml-inference
```

#### 3. Configurar VPC y Subnets

```bash
# Crear VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=sleepwise-vpc}]'

# Crear subnets
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.1.0/24 --availability-zone us-east-1a
aws ec2 create-subnet --vpc-id <VPC_ID> --cidr-block 10.0.2.0/24 --availability-zone us-east-1b
```

#### 4. Configurar RDS (PostgreSQL + TimescaleDB)

```bash
# Crear subnet group
aws rds create-db-subnet-group \
  --db-subnet-group-name sleepwise-db-subnet \
  --db-subnet-group-description "SleepWise DB Subnet Group" \
  --subnet-ids subnet-xxxxx subnet-yyyyy

# Crear instancia RDS
aws rds create-db-instance \
  --db-instance-identifier sleepwise-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username sleepwise \
  --master-user-password [STRONG_PASSWORD] \
  --allocated-storage 100 \
  --storage-encrypted \
  --backup-retention-period 7 \
  --db-subnet-group-name sleepwise-db-subnet \
  --vpc-security-group-ids sg-xxxxx
```

#### 5. Configurar S3 Bucket

```bash
# Crear bucket para audio
aws s3 mb s3://sleepwise-audio-production --region us-east-1

# Habilitar encriptación
aws s3api put-bucket-encryption \
  --bucket sleepwise-audio-production \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Configurar lifecycle policy
aws s3api put-bucket-lifecycle-configuration \
  --bucket sleepwise-audio-production \
  --lifecycle-configuration file://s3-lifecycle.json
```

Crear archivo `s3-lifecycle.json`:

```json
{
  "Rules": [
    {
      "Id": "DeleteOldAudio",
      "Status": "Enabled",
      "Prefix": "sleep-audio/",
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

### Opción B: Deployment con Docker Compose (Desarrollo/Staging)

#### 1. Preparar docker-compose.production.yml

```yaml
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_USER: sleepwise
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: sleepwise
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  auth-service:
    build:
      context: ./backend/services/auth
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://sleepwise:${DB_PASSWORD}@postgres:5432/sleepwise
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    restart: unless-stopped

  sleep-service:
    build:
      context: ./backend/services/sleep
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://sleepwise:${DB_PASSWORD}@postgres:5432/sleepwise
      AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
      S3_BUCKET_NAME: sleepwise-audio-production
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    ports:
      - "3002:3002"
    depends_on:
      - postgres
    restart: unless-stopped

  family-service:
    build:
      context: ./backend/services/family
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://sleepwise:${DB_PASSWORD}@postgres:5432/sleepwise
      SMTP_HOST: ${SMTP_HOST}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    ports:
      - "3003:3003"
    depends_on:
      - postgres
    restart: unless-stopped

  subscription-service:
    build:
      context: ./backend/services/subscription
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://sleepwise:${DB_PASSWORD}@postgres:5432/sleepwise
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
    ports:
      - "3004:3004"
    depends_on:
      - postgres
    restart: unless-stopped

  analytics-service:
    build:
      context: ./backend/services/analytics
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://sleepwise:${DB_PASSWORD}@postgres:5432/sleepwise
    ports:
      - "3005:3005"
    depends_on:
      - postgres
    restart: unless-stopped

  ml-inference:
    build:
      context: ./ml/inference
      dockerfile: Dockerfile
    environment:
      MODEL_PATH: /app/models
      DATABASE_URL: postgresql://sleepwise:${DB_PASSWORD}@postgres:5432/sleepwise
    ports:
      - "8000:8000"
    depends_on:
      - postgres
    volumes:
      - ml_models:/app/models
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - auth-service
      - sleep-service
      - family-service
      - subscription-service
      - analytics-service
      - ml-inference
    restart: unless-stopped

volumes:
  postgres_data:
  ml_models:
```

---

## 💾 Configuración de Base de Datos

### 1. Instalar TimescaleDB Extension

```bash
# Conectar a PostgreSQL
psql -h <RDS_ENDPOINT> -U sleepwise -d sleepwise

# Habilitar TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

# Crear hypertable para sesiones de sueño
SELECT create_hypertable('SleepSession', 'startTime');
```

### 2. Ejecutar Migraciones de Prisma

```bash
cd backend/shared/prisma

# Generar cliente Prisma
npx prisma generate

# Ejecutar migraciones
npx prisma migrate deploy
```

### 3. Seed Data (Opcional)

```bash
# Ejecutar seeds
npx prisma db seed
```

---

## 🔧 Configuración de Servicios Backend

### Variables de Entorno

Crear archivo `.env.production` en cada servicio:

#### Auth Service (.env)

```bash
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://sleepwise:PASSWORD@sleepwise-db.xxxxx.us-east-1.rds.amazonaws.com:5432/sleepwise

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_REFRESH_SECRET=your-super-secret-refresh-key-minimum-32-characters
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# CORS
ALLOWED_ORIGINS=https://sleepwise.com,https://app.sleepwise.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Sleep Service (.env)

```bash
NODE_ENV=production
PORT=3002

DATABASE_URL=postgresql://sleepwise:PASSWORD@sleepwise-db.xxxxx.us-east-1.rds.amazonaws.com:5432/sleepwise

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
S3_BUCKET_NAME=sleepwise-audio-production

# Encryption
ENCRYPTION_KEY=your-64-character-hex-encryption-key-for-audio-data-encryption

# ML Inference
ML_INFERENCE_URL=http://ml-inference:8000
```

#### Family Service (.env)

```bash
NODE_ENV=production
PORT=3003

DATABASE_URL=postgresql://sleepwise:PASSWORD@sleepwise-db.xxxxx.us-east-1.rds.amazonaws.com:5432/sleepwise

# SMTP (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@sleepwise.com
SMTP_PASS=your-app-specific-password
SMTP_FROM=SleepWise <noreply@sleepwise.com>

# App URL
APP_URL=https://app.sleepwise.com
```

#### Subscription Service (.env)

```bash
NODE_ENV=production
PORT=3004

DATABASE_URL=postgresql://sleepwise:PASSWORD@sleepwise-db.xxxxx.us-east-1.rds.amazonaws.com:5432/sleepwise

# Stripe (Obtener de https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_live_YOUR_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Pricing Plan IDs (Obtener de Stripe Dashboard > Products)
STRIPE_PRICE_PREMIUM=price_YOUR_PREMIUM_PRICE_ID
STRIPE_PRICE_FAMILY=price_YOUR_FAMILY_PRICE_ID
STRIPE_PRICE_CORPORATE=price_YOUR_CORPORATE_PRICE_ID
```

#### Analytics Service (.env)

```bash
NODE_ENV=production
PORT=3005

DATABASE_URL=postgresql://sleepwise:PASSWORD@sleepwise-db.xxxxx.us-east-1.rds.amazonaws.com:5432/sleepwise
```

### Build y Push de Imágenes Docker

```bash
# Autenticar con ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build y push auth service
cd backend/services/auth
docker build -t sleepwise/auth-service:latest .
docker tag sleepwise/auth-service:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/sleepwise/auth-service:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/sleepwise/auth-service:latest

# Repetir para cada servicio
cd ../sleep
docker build -t sleepwise/sleep-service:latest .
docker tag sleepwise/sleep-service:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/sleepwise/sleep-service:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/sleepwise/sleep-service:latest

# ... (repetir para family, subscription, analytics)
```

### Crear ECS Task Definitions

Ejemplo para Auth Service (`auth-task-definition.json`):

```json
{
  "family": "sleepwise-auth-service",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "auth-service",
      "image": "<AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/sleepwise/auth-service:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:xxxxx:secret:sleepwise/database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:xxxxx:secret:sleepwise/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/sleepwise-auth-service",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Registrar Task Definitions

```bash
aws ecs register-task-definition --cli-input-json file://auth-task-definition.json
aws ecs register-task-definition --cli-input-json file://sleep-task-definition.json
aws ecs register-task-definition --cli-input-json file://family-task-definition.json
aws ecs register-task-definition --cli-input-json file://subscription-task-definition.json
aws ecs register-task-definition --cli-input-json file://analytics-task-definition.json
```

### Crear ECS Services

```bash
# Crear cluster
aws ecs create-cluster --cluster-name sleepwise-production

# Crear service para auth
aws ecs create-service \
  --cluster sleepwise-production \
  --service-name auth-service \
  --task-definition sleepwise-auth-service \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-yyyyy],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=auth-service,containerPort=3000"

# Repetir para cada servicio
```

---

## 🤖 Configuración de ML Services

### 1. Preparar Modelos Pre-entrenados

```bash
# Crear bucket S3 para modelos
aws s3 mb s3://sleepwise-ml-models

# Subir modelos entrenados
aws s3 cp ml/models/audio_analysis/checkpoints/best_model.pth s3://sleepwise-ml-models/audio_analysis/
aws s3 cp ml/models/predictions/sleep_quality.pth s3://sleepwise-ml-models/predictions/
aws s3 cp ml/models/predictions/apnea_risk.pth s3://sleepwise-ml-models/predictions/
aws s3 cp ml/models/predictions/burnout_risk.pth s3://sleepwise-ml-models/predictions/
```

### 2. Configurar ML Inference Service

`.env` para ML service:

```bash
MODEL_PATH=/app/models
DATABASE_URL=postgresql://sleepwise:PASSWORD@sleepwise-db.xxxxx.us-east-1.rds.amazonaws.com:5432/sleepwise

# AWS S3 para modelos
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
S3_MODELS_BUCKET=sleepwise-ml-models

# Optimizaciones
TORCH_NUM_THREADS=4
OMP_NUM_THREADS=4
```

### 3. Deploy ML Service en ECS

```bash
# Build y push
cd ml/inference
docker build -t sleepwise/ml-inference:latest .
docker tag sleepwise/ml-inference:latest <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/sleepwise/ml-inference:latest
docker push <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/sleepwise/ml-inference:latest

# Crear task definition y service
aws ecs register-task-definition --cli-input-json file://ml-task-definition.json
aws ecs create-service \
  --cluster sleepwise-production \
  --service-name ml-inference \
  --task-definition sleepwise-ml-inference \
  --desired-count 2 \
  --launch-type FARGATE
```

### 4. Configurar Auto-scaling para ML

```bash
# Configurar auto-scaling basado en CPU
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/sleepwise-production/ml-inference \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/sleepwise-production/ml-inference \
  --policy-name ml-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://ml-scaling-policy.json
```

---

## 📱 Despliegue de Mobile App

### Android

#### 1. Configurar Firma de Aplicación

```bash
# Generar keystore
keytool -genkeypair -v -storetype PKCS12 -keystore sleepwise-release.keystore -alias sleepwise -keyalg RSA -keysize 2048 -validity 10000
```

Agregar a `android/gradle.properties`:

```properties
SLEEPWISE_UPLOAD_STORE_FILE=sleepwise-release.keystore
SLEEPWISE_UPLOAD_KEY_ALIAS=sleepwise
SLEEPWISE_UPLOAD_STORE_PASSWORD=your-store-password
SLEEPWISE_UPLOAD_KEY_PASSWORD=your-key-password
```

#### 2. Build de Producción

```bash
cd mobile/android

# Clean
./gradlew clean

# Build release AAB
./gradlew bundleRelease

# El AAB estará en: android/app/build/outputs/bundle/release/app-release.aab
```

#### 3. Subir a Google Play Console

1. Ir a https://play.google.com/console
2. Crear nueva aplicación "SleepWise"
3. Completar información de la tienda
4. Subir AAB en Producción → Crear nueva versión
5. Configurar precio (Gratis) y países
6. Enviar para revisión

### iOS

#### 1. Configurar Xcode

```bash
cd mobile/ios
pod install
open SleepWise.xcworkspace
```

#### 2. Configurar Signing

1. En Xcode, seleccionar proyecto SleepWise
2. Ir a Signing & Capabilities
3. Seleccionar Team
4. Asegurar que Bundle Identifier sea único: `com.sleepwise.app`

#### 3. Build de Producción

```bash
# Archive
xcodebuild -workspace SleepWise.xcworkspace \
  -scheme SleepWise \
  -configuration Release \
  -archivePath build/SleepWise.xcarchive \
  archive

# Export IPA
xcodebuild -exportArchive \
  -archivePath build/SleepWise.xcarchive \
  -exportPath build \
  -exportOptionsPlist ExportOptions.plist
```

#### 4. Subir a App Store Connect

```bash
# Usando Transporter o
xcrun altool --upload-app \
  --type ios \
  --file build/SleepWise.ipa \
  --username "your@email.com" \
  --password "app-specific-password"
```

### Configurar Variables de Producción

`.env.production` en mobile:

```bash
API_URL=https://api.sleepwise.com
WS_URL=wss://api.sleepwise.com
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY_HERE
SENTRY_DSN=https://YOUR_SENTRY_DSN@xxxxx.ingest.sentry.io/xxxxx
ENVIRONMENT=production
```

---

## 🔌 Configuración de Servicios Externos

### AWS S3 CORS Configuration

```bash
aws s3api put-bucket-cors --bucket sleepwise-audio-production --cors-configuration file://cors.json
```

`cors.json`:

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://app.sleepwise.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

### Stripe Webhooks

```bash
# Configurar webhook en https://dashboard.stripe.com/webhooks
# URL: https://api.sleepwise.com/api/subscription/webhook
# Eventos a escuchar:
# - checkout.session.completed
# - customer.subscription.created
# - customer.subscription.updated
# - customer.subscription.deleted
# - invoice.paid
# - invoice.payment_failed
```

### Configure SMTP (SendGrid Example)

```bash
# Crear API Key en SendGrid
# Agregar a variables de entorno:
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### CloudWatch Logs

```bash
# Crear log groups
aws logs create-log-group --log-group-name /ecs/sleepwise-auth-service
aws logs create-log-group --log-group-name /ecs/sleepwise-sleep-service
aws logs create-log-group --log-group-name /ecs/sleepwise-family-service
aws logs create-log-group --log-group-name /ecs/sleepwise-subscription-service
aws logs create-log-group --log-group-name /ecs/sleepwise-analytics-service
aws logs create-log-group --log-group-name /ecs/sleepwise-ml-inference

# Configurar retención (30 días)
aws logs put-retention-policy --log-group-name /ecs/sleepwise-auth-service --retention-in-days 30
```

---

## 📊 Monitoring y Logs

### 1. Configurar CloudWatch Dashboards

```bash
aws cloudwatch put-dashboard --dashboard-name SleepWise-Production --dashboard-body file://dashboard.json
```

`dashboard.json`:

```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", {"stat": "Average"}],
          [".", "MemoryUtilization", {"stat": "Average"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "ECS Resource Usage"
      }
    }
  ]
}
```

### 2. Configurar Alarmas

```bash
# CPU alta
aws cloudwatch put-metric-alarm \
  --alarm-name sleepwise-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2

# Errores de API
aws cloudwatch put-metric-alarm \
  --alarm-name sleepwise-api-errors \
  --alarm-description "Alert on API errors" \
  --metric-name 5XXError \
  --namespace AWS/ApplicationELB \
  --statistic Sum \
  --period 60 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

### 3. Configurar Sentry (Error Tracking)

```bash
# Instalar Sentry en cada servicio
npm install @sentry/node @sentry/tracing

# Configurar en cada servicio
# backend/services/auth/src/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

---

## 🔍 Troubleshooting

### Problema: Servicios no pueden conectar a la base de datos

**Solución:**

```bash
# Verificar security groups
aws ec2 describe-security-groups --group-ids sg-xxxxx

# Asegurar que el security group permite tráfico en puerto 5432
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 5432 \
  --source-group sg-yyyyy
```

### Problema: Imágenes Docker muy grandes

**Solución:**

```dockerfile
# Usar multi-stage builds (ya implementado)
# Limpiar caché de npm
RUN npm ci --only=production && npm cache clean --force
```

### Problema: ML inference es lento

**Solución:**

```bash
# Aumentar recursos del contenedor
# ml-task-definition.json
{
  "cpu": "2048",  # Aumentar de 512 a 2048
  "memory": "4096"  # Aumentar de 1024 a 4096
}

# Habilitar GPU (opcional, requiere instancias con GPU)
{
  "resourceRequirements": [
    {
      "type": "GPU",
      "value": "1"
    }
  ]
}
```

### Problema: Uploads de audio fallan

**Solución:**

```bash
# Verificar permisos S3
aws s3api get-bucket-policy --bucket sleepwise-audio-production

# Verificar CORS
aws s3api get-bucket-cors --bucket sleepwise-audio-production

# Aumentar timeout en nginx
# nginx.conf
client_max_body_size 100M;
proxy_read_timeout 300s;
proxy_send_timeout 300s;
```

### Verificar Health de Servicios

```bash
# Auth Service
curl https://api.sleepwise.com/health

# Sleep Service
curl https://api.sleepwise.com/api/sleep/health

# ML Inference
curl https://api.sleepwise.com/ml/health

# Database
psql -h sleepwise-db.xxxxx.us-east-1.rds.amazonaws.com -U sleepwise -c "SELECT 1"
```

### Logs en Tiempo Real

```bash
# Ver logs de un servicio
aws logs tail /ecs/sleepwise-auth-service --follow

# Filtrar errores
aws logs filter-log-events \
  --log-group-name /ecs/sleepwise-auth-service \
  --filter-pattern "ERROR"
```

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Todas las variables de entorno configuradas
- [ ] Base de datos creada y migraciones ejecutadas
- [ ] S3 buckets creados y configurados
- [ ] Stripe configurado con productos y precios
- [ ] Certificados SSL configurados
- [ ] DNS configurado (api.sleepwise.com, app.sleepwise.com)
- [ ] Secrets almacenados en AWS Secrets Manager
- [ ] Security groups configurados correctamente

### Deployment

- [ ] Imágenes Docker built y pushed a ECR
- [ ] Task definitions registradas
- [ ] ECS services creados
- [ ] Load balancer configurado
- [ ] Auto-scaling configurado
- [ ] CloudWatch alarms configuradas
- [ ] Mobile apps subidas a tiendas

### Post-Deployment

- [ ] Verificar health checks de todos los servicios
- [ ] Probar flujo completo de usuario
- [ ] Verificar uploads de audio a S3
- [ ] Verificar emails de invitación familiar
- [ ] Verificar checkout de Stripe
- [ ] Verificar logs en CloudWatch
- [ ] Configurar backups automáticos de DB
- [ ] Documentar proceso de rollback

---

## 📝 Comandos Útiles

```bash
# Ver estado de todos los servicios
aws ecs list-services --cluster sleepwise-production

# Escalar un servicio
aws ecs update-service \
  --cluster sleepwise-production \
  --service auth-service \
  --desired-count 3

# Rollback a versión anterior
aws ecs update-service \
  --cluster sleepwise-production \
  --service auth-service \
  --task-definition sleepwise-auth-service:previous-version

# Forzar nuevo deployment
aws ecs update-service \
  --cluster sleepwise-production \
  --service auth-service \
  --force-new-deployment

# Backup de base de datos
pg_dump -h sleepwise-db.xxxxx.us-east-1.rds.amazonaws.com \
  -U sleepwise \
  -d sleepwise \
  -F c \
  -f sleepwise_backup_$(date +%Y%m%d).dump
```

---

## 🎯 Próximos Pasos

1. **Configurar CI/CD Pipeline**: Automatizar deployment con GitHub Actions
2. **Implementar Blue-Green Deployment**: Para deployments sin downtime
3. **Configurar CDN**: CloudFront para assets estáticos
4. **Implementar Rate Limiting Global**: API Gateway o CloudFlare
5. **Configurar Disaster Recovery**: Réplicas multi-región
6. **Performance Testing**: Load testing con k6 o Artillery
7. **Security Audit**: Penetration testing y vulnerability scanning

---

## 📞 Soporte

Para problemas de deployment:
- Email: devops@sleepwise.com
- Slack: #deployment-support
- Documentación: https://docs.sleepwise.com/deployment

---

**Última actualización**: 2025-01-17
**Versión**: 1.0.0
