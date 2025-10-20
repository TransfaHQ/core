<div align="center">
<img width="auto" height="36" alt="Group 5" src="https://github.com/user-attachments/assets/6be00fca-aa64-447d-b416-4f4b6a87746b" />


**Open-Source Ledger Infrastructure for Financial Applications**


[Website](https://transfa.com) • [Documentation](https://docs.transfa.com) • [Contributing](#contributing)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./backend/LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Docker Build](https://github.com/TransfaHQ/core/actions/workflows/docker-build.yml/badge.svg)](https://github.com/TransfaHQ/core/actions/workflows/docker-build.yml)

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

- [Local Development](#local-development)
- [Documentation](#documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Local Development

For local development, you'll need Node.js >= 22.0.0, pnpm, PostgreSQL, and TigerBeetle.

📚 **[Local Development Guide](./guides/LOCAL_DEVELOPMENT.md)** - Complete setup guide including:
- Architecture and tech stack
- Step-by-step installation
- Development workflow
- Testing
- Troubleshooting


## Documentation

Full documentation is available at **[docs.transfa.com](https://docs.transfa.com)**

- **[Getting Started](https://docs.transfa.com)** - Introduction and overview
- **[Self-Hosting Guide](https://docs.transfa.com/deployment/self-hosting)** - Deploy with Docker Compose
- **[API Reference](https://docs.transfa.com/api-reference/introduction)** - Complete API documentation
- **[TigerBeetle Documentation](https://docs.tigerbeetle.com/)** - TigerBeetle deployment and operations

For local development, the API documentation is also available at http://localhost:3000/api-reference when running the backend.



## Deployment

Ready to deploy Transfa to production? We have comprehensive deployment guides available:

**📚 [Self-Hosting Guide](https://docs.transfa.com/deployment/self-hosting)** - Complete guide for deploying Transfa with Docker Compose, including:
- Environment configuration
- TigerBeetle deployment (VPC setup, security considerations)
- Production best practices
- Troubleshooting

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
