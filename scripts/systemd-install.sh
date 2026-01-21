#!/usr/bin/env bash
# systemd-install.sh
# Usage: sudo ./scripts/systemd-install.sh /home/aethra/aethra [PORT] [P2P_PORT]
# This script sets up the aethra user, installs Node.js (18.x), installs deps, and installs the systemd unit.

set -euo pipefail
REPO_DIR=${1:-/home/aethra/aethra}
PORT=${2:-3000}
P2P_PORT=${3:-6001}
SERVICE_PATH=/etc/systemd/system/aethra.service
AETHRA_USER=${AETHRA_USER:-aethra}

if [[ $(id -u) -ne 0 ]]; then
  echo "This script must be run as root (sudo)." >&2
  exit 1
fi

# Create user if missing
if ! id -u "$AETHRA_USER" >/dev/null 2>&1; then
  echo "Creating user $AETHRA_USER"
  useradd -m -s /bin/bash "$AETHRA_USER"
fi

# Ensure repo dir exists and owned by aethra
mkdir -p "$REPO_DIR"
chown -R "$AETHRA_USER":"$AETHRA_USER" "$REPO_DIR"

# Install prerequisites (Ubuntu/Debian)
if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  apt-get install -y curl ca-certificates gnupg git build-essential
  # NodeSource Node 18
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
else
  echo "Package manager apt-get not found. Please install Node.js >=18 and git manually." >&2
fi

# Install app dependencies as the aethra user
echo "Installing npm dependencies in $REPO_DIR (production)..."
sudo -u "$AETHRA_USER" bash -lc "cd '$REPO_DIR' && npm ci --only=production"

# Prepare systemd unit from template if present
TEMPLATE="$REPO_DIR/scripts/aethra.service.template"
if [[ -f "$TEMPLATE" ]]; then
  echo "Installing systemd unit from template"
  # Replace WorkingDirectory and env ports
  sed -e "s|WorkingDirectory=.*|WorkingDirectory=$REPO_DIR|" \
      -e "s|Environment=PORT=.*|Environment=PORT=$PORT|" \
      -e "s|Environment=P2P_PORT=.*|Environment=P2P_PORT=$P2P_PORT|" "$TEMPLATE" > /tmp/aethra.service
  mv /tmp/aethra.service "$SERVICE_PATH"
  chmod 644 "$SERVICE_PATH"
  systemctl daemon-reload
  systemctl enable aethra.service
  systemctl restart aethra.service || true
  echo "systemd unit installed at $SERVICE_PATH"
else
  echo "Service template not found at $TEMPLATE; skipping systemd install." >&2
fi

# Ensure data dir exists and owned
mkdir -p "$REPO_DIR/data"
chown -R "$AETHRA_USER":"$AETHRA_USER" "$REPO_DIR/data"

# Import genesis if present
if [[ -f "$REPO_DIR/data/genesis-export.json" ]]; then
  echo "Importing genesis-export.json into chain.json"
  sudo -u "$AETHRA_USER" node "$REPO_DIR/scripts/import-genesis.js" || true
fi

echo "Installation complete. Check service status: systemctl status aethra.service"