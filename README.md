<div align="center">
<img width="auto" height="36" alt="Group 5" src="https://github.com/user-attachments/assets/6be00fca-aa64-447d-b416-4f4b6a87746b" />


**Open-Source Ledger Infrastructure for Financial Applications**


[Website](https://transfa.com) • [Documentation](#documentation) • [Contributing](#contributing)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./backend/LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)

</div>

---

## Overview

Transfa is an open-source ledger infrastructure platform designed for companies that need full control over their financial data infrastructure. Built on [TigerBeetle](https://tigerbeetle.com) for high-performance transaction processing, Transfa provides a self-hostable alternative to third-party financial infrastructure services.

### Key Features

- **🚀 High Performance**: Built on TigerBeetle for ultra-fast transaction processing
- **🔒 Self-Hosted**: Full control over your financial data infrastructure
- **📊 Complete Auditability**: Full transaction history and audit trails
- **🔓 Zero Vendor Lock-In**: Own and control your entire financial stack
- **📱 Dashboard**: Built-in management dashboard and tools
- **🔐 Secure**: Industry-standard security practices and encryption

## Table of Contents

- [Quick Start](#quick-start)
  - [Using Docker (Recommended)](#using-docker-recommended)
  - [Manual Setup](#manual-setup)
- [Architecture](#architecture)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Quick Start

### Using Docker (Recommended)

The fastest way to get Transfa up and running:

```bash
# Clone the repository
git clone https://github.com/yourusername/transfa-core.git
cd transfa-core

# Start all services with Docker Compose
docker-compose up -d

# Wait for services to be ready (about 30 seconds)
# Access the application:
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:3000
# - API Documentation: http://localhost:3000/api-reference
```

For development with hot-reload:

```bash
docker-compose -f docker-compose.dev.yml up
```

You can find the full docker setup guide [here](./guides/DOCKER_SETUP.md).
### Manual Setup

#### Prerequisites

- **Node.js** >= 22.0.0
- **pnpm** (install globally: `npm install -g pnpm`)
- **PostgreSQL** >= 14
- **TigerBeetle** (automatically downloaded)

#### Installation Steps

1. **Clone and Install Dependencies**

```bash
git clone https://github.com/yourusername/transfa-core.git
cd transfa-core
pnpm install
```

2. **Set Up PostgreSQL Database**

```bash
# Create database
createdb transfa

# Or using psql
psql -U postgres -c "CREATE DATABASE transfa;"
```

3. **Configure Environment Variables**

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials
```

4. **Download and Configure TigerBeetle**

```bash
cd backend
npm run tb:download      # Downloads TigerBeetle binary
npm run tb:configure:dev # Creates TigerBeetle data file
npm run tb:start:dev     # Starts TigerBeetle (keep running)
```

5. **Run Database Migrations**

```bash
# In a new terminal, from backend directory
npm run db:migrate
```

6. **Start Development Servers**

```bash
# Terminal 1: Start backend (from project root)
pnpm dev:backend

# Terminal 2: Start frontend (from project root)
pnpm dev:frontend
```

The application will be available at:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api-reference

## Architecture

Transfa uses a modern monorepo structure with **independent frontend and backend deployments**:

```
transfa-core/
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
- **TypeORM** - Database ORM
- **PostgreSQL** - Primary database
- **TigerBeetle** - High-performance accounting engine
- **Swagger/OpenAPI** - API documentation
- **Pino** - Logging

## Development

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

### Development Workflow

1. **Install dependencies**: `pnpm install`
2. **Start development servers**: Use Docker Compose or manual setup
3. **Make changes**: Code will auto-reload in development
4. **Run tests**: `pnpm test` before committing
5. **Commit**: Pre-commit hooks will automatically lint your code

### Git Hooks

This project uses Husky for git hooks:

- **Pre-commit**: Automatically runs linting on all workspaces before commits
- Commits are blocked if linting fails

## API Documentation

The backend API is fully documented using OpenAPI/Swagger:

- **Interactive Documentation**: http://localhost:3000/api-reference (when running)
- **OpenAPI JSON**: http://localhost:3000/apidocs-json

### Example API Usage

```typescript
// Create a ledger account
POST /api/accounts
{
  "name": "Customer Deposits",
  "code": "CUST_DEP_001",
  "type": "asset"
}

// Create a transaction
POST /api/transactions
{
  "entries": [
    { "accountId": "...", "debit": "100.00" },
    { "accountId": "...", "credit": "100.00" }
  ]
}
```

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

## Deployment

### TigerBeetle Deployment

**⚠️ Important**: For production deployments, TigerBeetle should be deployed separately from the backend for optimal performance and reliability.

See **[TIGERBEETLE.md](./guides/TIGERBEETLE.md)** for comprehensive TigerBeetle deployment guidance, including:
- Direct binary installation (recommended)
- Docker deployment
- High-availability multi-node clusters
- Configuration and monitoring

**Quick TigerBeetle Setup**:
```bash
# Download and install TigerBeetle
wget https://github.com/tigerbeetle/tigerbeetle/releases/download/0.16.58/tigerbeetle-x86_64-linux.zip
unzip tigerbeetle-x86_64-linux.zip && chmod +x tigerbeetle

# Format and start
./tigerbeetle format --cluster=0 --replica=0 --replica-count=1 data/0_0.tigerbeetle
./tigerbeetle start --addresses=0.0.0.0:3000 data/0_0.tigerbeetle
```

Then configure your backend to connect:
```bash
TIGER_BEETLE_REPLICAS_ADDRESSES=your-tigerbeetle-host:3000
```

### Docker Deployment

**Development**: Includes TigerBeetle container
```bash
docker-compose -f docker-compose.dev.yml up
```

**Production**: Requires external TigerBeetle deployment
```bash
# Set TigerBeetle address in .env
TIGER_BEETLE_REPLICAS_ADDRESSES=tigerbeetle.example.com:3000

# Start backend and frontend only
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment Variables

#### Backend Environment Variables

Key environment variables for the backend:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=transfa
DB_PASSWORD=your_secure_password
DB_NAME=transfa

# TigerBeetle
TIGER_BEETLE_CLUSTER_ID=0
TIGER_BEETLE_REPLICAS_ADDRESSES=127.0.0.1:6066

# Authentication
ADMIN_SECRET=your_admin_secret
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# CORS Configuration (comma-separated list of allowed origins)
CORS_ORIGINS=http://localhost:5173,https://yourdomain.com

# Optional
DB_ENABLE_LOGGING=false
PORT=3000
```

#### Frontend Environment Variables

Configure the frontend to connect to your backend API:

```bash
# API Backend URL
# For local development: http://localhost:3000
# For production: https://api.yourdomain.com
VITE_API_URL=http://localhost:3000
```

### Independent Deployment Examples

**Example 1: Frontend on Vercel + Backend on Railway**
```bash
# Frontend (Vercel environment variable)
VITE_API_URL=https://your-backend.railway.app

# Backend (Railway environment variable)
CORS_ORIGINS=https://your-frontend.vercel.app
```

**Example 2: Frontend on Netlify + Backend on Render**
```bash
# Frontend (Netlify environment variable)
VITE_API_URL=https://your-backend.onrender.com

# Backend (Render environment variable)
CORS_ORIGINS=https://your-frontend.netlify.app
```

## Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**: Follow the existing code style
4. **Run tests**: `pnpm test`
5. **Run linting**: `pnpm lint`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to the branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Development Guidelines

- Write tests for new features
- Follow TypeScript best practices
- Use meaningful commit messages
- Update documentation as needed
- Ensure all tests pass before submitting PR

## Documentation

- [Website](https://transfa.com)
- [API Reference](http://localhost:3000/api-reference) (when running)
- [TigerBeetle Documentation](https://tigerbeetle.com/docs)

## Community

- **Issues**: [GitHub Issues](https://github.com/transfahq/core/issues)
- **Discussions**: [GitHub Discussions](https://github.com/transfahq/core/discussions)

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](./LICENSE) file for details.

---

<div align="center">

**Built with ❤️ by the Transfa team**

[transfa.com](https://transfa.com)

</div>
