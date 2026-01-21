#!/usr/bin/env node
const path = require('path');
const Blockchain = require('./blockchain');
const { mineBlock } = require('./miner');

const argv = process.argv.slice(2);
const axios = require('axios');
const { createKeyPair, keyFromPrivate, getPublicFromPrivate } = require('./wallet');
const Transaction = require('./transaction');

function usage() {
  console.log('Aethra CLI — v1.0.0');
  console.log('Commands:');
  console.log('  init                 Initialize local chain (genesis)');
  console.log('  mine <json>          Mine a new block with JSON payload');
  console.log('  tx <json>            Send a transaction JSON to local node (POST /tx/new)');
  console.log('  view                 Print chain summary');
  console.log('  status               Print node status');
  console.log('  token <subcommand>   Tokenomics tools (design, show, save, launch)');
}

(async function main(){
  const cmd = argv[0];
  const chain = new Blockchain({ difficulty: 3, persist: true });

  try {
    if (!cmd || cmd === 'help') return usage();
    if (cmd === 'init') {
      console.log('Chain already initialized at data/chain.json (if missing, created)');
      console.log('Genesis index:', chain.getLastBlock().index === 0 ? 'confirmed' : 'present');
      return;
    }

    if (cmd === 'view') {
      const list = chain.toJSON();
      list.forEach(b => console.log(`#${b.index} ${b.hash.slice(0,16)}.. prev=${b.previousHash.slice(0,16)}.. data=${JSON.stringify(b.data)}`));
      return;
    }

    if (cmd === 'status') {
      console.log(JSON.stringify({ name: 'Aethra', version: '1.0.0', chainLength: chain.chain.length, balances: chain.balances }, null, 2));
      return;
    }

    if (cmd === 'genesis') {
      const sub = argv[1];
      if (!sub || sub === 'help') {
        console.log('genesis commands: create <json-string> | show');
        return;
      }
      if (sub === 'show') {
        console.log(JSON.stringify(chain.chain[0], null, 2));
        return;
      }
      if (sub === 'create') {
        const raw = argv.slice(2).join(' ');
        let obj;
        try { obj = JSON.parse(raw || '{}'); } catch (err) { return console.error('invalid JSON payload for genesis'); }
        const Block = require('./block');
        const difficulty = obj.difficulty || chain.difficulty || 3;
        const genData = {};
        if (obj.allocations) genData.allocations = obj.allocations;
        if (obj.totalSupply) genData.totalSupply = obj.totalSupply;
        const genesis = Block.genesis({ difficulty, data: genData });
        // replace current genesis and save
        chain.chain[0] = genesis;
        chain.save();
        try { chain.recomputeState(); } catch (e) { /* ignore */ }
        console.log('Wrote new genesis block to data/chain.json');
        return;
      }
      return;
    }

    if (cmd === 'mine') {
      const raw = argv.slice(1).join(' ');
      let payload;
      try { payload = JSON.parse(raw || '[]'); } catch (err) { payload = [{ msg: raw || 'manual-mine' }]; }

      console.log('Mining — this may take a second...');
      const block = mineBlock(chain.getLastBlock(), payload, chain.difficulty);
      try {
        chain.addBlock(block);
        console.log('Mined block', block.index, block.hash);
      } catch (err) {
        console.error('Failed to add block:', err.message);
      }
      return;
    }

    if (cmd === 'tx') {
      const raw = argv.slice(1).join(' ');
      let payload;
      try { payload = JSON.parse(raw || '{}'); } catch (err) { payload = { raw } }

      try {
        const res = await axios.post('http://127.0.0.1:3000/tx/new', payload, { timeout: 3000 });
        console.log('Posted to node:', res.data);
      } catch (err) {
        console.error('Failed to post tx (is a node running on localhost:3000?):', err.message);
      }
      return;
    }

    if (cmd === 'peer') {
      const sub = argv[1];
      if (!sub || sub === 'help') {
        console.log('peer commands: connect <ws://host:port> | list');
        return;
      }
      if (sub === 'connect') {
        const address = argv[2];
        if (!address) return console.error('address required');
        try { const res = await axios.post('http://127.0.0.1:3000/peer/connect', { address }); console.log(res.data); } catch (err) { console.error(err.message); }
        return;
      }

      if (sub === 'list' || sub === 'peers') {
        try { const res = await axios.get('http://127.0.0.1:3000/peers'); console.log(JSON.stringify(res.data, null, 2)); } catch (err) { console.error(err.message); }
        return;
      }
    }

    if (cmd === 'wallet') {
      const sub = argv[1];
      if (!sub || sub === 'help') {
        console.log('wallet commands: create | pub <privateKey> | sign <privateKey> <tx-json>');
        return;
      }

      if (sub === 'create') {
        const kp = createKeyPair();
        console.log('privateKey:', kp.privateKey);
        console.log('publicKey :', kp.publicKey);
        return;
      }

      if (sub === 'pub') {
        const priv = argv[2];
        if (!priv) return console.error('privateKey required');
        try { console.log(getPublicFromPrivate(priv)); } catch (err) { console.error('invalid private key', err.message); }
        return;
      }

      if (sub === 'sign') {
        const priv = argv[2];
        const raw = argv.slice(3).join(' ');
        if (!priv) return console.error('privateKey required');
        let txObj;
        try { txObj = JSON.parse(raw || '{}'); } catch (err) { txObj = { raw }; }
        const key = keyFromPrivate(priv);
        const pub = key.getPublic('hex');
        const tx = new Transaction(Object.assign({}, txObj, { fromAddress: pub }));
        try { tx.signTransaction(key); console.log(JSON.stringify(tx, null, 2)); } catch (err) { console.error('sign failed:', err.message); }
        return;
      }
    }

    if (cmd === 'token') {
      const Tokenomics = require('./tokenomics');
      const sub = argv[1];
      const fs = require('fs');
      const path = require('path');
      const TOKEN_FILE = path.join(__dirname, '..', 'data', 'tokenomics.json');

      if (!sub || sub === 'help') {
        console.log('token commands:');
        console.log('  design <name> <symbol> <decimals>  Create new token design');
        console.log('  add <addr> <amount>                Add allocation to current design');
        console.log('  show                                Show current token design');
        console.log('  save                                Save token design to data/tokenomics.json');
        console.log('  launch <difficulty>                Launch genesis with current design');
        return;
      }

      if (sub === 'design') {
        const name = argv[2] || 'MyToken';
        const symbol = argv[3] || 'MTK';
        const decimals = parseInt(argv[4]) || 18;
        const tok = new Tokenomics(name, symbol, decimals);
        console.log(`Designed token: ${name} (${symbol}) with ${decimals} decimals`);
        fs.writeFileSync(TOKEN_FILE, JSON.stringify(tok.toJSON(), null, 2), 'utf8');
        console.log(`Saved to ${TOKEN_FILE}`);
        return;
      }

      if (sub === 'add') {
        const addr = argv[2];
        const amount = argv[3];
        if (!addr || !amount) return console.error('address and amount required');
        let tok;
        if (fs.existsSync(TOKEN_FILE)) {
          const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
          tok = Tokenomics.fromJSON(data);
        } else {
          tok = new Tokenomics('MyToken', 'MTK', 18);
        }
        tok.addAllocation(addr, amount);
        fs.writeFileSync(TOKEN_FILE, JSON.stringify(tok.toJSON(), null, 2), 'utf8');
        console.log(`Added allocation: ${addr} += ${amount}`);
        console.log(`New total supply: ${tok.totalSupply.toString()}`);
        return;
      }

      if (sub === 'show') {
        if (!fs.existsSync(TOKEN_FILE)) {
          console.log('No token design found; use: token design <name> <symbol> <decimals>');
          return;
        }
        const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      if (sub === 'save') {
        if (!fs.existsSync(TOKEN_FILE)) {
          console.log('No token design found; use: token design <name> <symbol> <decimals>');
          return;
        }
        console.log('Token design already saved to data/tokenomics.json');
        return;
      }

      if (sub === 'launch') {
        if (!fs.existsSync(TOKEN_FILE)) {
          console.log('No token design found; use: token design <name> <symbol> <decimals>');
          return;
        }
        const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
        const tok = Tokenomics.fromJSON(data);
        const difficulty = parseInt(argv[2]) || 3;
        const Block = require('./block');
        const genesis = Block.genesis({ difficulty, data: tok.toGenesisData() });
        chain.chain[0] = genesis;
        chain.save();
        try { chain.recomputeState(); } catch (e) { /* ignore */ }
        console.log(`Launched token genesis: ${tok.name} (${tok.symbol})`);
        console.log(`Total supply: ${tok.totalSupply.toString()}`);
        console.log(`Allocations: ${tok.allocations.length}`);
        console.log(`Genesis saved to data/chain.json`);
        return;
      }
    }

    usage();
  } catch (err) {
    console.error('CLI error:', err.message);
  }
})();
