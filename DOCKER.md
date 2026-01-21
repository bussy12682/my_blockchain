Docker & Multi-node Quickstart

This project includes a `Dockerfile`, `docker-compose.yml`, and helper scripts to run a 3-node Aethra network locally.

Prerequisites
- Docker Engine and Docker Compose installed on your machine
- Ports 3000-3002 and 6001-6003 free (or adjust `docker-compose.yml`)

Start 3 local nodes

```powershell
# Build and start services
docker compose up --build -d

# Wait a few seconds for nodes to start, then connect peers
powershell -File scripts\seed-nodes.ps1
```

Check node status
```powershell
Invoke-RestMethod http://127.0.0.1:3000/status
Invoke-RestMethod http://127.0.0.1:3001/status
Invoke-RestMethod http://127.0.0.1:3002/status
```

Import published genesis

If you have `genesis-export.json` (exported by `examples/launch-token.js`), copy it into `data/` of the node directory you want to initialize and run:

```powershell
node scripts/import-genesis.js
```

Notes
- Each node stores its chain data under `./data_nodeX` on the host. Keep those directories persistent for long-term nodes.
- In production, run one instance per machine and publish seed addresses (ws://host:port) so new nodes can connect.
