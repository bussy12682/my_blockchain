Aethra deployment helper scripts

Files:
- `deploy-vps.sh` — copies `data/genesis-export.json` to remote nodes, runs `scripts/import-genesis.js`, and attempts to restart a systemd service `aethra.service` (if present). Falls back to starting the node with `nohup`.
- `aethra.service.template` — a systemd unit template. Copy, edit `WorkingDirectory` and `Environment` values per node, then install as `/etc/systemd/system/aethra.service` and enable.
- `import-genesis.js` — already present; imports `data/genesis-export.json` into `data/chain.json`.

Quickstart for a single VPS (Linux) — manual steps

1. Clone repo on server (on each seed):

```bash
git clone <your-repo> aethra
cd aethra
npm ci --production
```

2. Copy `genesis-export.json` from your local machine (where you ran `examples/launch-token.js`) to the server `~/aethra/data/`.

```bash
scp data/genesis-export.json user@seed1.example.com:~/aethra/data/genesis-export.json
```

3. Import genesis and start the node:

```bash
cd ~/aethra
node scripts/import-genesis.js
# run with environment vars (adjust ports per node)
PORT=3000 P2P_PORT=6001 node src/server.js
```

4. (Optional) Install systemd service

- Copy `scripts/aethra.service.template` to server and edit it (WorkingDirectory and ports):

```bash
scp scripts/aethra.service.template user@seed1.example.com:~/aethra/aethra.service
ssh user@seed1.example.com 'sudo mv ~/aethra/aethra.service /etc/systemd/system/aethra.service && sudo systemctl daemon-reload && sudo systemctl enable aethra.service && sudo systemctl start aethra.service'
```

5. Verify:

```bash
curl http://localhost:3000/status
```

Bootstrapping multiple nodes

Use `scripts/deploy-vps.sh` from your local machine (it requires `ssh` and `scp` configured for the target hosts):

```bash
# Example: deploy to two servers
./scripts/deploy-vps.sh ubuntu@seed1.example.com:/home/ubuntu/aethra ubuntu@seed2.example.com:/home/ubuntu/aethra
```

The script will copy `data/genesis-export.json` to each server and try to import it and start/restart the node.

Notes & Security

- Use a dedicated user (e.g., `aethra`) on servers, and run service under that user for safety.
- Use firewall rules to restrict access; expose only the HTTP API and P2P ports you intend to. For public nodes, use TLS (wss) for P2P.
- Ensure `node` binary in the system matches your tested Node.js version.
- Consider using Docker or systemd for process supervision and automatic restarts.

If you want, I can:
- Generate a ready-to-use `user-data` cloud-init snippet for common VPS providers.
- Add a `systemd-install.sh` script that sets up the `aethra` user, copies the unit, enables it, and starts the service.
- Prepare an Ansible playbook to automate multi-node deployment.
