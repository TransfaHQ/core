# Core Monorepo

A full-stack application with a React frontend and NestJS backend, managed with pnpm workspaces.

## Project Structure

```
core/
├── frontend/          # React + Vite frontend
├── backend/           # NestJS backend
├── pnpm-workspace.yaml
└── package.json       # Workspace root
```

## Prerequisites

- Node.js >= 22.0.0
- pnpm (installed globally)

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

Download and configure tigerbeetle

```bash
cd backend
npm run tb:download
npm run tb:configure:dev
npm run tb:start:dev
```

Configure `.env`

```bash
cp .env.example .env
```

Migrate postgres db

```bash
npm run db:migrate
```

Start both frontend and backend in development mode:

```bash
# Start frontend (http://localhost:5173)
pnpm dev:frontend

# Start backend (http://localhost:3000)
pnpm dev:backend
```

### Building

```bash
# Build all workspaces
pnpm build

# Build individual packages
pnpm build:frontend
pnpm build:backend
```

### Linting

```bash
# Lint all workspaces
pnpm lint

# Lint individual packages
pnpm lint:frontend
pnpm lint:backend
```

### Testing

```bash
# Run tests in all workspaces
pnpm test

# Run tests in individual packages
pnpm test:frontend
pnpm test:backend
```

## Git Hooks

This project uses Husky for git hooks:

- **Pre-commit**: Automatically runs linting on all workspaces before commits
- Commits are blocked if linting fails

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Radix UI
- React Query

### Backend

- NestJS
- TypeScript
- TypeORM
- PostgreSQL
- Swagger/OpenAPI
- TigerBeetle (accounting engine)

## Development Workflow

1. **Install dependencies**: `pnpm install`
2. **Start development servers**: Use `pnpm dev:frontend` and `pnpm dev:backend`
3. **Make changes**: Code will auto-reload in development
4. **Commit**: Pre-commit hooks will automatically lint your code
5. **Build**: Use `pnpm build` to create production builds

## Workspace Management

This monorepo uses pnpm workspaces for dependency management:

- Shared dependencies are deduplicated
- Each package maintains its own `package.json`
- Root-level scripts coordinate workspace operations
- Single `pnpm-lock.yaml` ensures consistency
