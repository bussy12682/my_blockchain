Ansible provisioning for Aethra seed nodes

This folder contains an opinionated Ansible playbook and role to provision multiple Aethra seed nodes (Ubuntu/Debian). The playbook will:
- Install Node.js 18
- Create `aethra` system user
- Clone your Aethra repo into `app_dir` (default `/home/aethra/aethra`)
- Copy `genesis-export.json` from the control machine to each node's `data/` dir
- Install production npm dependencies
- Install and enable a `systemd` service to run the node
- Import genesis (`scripts/import-genesis.js`)

Quick usage

1. Edit `hosts.ini` to list your hosts.
2. From the repo root ensure `data/genesis-export.json` exists (generated earlier by `examples/launch-token.js`).
3. Run the playbook (override variables as needed):

```bash
ansible-playbook -i ansible/hosts.ini ansible/playbook.yml \
  -e "repo_url=https://github.com/you/aethra.git genesis_src=./data/genesis-export.json app_dir=/home/aethra/aethra"
```

Notes
- The playbook assumes SSH key access to target hosts as the user specified in `hosts.ini`.
- Customize ports by editing `playbook.yml` variables or passing `-e node_port=3001 -e p2p_port=6002`.
- For production, secure P2P with TLS, restrict the API to allowed hosts or add authentication, and set up firewall rules.

If you want, I can adapt this playbook to use an Ansible Vault for secrets, or generate cloud provider-specific provisioning (AWS, DigitalOcean, Hetzner).