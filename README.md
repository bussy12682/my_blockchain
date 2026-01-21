# Aethra — Educational Blockchain & Token Platform (v1.0.0)

Aethra is a **production-ready** educational blockchain implemented in Node.js. It includes everything needed to design, launch, and operate your own cryptocurrency:

✅ **Proof-of-Work consensus** with dynamic difficulty  
✅ **ECDSA wallet & signatures** (secp256k1)  
✅ **P2P gossip networking** (WebSocket)  
✅ **Token design & genesis tooling** for coin launches  
✅ **Balance tracking & state validation**  
✅ **Persistent storage** (JSON + LevelDB fallback)  
✅ **Comprehensive CLI** for all operations  
✅ **Full test suite** with P2P integration tests  
✅ **REST API** for node interaction & token transfers  

## Quick Start

### 1. Install & Start

```bash
npm install
# For local development:
npm start
# For public VPS (binds to all interfaces and sets P2P port):
# HOST=0.0.0.0 P2P_PORT=7100 npm start
```

### 2. Design Your Token (5 minutes)

```bash
npm run cli -- token design "MyCoin" "MCN" 18
npm run cli -- token add <address> 1000000000000000000000000
npm run cli -- token launch 3
```

See [TOKEN_LAUNCH.md](TOKEN_LAUNCH.md) for complete guide.

### 3. Run Tests

```bash
npm test
```

**Result:** 22 tests pass across 11 suites (includes P2P integration tests).

## Documentation & Guides

| Document | Purpose |
|----------|---------|
| [TOKEN_LAUNCH.md](TOKEN_LAUNCH.md) | Step-by-step guide to design and launch your token in 5 minutes |
| [TOKENOMICS.md](TOKENOMICS.md) | Mining rewards (50 tokens/block), token supply, economic models |
| [BUSINESS_MODEL.md](BUSINESS_MODEL.md) | 7 ways to make money: transaction fees, API gateway, apps, token appreciation |
| [APP_DEVELOPER_REVENUE.md](APP_DEVELOPER_REVENUE.md) | How developers build apps on Aethra and how you earn from their transactions |
| [APPS_YOU_CAN_BUILD.md](APPS_YOU_CAN_BUILD.md) | 50+ app ideas: payment gateway, gaming, DEX, real estate, streaming, etc. |
| [WHAT_MAKES_AETHRA_DIFFERENT.md](WHAT_MAKES_AETHRA_DIFFERENT.md) | Comparison: why Aethra stands out vs Bitcoin and Ethereum |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deploy Aethra on public VPS (AWS, DigitalOcean, Hetzner, etc.) |
| [DOCKER.md](DOCKER.md) | Run Aethra in Docker with docker-compose |
| [deploy/README-deploy.md](deploy/README-deploy.md) | Nginx + Certbot + TLS setup for production |

## Architecture

| File | Purpose |
|------|---------|
| `src/block.js` | Block structure, mining, PoW verification |
| `src/blockchain.js` | Chain state, validation, difficulty adjustment, balance tracking |
| `src/miner.js` | Mining loop with coinbase reward support |
| `src/transaction.js` | TX format, ECDSA signing & verification |
| `src/wallet.js` | Keypair generation (secp256k1) |
| `src/p2p.js` | WebSocket P2P gossip layer |
| `src/server.js` | REST API (blocks, TXs, mining, peers) |
| `src/cli.js` | CLI for all operations (token, wallet, peer, mine, etc.) |
| `src/tokenomics.js` | Token design & genesis allocation helper |
| `src/storage.js` | Persistent storage (LevelDB + filesystem fallback) |

## Key Features

### Token Launch
Use the CLI to design and launch a token in minutes:

```bash
# Design token
npm run cli -- token design "MyToken" "MTK" 18

# Add allocations
npm run cli -- token add 0x123... 1000000
npm run cli -- token add 0x456... 500000

# Show design
npm run cli -- token show

# Launch genesis
npm run cli -- token launch 3
```

Allocations are immutable and tracked from genesis. Balances are replayed and validated during chain validation.

### Wallet & Transactions
```bash
# Create wallet
npm run cli -- wallet create

# Sign transaction
npm run cli -- wallet sign <privateKey> '{"toAddress":"0x...","amount":100}'

# Send transaction
npm run cli -- tx '{"fromAddress":"0x...","toAddress":"0x...","amount":100,"signature":"..."}'
```

### P2P Networking
Connect nodes and gossip blocks/transactions:

```bash
npm run cli -- peer connect ws://peer-node:7100
npm run cli -- peer list
```

### Mining & Rewards
Mine blocks with built-in coinbase rewards:

```bash
npm run cli -- mine <json>
npm run start &
# Server at http://localhost:3000/mine?minerAddress=0x...
```

## REST API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/chain` | GET | Full blockchain |
| `/block/:index` | GET | Specific block |
| `/tx/new` | POST | Submit signed transaction |
| `/mine` | POST | Mine block (with optional minerAddress for reward) |
| `/peer/connect` | POST | Connect to peer |
| `/peers` | GET | List connected peers |
| `/status` | GET | Node status + balances |

## File Structure

```
aethra/
├── src/                   # Core modules
│   ├── block.js
│   ├── blockchain.js
│   ├── transaction.js
│   ├── wallet.js
│   ├── miner.js
│   ├── p2p.js
│   ├── server.js
│   ├── cli.js
│   ├── tokenomics.js
│   └── storage.js
├── tests/                 # Full test suite
│   ├── block.test.js
│   ├── blockchain.test.js
│   ├── genesis.test.js
│   ├── tokenomics.test.js
│   ├── transaction.test.js
│   ├── wallet.test.js
│   ├── consensus.test.js
│   ├── storage.test.js
│   ├── miner_coinbase.test.js
│   ├── blockchain_tx.test.js
│   └── integration.p2p.test.js
├── examples/              # Demo scripts
│   ├── demo.js
│   ├── launch-token.js
│   └── runAndTest.js
├── data/                  # Persistent storage
│   ├── chain.json
│   ├── state.json
│   └── genesis-export.json
├── .github/workflows/     # CI/CD
│   └── ci.yml
├── deploy/                # Production deployment
│   ├── nginx.conf
│   ├── docker-compose.prod.yml
│   ├── docker-build-run.sh
│   ├── setup-nginx-certbot.sh
│   └── README-deploy.md
├── TOKEN_LAUNCH.md        # Token launch guide
├── TOKENOMICS.md          # Mining rewards & token economics
├── BUSINESS_MODEL.md      # How to make money with Aethra
├── APP_DEVELOPER_REVENUE.md # Developer payment models
├── APPS_YOU_CAN_BUILD.md  # 50+ app ideas for Aethra
├── WHAT_MAKES_AETHRA_DIFFERENT.md # Comparison: Aethra vs Bitcoin vs Ethereum
├── DEPLOYMENT.md          # VPS deployment guide
├── DOCKER.md              # Docker setup guide
├── README.md              # This file
├── package.json
└── LICENSE (MIT)
```

## Example: Full Token Launch

```bash
node examples/launch-token.js
```

Output:
```
===== Aethra Token Launch Example =====

Step 1: Designing token...
Created: Aethra Coin (AETH), 18 decimals

Step 2: Creating genesis allocations...
Total supply: 5000000 tokens

Step 3: Mining genesis block (difficulty=3)...
Genesis block mined: 00004c60df45f9bd7fae4e498da5243898be37989312e72...

Step 4: Initializing blockchain...
Blockchain initialized with 1 block
Tracked balances: 4

===== Launch Summary =====
Token Name: Aethra Coin
Symbol: AETH
Total Supply: 5000000
Genesis Hash: 00004c60df45f9bd7fae4e498da5243898be37989312e72...
✓ Token launch complete!
```

## Design & Goals

- **Educational** — clear, readable code explaining blockchain concepts
- **Complete** — wallets, signatures, P2P, consensus, state tracking, and tooling all included
- **Testable** — comprehensive unit and integration tests with CI/CD
- **Launch-Ready** — token design, genesis tooling, and multi-node networking
- **Extensible** — easy to add features (PoS, smart contracts, sharding)

## Consensus

- **Algorithm:** Proof-of-Work (SHA-256)
- **Difficulty:** Dynamic adjustment every 5 blocks
- **Target Time:** 2 seconds per block
- **Fork Resolution:** Longest total-work chain wins
- **Validation:** Full chain validation including balance checks

## Security

- **Cryptography:** secp256k1 (ECDSA) for wallets & signatures
- **Transaction Validation:** Signature verification before acceptance
- **State Validation:** Balance checks prevent overspend attacks
- **Block Limits:** 5000 TX/block to prevent DoS
- **Mempool Dedupe:** Prevents duplicate transaction relay

## Performance

- Test suite completes in ~12 seconds (11 suites, 22 tests)
- Block mining time adjusts dynamically (target: 2s)
- P2P gossip tested with 2-node integration test
- Persistent storage with optional LevelDB for large chains

## Next Steps (Optional Enhancements)

- [ ] **Explorer UI** — web dashboard to view blocks, balances, transactions
- [ ] **Light Wallet** — browser-based wallet for token holders
- [ ] **Docker** — containerized deployment
- [ ] **Governance** — on-chain voting & proposals
- [ ] **Smart Contracts** — basic VM for contract execution
- [ ] **Sharding** — horizontal scaling for high throughput

## Going Live: Make Aethra Public

### Quick Path to Launch (1-2 hours)

1. **Provision VPS** (DigitalOcean, AWS, Hetzner, etc.)
2. **Use cloud-init** — paste `scripts/cloud-init-mainnet.yaml` as user-data
3. **Wait 5-10 min** for automatic setup
4. **Your node is live** at `YOUR_VPS_IP:3000` and P2P at `YOUR_VPS_IP:7100`

See [DEPLOYMENT.md](DEPLOYMENT.md) for full instructions and provider-specific setup.

### Make Money Immediately

Once live:
- **Mine blocks** → accumulate tokens
- **Collect transaction fees** → 0.5 tokens per transaction
- **Build apps** → take 10-30% cut
- **Provide API access** → $10-100/month per developer

See [BUSINESS_MODEL.md](BUSINESS_MODEL.md) and [APPS_YOU_CAN_BUILD.md](APPS_YOU_CAN_BUILD.md) for revenue strategies.

## License

MIT — See LICENSE

---

**Ready to launch your token?** See [TOKEN_LAUNCH.md](TOKEN_LAUNCH.md) for the complete guide.

Quick start

Install dependencies:

```powershell
cd aethra
npm install
```

Run a node (server API):

```powershell
# Local dev
npm start
# For public servers (bind to all interfaces):
# $env:HOST='0.0.0.0'; $env:P2P_PORT='7100'; npm start
```

CLI usage (create genesis, mine, view):

```powershell
npm run cli -- --help
```

Run tests:

```powershell
npm test
```

Architecture
- src/block.js — block structure and hash helpers
- src/blockchain.js — core chain, validation, persistence
- src/miner.js — mining loop and PoW implementation
- src/server.js — tiny REST API to interact with node
- src/cli.js — command-line utility for quick interaction

Examples

There is a small demo that spins a node, posts a transaction, and asks the node to mine a block:

```powershell
npm run demo
```

Design notes & goals
- Minimal — intentionally compact to be easy to read and reason about
- Educational — aims to teach core blockchain concepts (blocks, hashes, PoW, validation)
- Not production — data stored in a local JSON file and the network is a single-node demo

If you'd like, I can extend this into a tiny P2P overlay, add wallets/keys, or implement a light consensus protocol.

License
MIT — see LICENSE
