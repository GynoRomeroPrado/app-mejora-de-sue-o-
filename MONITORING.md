# 📊 Guía de Monitoreo - SleepWise

Guía completa para configurar y usar el sistema de monitoreo de SleepWise.

## 📋 Tabla de Contenidos

1. [Métricas Clave](#métricas-clave)
2. [CloudWatch](#cloudwatch)
3. [Prometheus y Grafana](#prometheus-y-grafana)
4. [Alertas](#alertas)
5. [Logs](#logs)
6. [Dashboards](#dashboards)

---

## 📈 Métricas Clave

### Métricas de Infraestructura

| Métrica | Descripción | Umbral Crítico |
|---------|-------------|----------------|
| CPU Utilization | Uso de CPU de contenedores ECS | > 80% |
| Memory Utilization | Uso de memoria de contenedores | > 85% |
| Disk Usage | Espacio en disco RDS | > 80% |
| Network I/O | Tráfico de red | N/A |
| Container Restarts | Reinícios de contenedores | > 3 en 5min |

### Métricas de Aplicación

| Métrica | Descripción | Umbral Crítico |
|---------|-------------|----------------|
| Request Rate | Requests por segundo | N/A |
| Error Rate | Errores 5xx | > 1% |
| Response Time | Latencia P95 | > 1000ms |
| Active Users | Usuarios activos concurrentes | N/A |
| Audio Upload Success | Tasa de éxito de uploads | < 95% |

### Métricas de Base de Datos

| Métrica | Descripción | Umbral Crítico |
|---------|-------------|----------------|
| Connections | Conexiones activas | > 80% del max |
| Query Duration | Duración de queries P95 | > 500ms |
| Replication Lag | Lag de réplicas | > 30s |
| Deadlocks | Deadlocks por minuto | > 0 |

### Métricas de ML

| Métrica | Descripción | Umbral Crítico |
|---------|-------------|----------------|
| Inference Latency | Tiempo de inferencia P95 | > 30s |
| Model Accuracy | Precisión del modelo | < 85% |
| Queue Length | Cola de procesamiento | > 100 |
| GPU Utilization | Uso de GPU (si aplica) | > 90% |

---

## ☁️ CloudWatch

### Crear Namespace Personalizado

```bash
# Publicar métrica personalizada
aws cloudwatch put-metric-data \
  --namespace SleepWise/Production \
  --metric-name AudioUploadSuccess \
  --value 1 \
  --dimensions Service=SleepService
```

### Métricas Personalizadas en el Código

**Backend (Node.js)**:

```typescript
import { CloudWatch } from 'aws-sdk';

const cloudwatch = new CloudWatch({ region: 'us-east-1' });

export async function recordMetric(
  metricName: string,
  value: number,
  unit: string = 'Count'
) {
  try {
    await cloudwatch.putMetricData({
      Namespace: 'SleepWise/Production',
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Timestamp: new Date(),
          Dimensions: [
            {
              Name: 'Service',
              Value: process.env.SERVICE_NAME || 'Unknown',
            },
          ],
        },
      ],
    }).promise();
  } catch (error) {
    console.error('Failed to record metric:', error);
  }
}

// Uso
await recordMetric('AudioUploadSuccess', 1);
await recordMetric('AudioUploadDuration', duration, 'Milliseconds');
```

### Dashboard CloudWatch

Crear dashboard con AWS CLI:

```bash
cat > cloudwatch-dashboard.json << 'EOF'
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ECS", "CPUUtilization", {"stat": "Average"}],
          [".", "MemoryUtilization", {"stat": "Average"}]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "us-east-1",
        "title": "ECS Resources",
        "period": 300
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/ApplicationELB", "TargetResponseTime", {"stat": "p95"}],
          [".", "RequestCount", {"stat": "Sum"}]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "us-east-1",
        "title": "API Performance",
        "period": 60
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/RDS", "DatabaseConnections", {"stat": "Average"}],
          [".", "ReadLatency", {"stat": "Average"}],
          [".", "WriteLatency", {"stat": "Average"}]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "us-east-1",
        "title": "Database Metrics",
        "period": 300
      }
    }
  ]
}
EOF

aws cloudwatch put-dashboard \
  --dashboard-name SleepWise-Production \
  --dashboard-body file://cloudwatch-dashboard.json
```

---

## 📊 Prometheus y Grafana

### Instalación con Docker Compose

```yaml
# monitoring/docker-compose.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    ports:
      - "9090:9090"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3000:3000"
    restart: unless-stopped
    depends_on:
      - prometheus

  node-exporter:
    image: prom/node-exporter:latest
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    ports:
      - "9100:9100"
    restart: unless-stopped

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    environment:
      DATA_SOURCE_NAME: "postgresql://sleepwise:password@postgres:5432/sleepwise?sslmode=disable"
    ports:
      - "9187:9187"
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

### Configuración de Prometheus

```yaml
# monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'sleepwise-production'
    environment: 'production'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - 'alertmanager:9093'

rule_files:
  - "alerts/*.yml"

scrape_configs:
  # Node Exporter
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  # PostgreSQL Exporter
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Auth Service
  - job_name: 'auth-service'
    static_configs:
      - targets: ['auth-service:3000']
    metrics_path: '/metrics'

  # Sleep Service
  - job_name: 'sleep-service'
    static_configs:
      - targets: ['sleep-service:3002']
    metrics_path: '/metrics'

  # ML Inference
  - job_name: 'ml-inference'
    static_configs:
      - targets: ['ml-inference:8000']
    metrics_path: '/metrics'
```

### Instrumentar Aplicación con Prometheus

**Backend (Node.js + Express)**:

```typescript
// backend/services/auth/src/middleware/metrics.ts
import promClient from 'prom-client';
import express from 'express';

const register = new promClient.Registry();

// Default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
});

export const audioUploadDuration = new promClient.Histogram({
  name: 'audio_upload_duration_seconds',
  help: 'Duration of audio uploads',
  buckets: [1, 5, 10, 30, 60, 120],
  registers: [register],
});

// Middleware
export function metricsMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;

    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .observe(duration);

    httpRequestTotal
      .labels(req.method, req.route?.path || req.path, res.statusCode.toString())
      .inc();
  });

  next();
}

// Metrics endpoint
export function metricsHandler(req: express.Request, res: express.Response) {
  res.set('Content-Type', register.contentType);
  register.metrics().then((metrics) => {
    res.end(metrics);
  });
}
```

**ML Service (Python + FastAPI)**:

```python
# ml/inference/metrics.py
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from prometheus_client import CONTENT_TYPE_LATEST

# Metrics
inference_duration = Histogram(
    'ml_inference_duration_seconds',
    'Duration of ML inference',
    ['model_type']
)

inference_total = Counter(
    'ml_inference_total',
    'Total number of inferences',
    ['model_type', 'status']
)

model_accuracy = Gauge(
    'ml_model_accuracy',
    'Model accuracy score',
    ['model_type']
)

queue_length = Gauge(
    'ml_queue_length',
    'Length of processing queue'
)

# FastAPI endpoint
from fastapi import Response

@app.get("/metrics")
async def metrics():
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )

# Usage
@inference_duration.labels(model_type='audio_analysis').time()
async def analyze_audio(audio_data):
    # ... inference code
    pass
```

### Dashboards de Grafana

**Dashboard de Sistema**:

```json
{
  "dashboard": {
    "title": "SleepWise - System Overview",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (service)"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status_code=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))"
          }
        ]
      },
      {
        "title": "Response Time (P95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

---

## 🚨 Alertas

### Reglas de Alertas en Prometheus

```yaml
# monitoring/prometheus/alerts/app-alerts.yml
groups:
  - name: sleepwise_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m]))
          > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # High response time
      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket[5m])
          ) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "P95 response time is {{ $value }}s"

      # Service down
      - alert: ServiceDown
        expr: up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.job }} has been down for more than 2 minutes"

      # High CPU usage
      - alert: HighCPUUsage
        expr: |
          100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value | humanize }}%"

      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value | humanize }}%"

      # Database connection pool exhaustion
      - alert: DatabaseConnectionPoolExhausted
        expr: |
          pg_stat_database_numbackends / pg_settings_max_connections > 0.8
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool nearly exhausted"
          description: "{{ $value | humanizePercentage }} of connections in use"

      # ML inference slow
      - alert: MLInferenceSlow
        expr: |
          histogram_quantile(0.95,
            rate(ml_inference_duration_seconds_bucket[5m])
          ) > 30
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "ML inference is slow"
          description: "P95 inference time is {{ $value }}s"
```

### Configurar Alertmanager

```yaml
# monitoring/alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

route:
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
      continue: true
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#sleepwise-alerts'
        title: 'SleepWise Alert'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'critical-alerts'
    slack_configs:
      - channel: '#sleepwise-critical'
        title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'

  - name: 'warning-alerts'
    slack_configs:
      - channel: '#sleepwise-alerts'
        title: '⚠️ Warning: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

---

## 📝 Logs

### Estructura de Logs

**Formato estándar (JSON)**:

```json
{
  "timestamp": "2025-01-17T10:30:45.123Z",
  "level": "info",
  "service": "auth-service",
  "message": "User logged in",
  "userId": "usr_123",
  "requestId": "req_456",
  "duration": 145,
  "metadata": {
    "ip": "192.168.1.1",
    "userAgent": "SleepWise-iOS/1.0.0"
  }
}
```

### Logging en Backend (Winston)

```typescript
// backend/shared/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: process.env.SERVICE_NAME || 'unknown',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // CloudWatch
    new WinstonCloudWatch({
      logGroupName: `/ecs/${process.env.SERVICE_NAME}`,
      logStreamName: `${process.env.HOSTNAME}-${new Date().toISOString().split('T')[0]}`,
      awsRegion: process.env.AWS_REGION,
    }),
  ],
});

export default logger;

// Usage
logger.info('User logged in', {
  userId: user.id,
  requestId: req.id,
  duration: Date.now() - start,
});

logger.error('Failed to process audio', {
  error: error.message,
  stack: error.stack,
  sessionId: session.id,
});
```

### Consultas de Logs en CloudWatch Insights

```sql
-- Errores en las últimas 24 horas
fields @timestamp, level, message, error
| filter level = "error"
| sort @timestamp desc
| limit 100

-- Requests lentos (> 1s)
fields @timestamp, message, duration, route
| filter duration > 1000
| sort duration desc
| limit 50

-- Tasa de errores por servicio
fields service, level
| filter level = "error"
| stats count() by service
| sort count() desc

-- Audio uploads fallidos
fields @timestamp, sessionId, error
| filter message like /audio upload failed/
| sort @timestamp desc
```

---

## 📊 KPIs y SLAs

### Service Level Objectives (SLOs)

| Servicio | Métrica | SLO | Medición |
|----------|---------|-----|----------|
| API | Availability | 99.9% | Uptime |
| API | Latency (P95) | < 500ms | Response time |
| API | Error Rate | < 0.1% | 5xx errors |
| Audio Upload | Success Rate | > 99% | Successful uploads |
| ML Inference | Latency (P95) | < 30s | Processing time |
| Database | Latency (P95) | < 100ms | Query time |

### Cálculo de SLI (Service Level Indicator)

```promql
# Availability (últimas 30 días)
sum(up) / count(up) * 100

# Success rate
sum(rate(http_requests_total{status_code!~"5.."}[30d]))
/
sum(rate(http_requests_total[30d]))
* 100

# P95 latency
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket[30d])
)
```

---

## 🔧 Troubleshooting

### Investigar Incidente

1. **Verificar Dashboard General**
   - Ir a Grafana → SleepWise Overview
   - Identificar servicios afectados

2. **Revisar Logs**
   ```bash
   # Ver logs recientes de un servicio
   aws logs tail /ecs/sleepwise-auth-service --follow --since 10m
   ```

3. **Verificar Métricas**
   ```bash
   # Query Prometheus
   curl 'http://prometheus:9090/api/v1/query?query=up{job="auth-service"}'
   ```

4. **Verificar Health de Servicios**
   ```bash
   # Script de health check
   for service in auth sleep family subscription analytics ml; do
     echo "Checking ${service}..."
     curl -sf https://api.sleepwise.com/${service}/health || echo "FAILED"
   done
   ```

---

## 📚 Recursos Adicionales

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [AWS ECS Monitoring](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cloudwatch-metrics.html)

---

**Última actualización**: 2025-01-17
