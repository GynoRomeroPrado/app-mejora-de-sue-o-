# SleepWise API Documentation

Documentación completa de la API REST de SleepWise.

## 🚀 Inicio Rápido

### URLs Base

```
Production:  https://api.sleepwise.app/v1
Staging:     https://api-staging.sleepwise.app/v1
Development: http://localhost:3000/api/v1
```

### Autenticación

Todos los endpoints protegidos requieren un JWT token en el header:

```http
Authorization: Bearer {your-jwt-token}
```

### Obtener un Token

```bash
curl -X POST https://api.sleepwise.app/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tu-email@example.com",
    "password": "tupassword"
  }'
```

Respuesta:
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## 📚 Documentación Interactiva

La documentación completa está disponible en formato OpenAPI 3.0:

- **Swagger UI**: https://api.sleepwise.app/docs
- **ReDoc**: https://api.sleepwise.app/redoc
- **OpenAPI Spec**: [openapi.yaml](./openapi.yaml)

## 🔑 Endpoints Principales

### Autenticación

#### Registrar Usuario
```http
POST /auth/register
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "Password123!",
  "name": "Juan Pérez"
}
```

#### Iniciar Sesión
```http
POST /auth/login
Content-Type: application/json

{
  "email": "usuario@example.com",
  "password": "Password123!"
}
```

#### Cerrar Sesión
```http
POST /auth/logout
Authorization: Bearer {token}
```

### Sesiones de Sueño

#### Iniciar Sesión de Sueño
```http
POST /sleep/sessions/start
Authorization: Bearer {token}
```

#### Detener Sesión de Sueño
```http
POST /sleep/sessions/{sessionId}/stop
Authorization: Bearer {token}
```

#### Obtener Sesiones
```http
GET /sleep/sessions?limit=30&offset=0
Authorization: Bearer {token}
```

#### Upload de Audio
```http
POST /sleep/sessions/{sessionId}/audio
Authorization: Bearer {token}
Content-Type: application/json

{
  "chunkData": "base64_encoded_audio",
  "chunkIndex": 0
}
```

### Analytics

#### Obtener Analytics
```http
GET /sleep/analytics?period=week
Authorization: Bearer {token}
```

Períodos disponibles: `week`, `month`, `year`

#### Obtener Insights
```http
GET /sleep/insights
Authorization: Bearer {token}
```

#### Comparar con Promedios
```http
GET /sleep/sessions/{sessionId}/compare
Authorization: Bearer {token}
```

### Subscripciones

#### Obtener Planes
```http
GET /subscriptions/plans
```

#### Crear Checkout
```http
POST /subscriptions/checkout
Authorization: Bearer {token}
Content-Type: application/json

{
  "priceId": "price_xxxxx",
  "successUrl": "https://app.sleepwise.com/success",
  "cancelUrl": "https://app.sleepwise.com/cancel",
  "tier": "PREMIUM",
  "billingPeriod": "monthly"
}
```

#### Gestionar Suscripción
```http
POST /subscriptions/portal
Authorization: Bearer {token}
Content-Type: application/json

{
  "returnUrl": "https://app.sleepwise.com/settings"
}
```

### Machine Learning

#### Analizar Audio
```http
POST /ml/analyze/audio
Authorization: Bearer {token}
Content-Type: multipart/form-data

sessionId: {uuid}
audio_file: [binary]
```

#### Predecir Calidad del Sueño
```http
POST /ml/predict/sleep-quality
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "{uuid}",
  "historicalData": [...]
}
```

## 📊 Formatos de Respuesta

### Respuesta Exitosa
```json
{
  "success": true,
  "data": {
    // Datos de respuesta
  },
  "message": "Optional message"
}
```

### Respuesta de Error
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      // Optional additional details
    }
  }
}
```

## 🚦 Códigos de Estado HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado |
| 400 | Bad Request - Error de validación |
| 401 | Unauthorized - No autenticado |
| 402 | Payment Required - Requiere suscripción premium |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no encontrado |
| 409 | Conflict - Recurso ya existe |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Error del servidor |

## 🔒 Rate Limiting

Para proteger la API, implementamos rate limiting:

- **General**: 100 requests por 15 minutos
- **Auth endpoints**: 10 requests por 15 minutos
- **ML endpoints**: 50 requests por hora

Headers de respuesta:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

## 🔐 Seguridad

### HTTPS
Todas las comunicaciones deben usar HTTPS en producción.

### JWT Tokens
- **Access Token**: Válido por 15 minutos
- **Refresh Token**: Válido por 7 días

### Renovar Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### Headers de Seguridad
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

## 📦 Paginación

Endpoints que retornan listas soportan paginación:

```http
GET /sleep/sessions?limit=30&offset=0
```

Parámetros:
- `limit`: Número de items por página (máx: 100)
- `offset`: Número de items a saltar

Respuesta:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 150,
    "page": 1,
    "pageSize": 30,
    "hasMore": true
  }
}
```

## 🌐 Internacionalización

La API soporta múltiples idiomas a través del header:

```http
Accept-Language: es-ES
```

Idiomas soportados:
- `es-ES`: Español
- `en-US`: Inglés
- `pt-BR`: Portugués

## 📱 SDKs

### JavaScript/TypeScript
```bash
npm install @sleepwise/sdk
```

```typescript
import { SleepWiseClient } from '@sleepwise/sdk';

const client = new SleepWiseClient({
  apiKey: 'your-api-key',
  environment: 'production'
});

// Login
const { user, token } = await client.auth.login({
  email: 'user@example.com',
  password: 'password'
});

// Start sleep session
const session = await client.sleep.startSession();
```

### Python
```bash
pip install sleepwise-sdk
```

```python
from sleepwise import SleepWiseClient

client = SleepWiseClient(
    api_key="your-api-key",
    environment="production"
)

# Login
user, token = client.auth.login(
    email="user@example.com",
    password="password"
)

# Start sleep session
session = client.sleep.start_session()
```

## 🔍 Filtrado y Búsqueda

### Filtros de Fecha
```http
GET /sleep/sessions?startDate=2024-01-01&endDate=2024-01-31
```

### Ordenamiento
```http
GET /sleep/sessions?sortBy=startTime&order=desc
```

Campos disponibles: `startTime`, `sleepScore`, `duration`, `createdAt`
Orden: `asc`, `desc`

## 📈 Webhooks

Configura webhooks para recibir eventos en tiempo real:

### Eventos Disponibles
- `sleep.session.completed` - Sesión de sueño completada
- `sleep.analysis.ready` - Análisis de IA completado
- `subscription.updated` - Suscripción actualizada
- `subscription.cancelled` - Suscripción cancelada

### Configurar Webhook
```http
POST /webhooks
Authorization: Bearer {token}
Content-Type: application/json

{
  "url": "https://your-app.com/webhooks/sleepwise",
  "events": ["sleep.session.completed", "sleep.analysis.ready"]
}
```

### Formato del Payload
```json
{
  "event": "sleep.session.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "sessionId": "uuid",
    "userId": "uuid",
    "sleepScore": 85
  }
}
```

## 🧪 Entorno de Testing

### Credenciales de Prueba
```
Email: test@sleepwise.app
Password: Test123!
```

### API Keys de Prueba
```
Test Key: sk_test_xxxxxxxxxxxxxxxxxxxx
Production Key: sk_live_xxxxxxxxxxxxxxxxxxxx
```

## 💡 Mejores Prácticas

1. **Cachea respuestas** cuando sea apropiado
2. **Implementa retry logic** con backoff exponencial
3. **Valida datos** antes de enviar
4. **Maneja errores** apropiadamente
5. **Usa webhooks** para notificaciones en tiempo real
6. **Monitorea rate limits** y ajusta tu lógica

## 🆘 Soporte

- **Email**: api-support@sleepwise.app
- **Slack**: [sleepwise-developers.slack.com](https://sleepwise-developers.slack.com)
- **Status Page**: [status.sleepwise.app](https://status.sleepwise.app)
- **GitHub Issues**: [github.com/sleepwise/api/issues](https://github.com/sleepwise/api/issues)

## 📝 Changelog

Ver [CHANGELOG.md](../../CHANGELOG.md) para el historial completo de cambios.

## 📄 Licencia

Proprietary - Todos los derechos reservados © 2024 SleepWise

---

**Última actualización**: 2024-01-15
**Versión de API**: v1.0.0
