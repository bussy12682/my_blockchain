Deployment notes — make the node publicly reachable

Goal: Run Aethra node so it's reachable from the internet (HTTP API + P2P WebSocket).

Recommended production setup:

1) Provision a public VPS (Ubuntu 20.04/22.04) or cloud instance with a public IP.

2) Run the provided cloud-init (`scripts/cloud-init-mainnet.yaml`) as the instance user-data. It will:
   - Install Node 18 and dependencies
   - Install and enable UFW, opening ports 22, 3000 and 7100
   - Create a `systemd` service `aethra.service` that runs the node with `HOST=0.0.0.0` and `P2P_PORT=7100`

3) (Optional but recommended) Put an nginx reverse proxy in front and enable TLS with Certbot:
   - Use `deploy/nginx.conf` as a starting point, set `server_name` to your domain.
   - On the server:
     - `apt install nginx certbot python3-certbot-nginx`
     - Place `nginx.conf` in `/etc/nginx/sites-available/aethra` and symlink to `sites-enabled`.
     - `nginx -t && systemctl reload nginx`
     - `certbot --nginx -d your.domain.example` to automatically obtain TLS and reload nginx.

4) If you prefer Docker:
   - Use the `deploy/docker-compose.prod.yml` as a starting point. Build the image and run `docker-compose -f docker-compose.prod.yml up -d`.
   - Ensure host firewall allows TCP 443 (if using TLS), 3000 and 7100.

5) Cloud firewall / security groups:
   - Remember to open TCP ports 3000 and 7100 at the provider level (AWS SG, DO firewall, Hetzner, etc.). UFW only affects the VM itself.

6) Security and reliability suggestions:
   - Use nginx + TLS (Don't expose raw HTTP where possible).
   - Run the node in a container or under a dedicated user with limited privileges.
   - Monitor logs with `journalctl -u aethra.service -f` or `docker logs -f`.
   - Add backups for the `data/` directory and chain DB.

If you want, I can:
 - Produce a ready-to-run `systemd` unit file (already embedded in the cloud-init),
 - Create an Ansible role to provision multiple seed nodes and open firewall rules on Linux,
 - Create a complete `nginx` + `certbot` automated script for one-click setup.

Tell me which of those you'd like me to add next, or provide your VPS provider and I'll give provider-specific firewall/dns steps.
