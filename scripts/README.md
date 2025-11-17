# 🛠️ Scripts de SleepWise

Colección de scripts útiles para desarrollo, deployment y mantenimiento de SleepWise.

## 📋 Scripts Disponibles

### setup.sh
**Propósito**: Configuración inicial del proyecto

**Uso**:
```bash
./setup.sh
```

**Qué hace**:
- Verifica prerequisites (Node.js, Docker, Python)
- Instala dependencias de todos los servicios
- Genera cliente Prisma
- Crea archivos `.env` de plantilla

**Cuándo usar**: Primera vez que clonas el proyecto, o después de `git clean`

---

### deploy-production.sh
**Propósito**: Deployment automatizado a producción en AWS ECS

**Uso**:
```bash
# Deployment completo
./deploy-production.sh deploy

# Rollback a versión anterior
./deploy-production.sh rollback
```

**Variables de entorno requeridas**:
```bash
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID="123456789012"
export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."  # Opcional
```

**Qué hace**:
1. Ejecuta tests
2. Build de imágenes Docker
3. Push a ECR
4. Actualiza servicios ECS
5. Espera estabilización
6. Ejecuta smoke tests
7. Registra deployment
8. Envía notificación Slack (opcional)

**Cuándo usar**: Para deployments a producción

---

### deploy.sh (Legacy - del docker-compose.yml)
**Propósito**: Deployment legacy usando docker-compose

**Uso**:
```bash
./deploy.sh
```

**Qué hace**:
- Ejecuta tests
- Build con docker-compose
- Actualiza servicios
- Ejecuta migraciones

**Cuándo usar**: Environments de staging/desarrollo

---

## 🚀 Workflows Comunes

### Primera Configuración

```bash
# 1. Clonar repositorio
git clone https://github.com/sleepwise/app.git
cd app

# 2. Ejecutar setup
./scripts/setup.sh

# 3. Configurar variables de entorno
# Editar archivos .env en cada servicio

# 4. Iniciar servicios localmente
docker-compose up -d
```

### Desarrollo Local

```bash
# Iniciar base de datos
docker-compose up -d postgres

# Iniciar un servicio específico en modo desarrollo
cd backend/services/auth
npm run dev

# En otra terminal, iniciar mobile app
cd mobile
npm run ios  # o npm run android
```

### Deployment a Staging

```bash
# Usando docker-compose (staging)
./scripts/deploy.sh

# Verificar deployment
curl https://staging-api.sleepwise.com/health
```

### Deployment a Producción

```bash
# Configurar AWS CLI
aws configure

# Exportar variables
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION="us-east-1"

# Deploy
./scripts/deploy-production.sh deploy

# Si algo sale mal, rollback
./scripts/deploy-production.sh rollback
```

### Actualizar Base de Datos

```bash
# Crear nueva migración
cd backend/shared/prisma
npx prisma migrate dev --name add_new_feature

# Aplicar en producción
npx prisma migrate deploy
```

### Backup de Base de Datos

```bash
# Backup local
pg_dump -h localhost -U sleepwise sleepwise > backup_$(date +%Y%m%d).sql

# Backup desde RDS
pg_dump -h sleepwise-db.xxxxx.us-east-1.rds.amazonaws.com \
  -U sleepwise \
  sleepwise \
  -F c \
  -f sleepwise_backup_$(date +%Y%m%d).dump

# Upload a S3
aws s3 cp sleepwise_backup_$(date +%Y%m%d).dump \
  s3://sleepwise-backups/db/
```

### Logs de Producción

```bash
# Ver logs en tiempo real
aws logs tail /ecs/sleepwise-auth-service --follow

# Filtrar errores
aws logs filter-log-events \
  --log-group-name /ecs/sleepwise-auth-service \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000
```

### Scaling de Servicios

```bash
# Escalar manualmente
aws ecs update-service \
  --cluster sleepwise-production \
  --service auth-service \
  --desired-count 5

# Ver estado
aws ecs describe-services \
  --cluster sleepwise-production \
  --services auth-service
```

---

## 🔧 Troubleshooting

### Script falla en "Building images"

**Problema**: Docker build falla

**Solución**:
```bash
# Limpiar cache de Docker
docker system prune -af

# Verificar Dockerfile
docker build -t test ./backend/services/auth

# Ver logs detallados
docker build --progress=plain -t test ./backend/services/auth
```

### Script falla en "Pushing to ECR"

**Problema**: No autenticado en ECR

**Solución**:
```bash
# Re-autenticar
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
```

### Servicios no arrancan después de deployment

**Problema**: Task definition incorrecta o falta secrets

**Solución**:
```bash
# Verificar task definition
aws ecs describe-task-definition \
  --task-definition sleepwise-auth-service

# Verificar secrets en Secrets Manager
aws secretsmanager list-secrets \
  --query 'SecretList[?contains(Name, `sleepwise`)]'

# Ver logs de startup
aws logs tail /ecs/sleepwise-auth-service --follow
```

### Rollback no funciona

**Problema**: No hay versión anterior

**Solución**:
```bash
# Listar task definitions
aws ecs list-task-definitions \
  --family-prefix sleepwise-auth-service

# Actualizar manualmente a versión específica
aws ecs update-service \
  --cluster sleepwise-production \
  --service auth-service \
  --task-definition sleepwise-auth-service:42
```

---

## 📝 Buenas Prácticas

### Antes de Deployment

- [ ] Ejecutar tests localmente: `npm test`
- [ ] Verificar cambios: `git diff`
- [ ] Actualizar CHANGELOG.md
- [ ] Crear tag de versión: `git tag v1.2.3`
- [ ] Notificar al equipo en Slack

### Durante Deployment

- [ ] Monitorear logs en CloudWatch
- [ ] Verificar métricas en Grafana
- [ ] Ejecutar smoke tests
- [ ] Verificar health checks

### Después de Deployment

- [ ] Actualizar documentación si es necesario
- [ ] Marcar issues/tickets como resueltos
- [ ] Enviar release notes
- [ ] Monitorear por 30 minutos

---

## 🔐 Seguridad

### Secrets

**NUNCA commits secrets en scripts**. Usar:

1. **AWS Secrets Manager**:
```bash
aws secretsmanager create-secret \
  --name sleepwise/database-url \
  --secret-string "postgresql://..."
```

2. **Variables de entorno**:
```bash
export JWT_SECRET=$(openssl rand -hex 32)
```

3. **`.env` files** (gitignored):
```bash
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env.production
```

### Permisos IAM

Mínimos permisos requeridos para deployment:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 📞 Soporte

- **Issues**: GitHub Issues
- **Slack**: #devops-support
- **Email**: devops@sleepwise.com

---

**Última actualización**: 2025-01-17
