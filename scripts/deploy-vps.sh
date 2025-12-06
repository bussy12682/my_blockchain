#!/usr/bin/env bash
# deploy-vps.sh
# Usage: ./deploy-vps.sh user@host:/path/to/app [user@host:/path2 ...]
# Copies data/genesis-export.json to remote nodes, imports it as chain.json, and restarts or runs the node.

set -euo pipefail
if [ "$#" -lt 1 ]; then
  echo "Usage: $0 user@host[:remote_path] [user@host[:remote_path] ...]"
  echo "Example: $0 ubuntu@seed1.example.com:/home/ubuntu/aethra ubuntu@seed2.example.com:/home/ubuntu/aethra"
  exit 1
fi

GENESIS="data/genesis-export.json"
if [ ! -f "$GENESIS" ]; then
  echo "Error: $GENESIS not found. Create a genesis-export.json first (examples/launch-token.js)."
  exit 2
fi

for dest in "$@"; do
  # parse remote path if provided
  if [[ "$dest" == *":"* ]]; then
    target="$dest"
  else
    # default remote path is home directory
    target="$dest:~/aethra"
  fi

  echo "Deploying genesis to $target"
  scp "$GENESIS" "$target/data/genesis-export.json"

  # run remote import and try to restart systemd unit if available
  remote_host=$(echo "$target" | cut -d: -f1)
  remote_path=$(echo "$target" | cut -d: -f2-)

  echo "Running import and restart on $remote_host"
  ssh "$remote_host" bash -lc "\
    set -e; \
    cd '$remote_path' || exit 1; \
    node scripts/import-genesis.js || echo 'import-genesis failed'; \
    if sudo systemctl --quiet is-enabled aethra.service; then sudo systemctl restart aethra.service && echo 'restarted aethra.service'; else \
      # fallback: start in background with nohup
      nohup env PORT=3000 P2P_PORT=6001 node src/server.js > node.log 2>&1 & echo 'started node with nohup'; fi"

  echo "Done for $target"
done

echo "Deploy complete. Verify nodes with: curl http://host:3000/status"
