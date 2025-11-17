# Development Guide

This guide covers development workflows, database management, and API documentation for the SleepWise backend services.

## Table of Contents

- [Getting Started](#getting-started)
- [Database Management](#database-management)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Development Workflows](#development-workflows)

## Getting Started

### Prerequisites

- Node.js 20.x or later
- PostgreSQL 15 with TimescaleDB extension
- Redis 7.x
- AWS CLI configured (for local S3 testing with LocalStack)

### Initial Setup

1. **Install dependencies** for all services:
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment variables** for each service:
   ```bash
   # Auth Service
   cp services/auth/.env.example services/auth/.env

   # Sleep Service
   cp services/sleep/.env.example services/sleep/.env

   # Family Service
   cp services/family/.env.example services/family/.env
   ```

3. **Initialize databases**:
   ```bash
   # Auth Service
   cd services/auth
   npm run prisma:migrate
   npm run db:seed

   # Sleep Service
   cd services/sleep
   npm run prisma:migrate
   npm run db:seed

   # Family Service
   cd services/family
   npm run prisma:migrate
   npm run db:seed
   ```

## Database Management

### Prisma Commands

Each service has the following Prisma commands:

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations in development
npm run prisma:migrate

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Seed the database
npm run db:seed
```

### Database Seeding

Database seeders create realistic test data for development:

#### Auth Service Seeds:
- 5 test users with different roles:
  - `admin@sleepwise.app` (ADMIN, Enterprise tier)
  - `john.doe@example.com` (USER, Premium tier)
  - `jane.smith@example.com` (USER, Basic tier)
  - `mike.johnson@company.com` (CORPORATE_ADMIN, Corporate tier)
  - `sarah.wilson@company.com` (USER, Free tier)
- All passwords: `Password123!`
- Sample audit logs

#### Sleep Service Seeds:
- 30 days of sleep sessions for test users
- Realistic sleep phases (AWAKE, LIGHT, DEEP, REM)
- Sleep events (snoring, movement, breathing irregularities)
- Quality scores ranging from 70-100
- Complete sleep metrics

#### Family Service Seeds:
- 2 family groups:
  - "Doe Family" (personal family)
  - "Corporate Wellness Team" (workplace group)
- Family members with different roles
- Pending and accepted invitations
- Group activity logs

### Running Seeds

```bash
# Seed all services
cd services/auth && npm run db:seed
cd services/sleep && npm run db:seed
cd services/family && npm run db:seed

# Or use Prisma's built-in seed command
cd services/auth && npx prisma db seed
```

### Resetting Database

To completely reset and reseed the database:

```bash
cd services/[service-name]

# Drop and recreate database
npx prisma migrate reset

# This will automatically run seeds if configured in package.json
```

## API Documentation

### OpenAPI/Swagger Specifications

Each service has a complete OpenAPI 3.0 specification:

- **Auth Service**: `services/auth/swagger.yaml`
- **Sleep Service**: `services/sleep/swagger.yaml`
- **Family Service**: `services/family/swagger.yaml`

### Viewing API Docs Locally

Use Swagger UI to view the interactive API documentation:

```bash
# Install Swagger UI globally
npm install -g swagger-ui-watcher

# View Auth Service API
swagger-ui-watcher services/auth/swagger.yaml

# View Sleep Service API
swagger-ui-watcher services/sleep/swagger.yaml

# Opens at http://localhost:8000
```

Alternatively, use the online Swagger Editor:
1. Go to https://editor.swagger.io/
2. File → Import URL
3. Paste the raw GitHub URL of the swagger.yaml file

### API Endpoints Overview

#### Auth Service (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /refresh` - Refresh access token
- `GET /validate` - Validate token
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `POST /change-password` - Change password
- `POST /reset-password` - Request password reset
- `POST /verify-email` - Verify email address
- `DELETE /account` - Delete account

#### Sleep Service (`/api/sleep`)
- `POST /sessions` - Start sleep session
- `GET /sessions` - Get session history
- `GET /sessions/:id` - Get session details
- `PATCH /sessions/:id` - End sleep session
- `DELETE /sessions/:id` - Delete session
- `POST /sessions/:id/audio` - Upload audio chunk
- `GET /sessions/:id/analysis` - Get sleep analysis
- `GET /analytics/trends` - Get sleep trends
- `GET /analytics/recommendations` - Get AI recommendations

## Testing

### Running Tests

```bash
# Run all tests with coverage
npm run test

# Watch mode for development
npm run test:watch

# CI mode (used in GitHub Actions)
npm run test:ci
```

### Test Database

Tests use a separate test database configured via `DATABASE_URL` environment variable.

```bash
# Set test database URL
export DATABASE_URL="postgresql://test:test@localhost:5432/sleepwise_test"

# Run migrations for test database
npm run prisma:migrate
```

## Development Workflows

### Starting Development Servers

```bash
# Start all services in development mode
cd backend

# Terminal 1: Auth Service
cd services/auth && npm run dev

# Terminal 2: Sleep Service
cd services/sleep && npm run dev

# Terminal 3: Family Service
cd services/family && npm run dev

# Terminal 4: Subscription Service
cd services/subscription && npm run dev

# Terminal 5: Analytics Service
cd services/analytics && npm run dev
```

### Using Docker Compose

For a complete development environment with all services:

```bash
# From backend directory
docker-compose up -d postgres redis

# Verify services are running
docker-compose ps
```

### Common Development Tasks

#### Creating a New Migration

```bash
cd services/[service-name]

# Make changes to prisma/schema.prisma
# Then create migration
npx prisma migrate dev --name descriptive_migration_name
```

#### Adding a New Endpoint

1. Add route in `src/routes/`
2. Create controller in `src/controllers/`
3. Add tests in `src/__tests__/controllers/`
4. Update OpenAPI spec in `swagger.yaml`
5. Run tests: `npm test`

#### Debugging

All services use Winston for logging. Set log level via environment:

```bash
# In .env file
LOG_LEVEL=debug  # Options: error, warn, info, debug
```

View logs in development:

```bash
npm run dev

# Logs will appear in console and logs/app.log
```

### Code Quality

#### Linting

```bash
# Run ESLint
npm run lint

# Auto-fix issues
npm run lint:fix
```

#### Type Checking

```bash
# TypeScript type check
tsc --noEmit
```

## Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Check connection
psql $DATABASE_URL

# View active connections
psql -d sleepwise_dev -c "SELECT * FROM pg_stat_activity;"
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3001  # Replace with your port

# Kill process
kill -9 [PID]
```

### Prisma Client Out of Sync

```bash
# Regenerate Prisma Client
npm run prisma:generate

# If issues persist, clean and reinstall
rm -rf node_modules/.prisma
npm run prisma:generate
```

### Clear Redis Cache

```bash
# Connect to Redis
redis-cli

# Clear all keys
FLUSHALL

# Or clear specific pattern
KEYS "sleep:*"
DEL key1 key2 key3
```

## Performance Tips

### Database Query Optimization

1. Use Prisma's `include` sparingly
2. Implement pagination for large datasets
3. Add database indexes for frequently queried fields
4. Use `select` to limit returned fields

### Caching Strategy

1. Cache frequently accessed data in Redis
2. Set appropriate TTL values
3. Invalidate cache on data updates
4. Use cache warming for predictable access patterns

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [TimescaleDB Guide](https://docs.timescale.com/)
- [OpenAPI Specification](https://swagger.io/specification/)

## Getting Help

- Check GitHub Issues
- Review API documentation
- Contact: dev@sleepwise.app
