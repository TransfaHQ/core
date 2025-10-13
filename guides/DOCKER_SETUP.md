# Docker Setup Guide for Transfa

This guide explains how to use the Docker configuration for Transfa.

## Quick Start

### Production Mode

```bash
# Copy environment variables
cp .env.example .env

# Edit .env with your settings (optional - defaults work for testing)
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access the application
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:3000
# - API Docs: http://localhost:3000/api-reference
```

### Development Mode (with hot-reload)

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# The application will auto-reload when you make code changes
```

## Services

### Development Setup

The development Docker Compose (`docker-compose.dev.yml`) includes:

1. **PostgreSQL** - Database service on port 5432
2. **TigerBeetle** - Official TigerBeetle container on port 6066
3. **Backend** - NestJS API on port 3000 (with hot-reload)
4. **Frontend** - React app on port 5173 (Vite dev server)

### Production Setup

The production Docker Compose (`docker-compose.yml`) includes:

1. **PostgreSQL** - Database service on port 5432
2. **Backend** - NestJS API on port 3000
3. **Frontend** - React app on port 80 (served via nginx)

**⚠️ Important**: TigerBeetle is **NOT** included in production Docker Compose. You must deploy TigerBeetle separately. See [TIGERBEETLE.md](./TIGERBEETLE.md) for deployment guidance.

## Independent Deployment Model

Transfa is designed for **independent frontend and backend deployment**:

- **Backend**: Pure API server with CORS enabled
- **Frontend**: Static files that can be deployed anywhere
- **Communication**: Frontend makes CORS requests to backend API
- **Configuration**: Use environment variables to configure connections

This means you can:
- Deploy frontend to Vercel, Netlify, Cloudflare Pages, etc.
- Deploy backend to Railway, Render, Fly.io, AWS, etc.
- Use Docker Compose for local development or all-in-one deployment

## Environment Variables

### Backend Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
# Database
DB_USERNAME=transfa
DB_PASSWORD=transfa2025
DB_NAME=transfa

# Authentication (CHANGE IN PRODUCTION!)
ADMIN_SECRET=your_admin_secret_change_in_production
JWT_SECRET=your_jwt_secret_key_change_in_production

# CORS Origins (comma-separated list of allowed frontend URLs)
CORS_ORIGINS=http://localhost:5173,https://yourdomain.com
```

### Frontend Environment Variables

Configure the API backend URL:

```bash
# API Backend URL
VITE_API_URL=http://localhost:3000
```

For Docker Compose, you can set this in the `.env` file. For independent deployments (Vercel, Netlify, etc.), set it in your hosting provider's environment variables.

## TigerBeetle Configuration

### Development

TigerBeetle is automatically included and configured in `docker-compose.dev.yml`:
- Uses official TigerBeetle Docker image (`ghcr.io/tigerbeetle/tigerbeetle`)
- Runs on port 6066
- Data persists in `tigerbeetle_dev_data` volume
- Automatically formats data file on first run

No additional configuration needed for development!

### Production

For production, deploy TigerBeetle separately following one of these methods:

1. **Direct Binary Installation** (recommended)
   - Download from [TigerBeetle releases](https://github.com/tigerbeetle/tigerbeetle/releases)
   - Run as systemd service or supervisor process
   - See [TIGERBEETLE.md](./TIGERBEETLE.md) for detailed guide

2. **Docker Deployment**
   - Use official TigerBeetle image
   - Deploy to separate infrastructure
   - Configure with proper security options

3. **Managed Service**
   - Use TigerBeetle Cloud (if available)
   - Or deploy on Kubernetes/cloud infrastructure

After deploying TigerBeetle, configure your backend:

```bash
# .env file
TIGER_BEETLE_REPLICAS_ADDRESSES=tigerbeetle.example.com:3000
```

For high-availability clusters, list all replica addresses:

```bash
TIGER_BEETLE_REPLICAS_ADDRESSES=node1.example.com:3000,node2.example.com:3000,node3.example.com:3000
```

## Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Rebuild after code changes
docker-compose build
docker-compose up -d

# Clean everything (including volumes)
docker-compose down -v

# Access backend container shell
docker exec -it transfa-backend sh

# Access frontend container shell
docker exec -it transfa-frontend sh
```

## Volumes

Persistent data is stored in Docker volumes:

- `postgres_data` - Database data
- `tigerbeetle_data` - TigerBeetle ledger data

To backup volumes:

```bash
docker run --rm -v transfa_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data
```

## Troubleshooting

### Ports already in use

If you get port conflicts, either:

1. Stop the conflicting service
2. Or edit `docker-compose.yml` to use different ports:

```yaml
ports:
  - "5432:5432" # Change left side: "5433:5432"
```

### Services not starting

Check logs:

```bash
docker-compose logs -f
```

### Database migration issues

Access backend container and run migrations manually:

```bash
docker exec -it transfa-backend sh
npm run db:migrate
```

### Rebuild from scratch

```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Development vs Production

**Development** (`docker-compose.dev.yml`):

- Hot-reload enabled for both frontend and backend
- Source code mounted as volumes
- Separate TigerBeetle container
- More verbose logging

**Production** (`docker-compose.yml`):

- Optimized builds with multi-stage Dockerfiles
- Frontend served via nginx
- TigerBeetle embedded in backend container
- Smaller image sizes

## Next Steps

1. Access the frontend at http://localhost:5173
2. Check API documentation at http://localhost:3000/api-reference
3. Read the main README.md for development guidelines
4. Join the community and contribute!

---

For more information, visit [transfa.com](https://transfa.com)
