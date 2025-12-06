# Aethra Deployment Checklist

## Pre-Launch Verification

- [x] **Core blockchain functional** — PoW consensus, block validation, chain state tracking
- [x] **Wallets & signatures** — ECDSA secp256k1 keypair generation and TX signing
- [x] **P2P networking** — WebSocket gossip layer with peer discovery
- [x] **Token tooling** — Genesis allocation, balance tracking, overspend prevention
- [x] **Persistent storage** — Chain + state saved to disk, LevelDB optional
- [x] **REST API** — Full node interaction (blocks, TXs, mining, peers)
- [x] **CLI** — All commands (token design, wallet, mining, peer management)
- [x] **Test coverage** — 24 tests across 12 suites, all passing
- [x] **CI/CD** — GitHub Actions workflow for Node 18 & 20

## Token Launch Steps

1. **Design Your Token**
   ```bash
   npm run cli -- token design "YourToken" "YTK" 18
   ```

2. **Add Genesis Allocations**
   ```bash
   npm run cli -- token add <founder_address> <amount>
   npm run cli -- token add <community_address> <amount>
   ```

3. **Verify Token Design**
   ```bash
   npm run cli -- token show
   ```

4. **Launch Genesis**
   ```bash
   npm run cli -- token launch 3
   ```

5. **Export for Distribution**
   - File: `data/genesis-export.json`
   - Share with validators/nodes

## Running Your Blockchain

### Start a Node
```bash
# bind to all interfaces for public access (recommended on VPS)
# Example: set HOST and P2P_PORT before starting
HOST=0.0.0.0 P2P_PORT=7100 npm start
```
Server runs on `http://0.0.0.0:3000` (use your server public IP/domain for external access, e.g. `http://203.0.113.5:3000`)

### Test Node Health
```bash
curl http://localhost:3000/status
```

### Connect Peers
```bash
npm run cli -- peer connect ws://other-node:7100
```

### Send a Transaction
```bash
# Create wallet
npm run cli -- wallet create
# -> privateKey: ...
# -> publicKey: ...

# Sign transaction
npm run cli -- wallet sign <privateKey> '{"toAddress":"0x...","amount":100}'
# -> outputs signed tx JSON

# Send to node
npm run cli -- tx <signed_tx_json>
```

### Mine Blocks
```bash
npm run cli -- mine '{}' # mine empty block
# or via API:
curl -X POST http://localhost:3000/mine \
  -H "Content-Type: application/json" \
  -d '{"minerAddress":"0x..."}'
```

## Multi-Node Setup

### Node 1 (Primary)
```bash
npm start  # runs on :3000, P2P on :7100
```

### Node 2 (Secondary)
```bash
# In separate terminal:
npm start
# Change port in src/server.js (e.g., :3001)
npm run cli -- peer connect ws://localhost:7100
```

### Verify Sync
Both nodes should have identical chains:
```bash
curl http://localhost:3000/chain > chain1.json
curl http://localhost:3001/chain > chain2.json
diff chain1.json chain2.json  # should be empty
```

## Production Considerations

### Before Going Live

1. **Security Audit**
   - Review `src/blockchain.js` validation logic
   - Check `src/transaction.js` signature verification
   - Audit `src/p2p.js` for DoS vulnerabilities

2. **Network Security**
   - Use TLS for WebSocket connections (wss://)
   - Implement firewall rules
   - Rate limit RPC endpoints

3. **Monitoring**
   - Log block mining events
   - Monitor peer connections
   - Track transaction mempool size

4. **Backup & Recovery**
   - Backup `data/chain.json` regularly
   - Store `genesis-export.json` safely
   - Test recovery procedures

5. **Scaling**
   - Consider difficulty adjustment (currently every 5 blocks)
   - Monitor block mining time (target: 2s)
   - Add metrics/telemetry

### Optional Enhancements

- [ ] Add Docker containerization
- [ ] Set up Kubernetes deployment
- [ ] Implement block explorer UI
- [ ] Add light wallet (browser-based)
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Implement governance voting
- [ ] Add smart contract support

## Files to Keep Safe

- **`data/chain.json`** — Your blockchain (immutable history)
- **`data/state.json`** — Current balances (derived, can be recomputed)
- **`data/genesis-export.json`** — Genesis block definition (share with validators)

## Common Commands

| Task | Command |
|------|---------|
| Start node | `npm start` |
| Create wallet | `npm run cli -- wallet create` |
| Sign TX | `npm run cli -- wallet sign <key> <tx>` |
| Send TX | `npm run cli -- tx <tx>` |
| Mine block | `npm run cli -- mine '{}'` |
| View chain | `npm run cli -- view` |
| Node status | `npm run cli -- status` |
| Design token | `npm run cli -- token design <name> <symbol> <decimals>` |
| Add allocation | `npm run cli -- token add <addr> <amount>` |
| Launch genesis | `npm run cli -- token launch <difficulty>` |
| Connect peer | `npm run cli -- peer connect ws://host:port` |

## Troubleshooting

**Q: Node won't start on port 3000**
A: Change port in `src/server.js` or kill existing process: `lsof -i :3000 | kill -9 <PID>`

**Q: P2P peer won't connect**
A: Ensure firewall allows WebSocket traffic; use `wss://` for remote peers

**Q: Balance doesn't match allocations**
A: Run `npm run cli -- status` to recompute balances from chain

**Q: Need to reset blockchain**
A: Delete `data/chain.json` and `data/state.json`, then restart node

## Support & Resources

- **Docs:** See `TOKEN_LAUNCH.md` and `README.md`
- **Examples:** See `examples/launch-token.js` and `examples/demo.js`
- **Tests:** Run `npm test` to verify functionality
- **CI/CD:** Check `.github/workflows/ci.yml` for automated tests

---

**You're ready to launch!** 🚀
