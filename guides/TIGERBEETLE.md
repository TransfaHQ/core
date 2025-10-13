# TigerBeetle Deployment Guide for Transfa

Transfa uses [TigerBeetle](https://tigerbeetle.com) as its high-performance accounting engine. This guide covers deploying TigerBeetle for different environments.

## Overview

TigerBeetle is a distributed financial accounting database designed for mission-critical safety and performance. Transfa requires a TigerBeetle cluster to handle all ledger operations.

**Official TigerBeetle Documentation**: https://docs.tigerbeetle.com/

## Development Setup

For local development, we provide a pre-configured TigerBeetle container in `docker-compose.dev.yml`:

```bash
# Start development environment (includes TigerBeetle)
docker-compose -f docker-compose.dev.yml up
```

The development setup:
- Uses the official TigerBeetle Docker image
- Runs a single-node cluster on port 6066
- Automatically formats the data file on first run
- Data persists in a Docker volume

## Production Deployment

**⚠️ Important**: For production, TigerBeetle should be deployed separately from the Transfa backend for scalability, reliability, and performance.

### Why Separate Deployment?

1. **Scalability**: TigerBeetle clusters can scale independently
2. **High Availability**: Run multi-replica clusters across regions
3. **Performance**: Dedicated resources for the accounting engine
4. **Operational Excellence**: Separate upgrade cycles and monitoring

### Deployment Options

#### Option 1: Direct Binary Installation (Recommended)

TigerBeetle is distributed as a single, statically-linked binary with no dependencies.

**Download and Install**:

```bash
# Download TigerBeetle (replace version as needed)
VERSION=0.16.58
wget https://github.com/tigerbeetle/tigerbeetle/releases/download/${VERSION}/tigerbeetle-x86_64-linux.zip
unzip tigerbeetle-x86_64-linux.zip
chmod +x tigerbeetle

# Move to system path
sudo mv tigerbeetle /usr/local/bin/
```

**Create Data File**:

```bash
# Format a new TigerBeetle data file
tigerbeetle format --cluster=0 --replica=0 --replica-count=1 /var/lib/tigerbeetle/0_0.tigerbeetle
```

**Run TigerBeetle**:

```bash
# Start TigerBeetle
tigerbeetle start --addresses=0.0.0.0:3000 /var/lib/tigerbeetle/0_0.tigerbeetle
```

**Systemd Service** (recommended for production):

```bash
# Create service file
sudo cat > /etc/systemd/system/tigerbeetle.service <<EOF
[Unit]
Description=TigerBeetle Financial Accounting Database
After=network.target

[Service]
Type=simple
User=tigerbeetle
Group=tigerbeetle
ExecStart=/usr/local/bin/tigerbeetle start --addresses=0.0.0.0:3000 /var/lib/tigerbeetle/0_0.tigerbeetle
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl enable tigerbeetle
sudo systemctl start tigerbeetle
```

#### Option 2: Docker Deployment

While TigerBeetle recommends direct binary installation, Docker is also supported:

```bash
# Create data directory
mkdir -p /var/lib/tigerbeetle

# Format data file
docker run --rm -v /var/lib/tigerbeetle:/data \
  ghcr.io/tigerbeetle/tigerbeetle \
  format --cluster=0 --replica=0 --replica-count=1 /data/0_0.tigerbeetle

# Run TigerBeetle
docker run -d \
  --name tigerbeetle \
  --security-opt seccomp=unconfined \
  --cap-add IPC_LOCK \
  -v /var/lib/tigerbeetle:/data \
  -p 3000:3000 \
  ghcr.io/tigerbeetle/tigerbeetle \
  start --addresses=0.0.0.0:3000 /data/0_0.tigerbeetle
```

**Important Docker Notes**:
- Always use `--security-opt seccomp=unconfined` for proper operation
- Add `--cap-add IPC_LOCK` for macOS compatibility
- Mount data directory for persistence

### High Availability Cluster

For production, deploy a multi-replica cluster across multiple nodes:

**3-Node Cluster Example**:

```bash
# Node 1
tigerbeetle start --addresses=10.0.1.1:3000,10.0.1.2:3000,10.0.1.3:3000 \
  /var/lib/tigerbeetle/0_0.tigerbeetle

# Node 2
tigerbeetle start --addresses=10.0.1.1:3000,10.0.1.2:3000,10.0.1.3:3000 \
  /var/lib/tigerbeetle/0_1.tigerbeetle

# Node 3
tigerbeetle start --addresses=10.0.1.1:3000,10.0.1.2:3000,10.0.1.3:3000 \
  /var/lib/tigerbeetle/0_2.tigerbeetle
```

Each replica must have its own unique data file created with `format`:

```bash
# Format replica 0, 1, and 2
tigerbeetle format --cluster=0 --replica=0 --replica-count=3 /var/lib/tigerbeetle/0_0.tigerbeetle
tigerbeetle format --cluster=0 --replica=1 --replica-count=3 /var/lib/tigerbeetle/0_1.tigerbeetle
tigerbeetle format --cluster=0 --replica=2 --replica-count=3 /var/lib/tigerbeetle/0_2.tigerbeetle
```

## Connecting Transfa to TigerBeetle

Configure your Transfa backend to connect to TigerBeetle:

### Environment Variables

```bash
# Single node
TIGER_BEETLE_CLUSTER_ID=0
TIGER_BEETLE_REPLICAS_ADDRESSES=tigerbeetle.example.com:3000

# Multi-node cluster
TIGER_BEETLE_CLUSTER_ID=0
TIGER_BEETLE_REPLICAS_ADDRESSES=node1.example.com:3000,node2.example.com:3000,node3.example.com:3000
```

### Docker Compose (Production)

```yaml
services:
  backend:
    environment:
      TIGER_BEETLE_CLUSTER_ID: 0
      TIGER_BEETLE_REPLICAS_ADDRESSES: tigerbeetle.example.com:3000
```


## Resources

- **Official Documentation**: https://docs.tigerbeetle.com/
- **GitHub Repository**: https://github.com/tigerbeetle/tigerbeetle
- **Operating Guide**: https://docs.tigerbeetle.com/operating/
- **Docker Deployment**: https://docs.tigerbeetle.com/operating/deploying/docker/

## Support

For TigerBeetle-specific issues:
- TigerBeetle Slack: https://slack.tigerbeetle.com/
- GitHub Issues: https://github.com/tigerbeetle/tigerbeetle/issues

For Transfa integration issues:
- Transfa GitHub: https://github.com/transfahq/core/issues
