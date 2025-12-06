# Aethra Tokenomics & Mining Rewards

## Overview
Aethra's token economics are designed to incentivize miners (validators) to secure the network through Proof of Work mining. This document explains the gains and incentives for network participants.

## Mining Rewards (The "Gain")

### Block Reward
- **Current block reward: 50 tokens per block**
- Miners receive 50 tokens as a "coinbase transaction" (newly minted tokens) when they successfully mine a block
- This is created fresh — no pre-existing tokens are transferred

### How Mining Works (Miner's Gain)

1. **Mine a block** via the `/mine` endpoint:
   ```bash
   curl -X POST http://localhost:3000/mine \
     -H "Content-Type: application/json" \
     -d '{"minerAddress":"0xYourAddress"}'
   ```

2. **Solve the Proof of Work puzzle**: difficulty increases as more blocks are mined
   - Default starting difficulty: ~4 leading zeros in block hash
   - Adjusted per block based on chain state

3. **Receive 50 tokens** when your block is accepted:
   - Tokens appear as a coinbase transaction (from: null, to: your address, amount: 50)
   - Broadcast to all peers
   - Become part of permanent immutable ledger

### Example Timeline
```
Block 1: Miner A mines successfully → Receives 50 tokens (balance: 50)
Block 2: Miner B mines successfully → Receives 50 tokens (balance: 50)
Block 3: Miner A mines successfully → Receives 50 tokens (balance: 100)
...
```

## Transaction Fees (Optional Future Enhancement)

Currently, transactions do **not** charge fees, but this can be added:
- Add a `fee` field to transactions
- Miner collects fee from each transaction included in their block
- Example: if 10 txs with 0.1 token fee each are included, miner gets 50 (block reward) + 1 (fees) = 51 tokens

## Token Supply Economics

### Initial Supply
- **Determined at genesis** via `tokenomics.js`
- Can pre-allocate tokens to addresses (founders, treasury, etc.)
- Set via `Tokenomics.addAllocations()`

### Ongoing Supply Growth
- **Inflationary model** (like Bitcoin, Ethereum)
- Each mined block adds 50 new tokens to total supply
- No maximum cap currently; can be added if desired

### Example Supply Growth
```
Genesis: 0 tokens (or pre-allocation)
After 100 blocks: 5,000 tokens mined
After 1,000 blocks: 50,000 tokens mined
After 1 year (≈5,000 blocks at 1 block/min): 250,000 tokens in circulation
```

## Why People Participate (The Incentive)

### Miners
- **Direct gain**: 50 tokens per block mined
- **Network security**: Proof of Work makes 51% attacks expensive
- **Arbitrage**: If token value increases, mining becomes more profitable
- **Long-term value**: Early miners accumulate tokens before mainstream adoption

### Users/Traders
- **Hold tokens**: Speculate on price appreciation
- **Transfer value**: Send tokens to others peer-to-peer
- **Participate in governance** (future): vote with tokens on protocol upgrades
- **Use in applications**: Apps built on Aethra may use tokens as in-app currency

### Nodes (Non-mining)
- **Validate transactions**: Ensure network integrity
- **Gossip protocol**: Relay blocks/txs to peers
- **Decentralization**: Run your own copy of ledger, reduce dependence on centralized servers

## Configuring Tokenomics

### Change Block Reward
Edit `src/miner.js`:
```javascript
function mineBlock(previousBlock, data, difficulty, minerAddress = null, reward = 50) {
  // Change 50 to your desired reward (e.g., 10, 100, etc.)
```

Or pass it at runtime:
```bash
# In your mining client, call mineBlock with custom reward:
mineBlock(lastBlock, payload, difficulty, address, customReward)
```

### Set Initial Token Allocations
Use `scripts/import-genesis.js` or define via `Tokenomics`:
```javascript
const tok = new Tokenomics('Aethra', 'ATH', 18);
tok.addAllocations([
  { address: '0xFounder1', amount: '1000000000000000000000000' }, // 1M tokens
  { address: '0xFounder2', amount: '500000000000000000000000' },   // 500k tokens
]);
```

## Halving Schedule (Optional)

Like Bitcoin, you can reduce block rewards over time:
```javascript
// Example: halve reward every 210,000 blocks
function getBlockReward(blockHeight) {
  let reward = 50;
  let halvings = Math.floor(blockHeight / 210000);
  return reward / (2 ** halvings);
}
```

## Economic Model Comparison

| Feature | Aethra (Current) | Bitcoin | Ethereum |
|---------|------------------|---------|----------|
| Reward Type | Coinbase + Fees (fees optional) | Coinbase + Fees | Coinbase + Fees |
| Initial Reward | 50 tokens | 50 BTC | 2 ETH |
| Adjustment | Not yet implemented | Every 210k blocks | Every epoch (~6.5 min) |
| Max Supply | Unlimited (can cap) | 21M BTC | Unlimited |
| Mining Algorithm | PoW (adjustable difficulty) | SHA-256 PoW | (Ethereum uses PoS now) |

## Launch Roadmap for Economics

1. **Phase 1 (Current)**: Fixed 50 token block reward, no fees
2. **Phase 2**: Add transaction fee collection
3. **Phase 3**: Implement reward halving schedule
4. **Phase 4**: Add governance voting weighted by token balance
5. **Phase 5**: Staking rewards (optional transition to PoS)

## Key Takeaway

**The gain for miners is simple: 50 tokens per block successfully mined.**

- This incentivizes people to contribute compute power to secure the network
- As the network grows and token value increases, mining becomes more profitable
- Early adopters (miners) accumulate tokens before mass adoption
- This is exactly how Bitcoin incentivized the first miners in 2009

---

**Questions?** Adjust `reward = 50` in `src/miner.js` or contact developers.
