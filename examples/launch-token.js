#!/usr/bin/env node
/**
 * Example: Launch a token with Aethra blockchain
 * This script demonstrates how to:
 * 1. Create a token design (name, symbol, decimals)
 * 2. Add allocations (founder, community, team, etc.)
 * 3. Create and launch the genesis block
 * 4. Export the genesis for sharing/deployment
 */

const Tokenomics = require('../src/tokenomics');
const Block = require('../src/block');
const Blockchain = require('../src/blockchain');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

async function launchToken() {
  console.log('===== Aethra Token Launch Example =====\n');

  // Step 1: Design the token
  console.log('Step 1: Designing token...');
  const token = new Tokenomics('Aethra Coin', 'AETH', 18);
  console.log(`Created: ${token.name} (${token.symbol}), ${token.decimals} decimals\n`);

  // Step 2: Add allocations
  console.log('Step 2: Creating genesis allocations...');
  const allocations = [
    { address: '03e8bc1c...(founder1)', amount: '1000000000000000000000000' }, // 1M tokens
    { address: '02f4a2d5...(founder2)', amount: '500000000000000000000000' },  // 500k tokens
    { address: '04b6c8a1...(community)', amount: '2000000000000000000000000' }, // 2M tokens
    { address: '05c7d9b2...(team)', amount: '1500000000000000000000000' },     // 1.5M tokens
  ];

  for (const { address, amount } of allocations) {
    token.addAllocation(address, amount);
  }
  console.log(`Total supply: ${(token.totalSupply / BigInt(10 ** 18)).toString()} tokens`);
  console.log(`Allocations: ${token.allocations.length}\n`);

  // Step 3: Create genesis block
  console.log('Step 3: Mining genesis block (difficulty=3)...');
  const genesis = Block.genesis({
    difficulty: 3,
    data: token.toGenesisData()
  });
  console.log(`Genesis block mined: ${genesis.hash}\n`);

  // Step 4: Initialize blockchain with genesis
  console.log('Step 4: Initializing blockchain...');
  const chain = new Blockchain({ difficulty: 3, persist: true });
  chain.chain[0] = genesis;
  chain.save();
  chain.recomputeState();
  console.log(`Blockchain initialized with ${chain.chain.length} block`);
  console.log(`Tracked balances: ${Object.keys(chain.balances).length}\n`);

  // Step 5: Export genesis for sharing
  console.log('Step 5: Exporting genesis...');
  const genesisExport = {
    timestamp: Date.now(),
    chain_name: token.name,
    symbol: token.symbol,
    total_supply: token.totalSupply.toString(),
    genesis_block: genesis,
    allocations: token.allocations
  };

  const exportPath = path.join(DATA_DIR, 'genesis-export.json');
  fs.writeFileSync(exportPath, JSON.stringify(genesisExport, null, 2), 'utf8');
  console.log(`Genesis exported to: ${exportPath}\n`);

  // Step 6: Summary
  console.log('===== Launch Summary =====');
  console.log(`Token Name: ${token.name}`);
  console.log(`Symbol: ${token.symbol}`);
  console.log(`Total Supply: ${(token.totalSupply / BigInt(10 ** token.decimals)).toString()}`);
  console.log(`Genesis Hash: ${genesis.hash}`);
  console.log(`Chain File: data/chain.json`);
  console.log(`State File: data/state.json`);
  console.log(`Export File: ${exportPath}`);
  console.log('\n✓ Token launch complete! You can now:');
  console.log('  - Start a node: npm run start');
  console.log('  - Send transactions: npm run cli -- tx <json>');
  console.log('  - Mine blocks: npm run cli -- mine <json>');
  console.log('  - Share genesis-export.json with other nodes');
}

launchToken().catch(err => {
  console.error('Launch failed:', err.message);
  process.exit(1);
});
