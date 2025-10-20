# Local Development Guide

This guide walks you through setting up Transfa for local development without Docker.

## Architecture

Transfa uses a modern monorepo structure with **independent frontend and backend deployments**:

```
core/
├── frontend/          # React + Vite frontend application
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/           # NestJS backend API
│   ├── src/
│   ├── scripts/       # Setup and utility scripts
│   └── package.json
├── docker-compose.yml # Production Docker setup
├── docker-compose.dev.yml # Development Docker setup
├── pnpm-workspace.yaml
└── package.json       # Workspace root
```

### Deployment Flexibility

The frontend and backend are **completely independent** and can be deployed separately:

- **Frontend**: Deploy to any static hosting (Vercel, Netlify, Cloudflare Pages, S3 + CloudFront)
- **Backend**: Deploy to any Node.js hosting (Railway, Render, Fly.io, AWS, DigitalOcean)
- **CORS-enabled**: Backend allows cross-origin requests from configured frontend origins
- **Environment-based configuration**: Use `VITE_API_URL` to point frontend to any backend instance

### Tech Stack

#### Frontend

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible component primitives
- **React Query** - Data fetching and state management
- **React Router** - Client-side routing

#### Backend

- **NestJS** - Node.js framework
- **TypeScript** - Type safety
- **Kysely** - SQL query builder
- **PostgreSQL** - Primary database
- **TigerBeetle** - High-performance accounting engine
- **Swagger/OpenAPI** - API documentation
- **Pino** - Logging

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 22.0.0
- **pnpm** (install globally: `npm install -g pnpm`)
- **PostgreSQL** >= 14
- **TigerBeetle** (automatically downloaded)

## Installation Steps

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/transfahq/core.git
cd core
pnpm install
```

### 2. Set Up PostgreSQL Database

```bash
# Create database
createdb transfa

# Or using psql
psql -U postgres -c "CREATE DATABASE transfa;"
```

### 3. Configure Environment Variables

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Download and Configure TigerBeetle

```bash
cd backend
npm run tb:download      # Downloads TigerBeetle binary
npm run tb:configure:dev # Creates TigerBeetle data file
npm run tb:start:dev     # Starts TigerBeetle (keep running)
```

### 5. Run Database Migrations

```bash
# In a new terminal, from backend directory
npm run db:migrate
```

### 6. Start Development Servers

```bash
# Terminal 1: Start backend (from project root)
pnpm dev:backend

# Terminal 2: Start frontend (from project root)
pnpm dev:frontend
```

## Access the Application

The application will be available at:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-reference

## Development Workflow

### Available Scripts

```bash
# Development
pnpm dev:frontend        # Start frontend dev server
pnpm dev:backend         # Start backend dev server

# Building
pnpm build              # Build all workspaces
pnpm build:frontend     # Build frontend only
pnpm build:backend      # Build backend only

# Testing
pnpm test               # Run all tests
pnpm test:frontend      # Test frontend only
pnpm test:backend       # Test backend only

# Linting
pnpm lint               # Lint all workspaces
pnpm lint:frontend      # Lint frontend only
pnpm lint:backend       # Lint backend only

# Database
pnpm dbgenerate:backend # Generate new migration
```

### Making Changes

1. **Install dependencies**: `pnpm install`
2. **Start development servers**: Follow the installation steps above
3. **Make changes**: Code will auto-reload in development
4. **Run tests**: `pnpm test` before committing
5. **Commit**: Pre-commit hooks will automatically lint your code

### Git Hooks

This project uses Husky for git hooks:

- **Pre-commit**: Automatically runs linting on all workspaces before commits
- Commits are blocked if linting fails

## Testing

```bash
# Run all tests
pnpm test

# Run specific workspace tests
pnpm test:backend
pnpm test:frontend

# Run tests in watch mode (in workspace directory)
cd backend && npm run test:watch
```

## Troubleshooting

### TigerBeetle Connection Issues

If you encounter TigerBeetle connection errors:

1. Ensure TigerBeetle is running: `npm run tb:start:dev` from the backend directory
2. Check that the port (default: 6066) is not already in use
3. Verify `TIGER_BEETLE_REPLICAS_ADDRESSES` in your `.env` file matches the running instance

### Database Migration Issues

If migrations fail:

1. Ensure PostgreSQL is running
2. Verify your database credentials in `.env`
3. Check that the database exists: `psql -l`
4. Try dropping and recreating the database (⚠️ data loss)

### Port Conflicts

If you see "port already in use" errors:

- Frontend default: 5173
- Backend default: 3000
- TigerBeetle default: 6066

Change ports in the respective configuration files or `.env` as needed.

## Next Steps

- Check out the [API Documentation](http://localhost:3000/api-reference) when running locally
- Read the [Docker Setup Guide](./DOCKER_SETUP.md) for containerized development
- See [TigerBeetle Guide](./TIGERBEETLE.md) for production deployment options
