#!/bin/bash
set -e

# Build Docker image for aethra and run compose
# Usage: ./docker-build-run.sh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Build image (assumes Dockerfile is in repo root aethra/)
docker build -t aethra:latest .

# Create data dir if not exists
mkdir -p ./data

# Start compose
if [ -f ./deploy/docker-compose.prod.yml ]; then
  docker compose -f ./deploy/docker-compose.prod.yml up -d --build
  echo "Docker compose started. Check logs: docker compose -f ./deploy/docker-compose.prod.yml logs -f"
else
  echo "deploy/docker-compose.prod.yml not found"
  exit 1
fi
