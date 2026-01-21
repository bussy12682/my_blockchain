# Token Launch Guide — Aethra v1.0.0

This guide shows you how to design, create, and launch your own token on the Aethra blockchain.

## Quick Start: 5-Minute Token Launch

### 1. Design Your Token

```bash
npm run cli -- token design "MyAwesomeCoin" "MAC" 18
```

Output:
```
Designed token: MyAwesomeCoin (MAC) with 18 decimals
Saved to data/tokenomics.json
```

### 2. Add Allocations (Genesis Holders)

Add founder allocation:
```bash
npm run cli -- token add 03e8bc1c1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c 1000000000000000000000000
```

Add community allocation:
```bash
npm run cli -- token add 04b6c8a1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7 2000000000000000000000000
```

### 3. View Your Token Design

```bash
npm run cli -- token show
```

Output:
```json
{
  "name": "MyAwesomeCoin",
  "symbol": "MAC",
  "decimals": 18,
  "totalSupply": "3000000000000000000000000",
  "allocations": [
    {
      "address": "03e8bc1c...",
      "amount": "1000000000000000000000000"
    },
    {
      "address": "04b6c8a1...",
      "amount": "2000000000000000000000000"
    }
  ]
}
```

### 4. Launch Genesis

```bash
npm run cli -- token launch 3
```

Output:
```
Launched token genesis: MyAwesomeCoin (MAC)
Total supply: 3000000000000000000000000
Allocations: 2
Genesis saved to data/chain.json
```

### 5. Start Your Node

```bash
npm run start
```

Your blockchain is now running with your token live on the genesis block!

## Advanced: Complete Tokenomics Example

See `examples/launch-token.js` for a complete programmatic example:

```bash
node examples/launch-token.js
```

This creates a realistic token launch with:
- Multiple founder/team allocations
- Mined genesis block
- Exported genesis for sharing with other nodes
- Balance tracking per address

## CLI Commands Reference

### Token Design

```bash
# Create a new token design
npm run cli -- token design <name> <symbol> <decimals>

# Add an allocation
npm run cli -- token add <address> <amount>

# Show current design
npm run cli -- token show

# Launch genesis
npm run cli -- token launch <difficulty>
```

## Key Concepts

### Decimals
Aethra uses BigInt for all amounts. Decimals are a display/convention layer:
- `18 decimals` (like Ethereum): 1 token = `10^18` base units
- `8 decimals` (like Bitcoin): 1 token = `10^8` base units

### Genesis Allocations
Allocations are set in the genesis block. They are **immutable** and define the initial token distribution.

### Total Supply
Total supply is the sum of all genesis allocations plus any coinbase rewards from mining.

### Balances
Balances are **derived** by replaying the chain from genesis:
- Apply genesis allocations
- Apply each transaction (debit from → credit to)
- Apply coinbase transactions (miner rewards)

## Verification

After launching, verify your token on your node:

```bash
curl http://localhost:3000/chain
```

The genesis block should contain your allocations:

```json
{
  "index": 0,
  "hash": "000...",
  "data": {
    "name": "MyAwesomeCoin",
    "symbol": "MAC",
    "decimals": 18,
    "allocations": [ ... ]
  }
}
```

Check balances:

```bash
npm run cli -- status
```

Output includes:
```json
{
  "name": "Aethra",
  "version": "1.0.0",
  "chainLength": 1,
  "balances": {
    "03e8bc1c...": 1000000000000000000000000,
    "04b6c8a1...": 2000000000000000000000000
  }
}
```

## Next Steps

1. **Deploy a 2nd Node** — Connect nodes via P2P to create a network
2. **Transfer Tokens** — Send transactions between holders
3. **Export Genesis** — Share `data/genesis-export.json` with validators
4. **Explorer UI** — Build a web dashboard (see roadmap)
5. **Tokenomics** — Adjust mining rewards, difficulty, or inflation

## Troubleshooting

**Q: How do I change token allocations after launch?**
A: You can't. Genesis allocations are immutable. Delete `data/chain.json` and `data/state.json`, then re-run `token launch`.

**Q: How do I add more tokens after launch?**
A: Use mining rewards (coinbase transactions). Edit `src/miner.js` and `src/server.js` to adjust the `reward` parameter.

**Q: Can I use custom decimals?**
A: Yes. Decimals are just a display convention. Use any value (6, 8, 18, etc.).

---

For questions, see the main [README.md](../README.md) or check `examples/launch-token.js`.
