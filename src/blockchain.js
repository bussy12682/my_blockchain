const fs = require('fs');
const path = require('path');
const Block = require('./block');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CHAIN_FILE = path.join(DATA_DIR, 'chain.json');
const STATE_FILE = path.join(DATA_DIR, 'state.json');

class Blockchain {
  constructor({ difficulty = 4, persist = true } = {}) {
    this.difficulty = difficulty;
    this.chain = [];
    this.persist = !!persist;
    this.mempool = [];
    this.balances = {}; // address => BigInt

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR);
    }

    if (this.persist && fs.existsSync(CHAIN_FILE)) {
      try {
        const raw = fs.readFileSync(CHAIN_FILE, 'utf8');
        const arr = JSON.parse(raw);
        this.chain = arr.map(b => new Block(b));
        // compute initial totalWork
        this.totalWork = this.chain.reduce((acc, b) => acc + b.computeWork(), 0n);
        // reconstruct state from chain
        this.recomputeState();
      } catch (err) {
        console.warn('Failed to load chain data; creating genesis', err.message);
        this.chain = [Block.genesis({ difficulty: this.difficulty })];
        this.save();
      }
    } else {
      this.chain = [Block.genesis({ difficulty: this.difficulty })];
      this.totalWork = this.chain.reduce((acc, b) => acc + b.computeWork(), 0n);
      this.recomputeState();
      this.save();
    }
  }

  recomputeState() {
    // rebuild balances by replaying the chain from genesis
    const balances = {};
    for (const block of this.chain) {
      // genesis allocations support
      if (block.index === 0 && block.data && Array.isArray(block.data.allocations)) {
        for (const alloc of block.data.allocations) {
          const addr = alloc.address;
          const amt = BigInt(alloc.amount || 0);
          balances[addr] = (balances[addr] || 0n) + amt;
        }
      }
      // regular transactions
      if (Array.isArray(block.data)) {
        for (const tx of block.data) {
          const amount = BigInt(tx.amount || 0);
          if (!tx.fromAddress) {
            if (tx.toAddress) balances[tx.toAddress] = (balances[tx.toAddress] || 0n) + amount;
          } else {
            balances[tx.fromAddress] = (balances[tx.fromAddress] || 0n) - amount;
            balances[tx.toAddress] = (balances[tx.toAddress] || 0n) + amount;
          }
        }
      }
    }
    this.balances = balances;
  }

  getLastBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(block) {
    const last = this.getLastBlock();
    if (block.previousHash !== last.hash) {
      throw new Error('Invalid previous hash');
    }
    if (block.index !== last.index + 1) {
      throw new Error('Invalid index');
    }
    if (!this.isValidNewBlock(block, last)) {
      throw new Error('Block validation failed');
    }
    this.chain.push(block);
    // update totalWork
    if (!this.totalWork) this.totalWork = 0n;
    this.totalWork += block.computeWork();
    // update derived state
    try { this.recomputeState(); } catch (e) { /* ignore state rebuild failures */ }
    this.save();
    return block;
  }

  isValidNewBlock(candidate, previous) {
    if (previous.index + 1 !== candidate.index) return false;
    if (previous.hash !== candidate.previousHash) return false;
    if (candidate.computeHash() !== candidate.hash) return false;
    if (!candidate.hash.startsWith('0'.repeat(candidate.difficulty))) return false;

    // integrity checks for transactions in block
    if (Array.isArray(candidate.data)) {
      const Transaction = require('./transaction');
      // limit block size to avoid DoS (reasonable default)
      if (candidate.data.length > 5000) return false;
      for (const item of candidate.data) {
        try {
          const tx = new Transaction(item);
          if (!tx.isValid()) return false;
        } catch (err) {
          return false;
        }
      }
    }
    return true;
  }

  isValidChain(chain) {
    if (!chain || !Array.isArray(chain) || chain.length === 0) return false;

    // check genesis minimal properties (accept different genesis computations as long as it's mined properly)
    const first = chain[0];
    if (first.index !== 0) return false;
    if (typeof first.previousHash !== 'string' || first.previousHash.length === 0) return false;
    if (first.previousHash !== '0'.repeat(64)) return false;
    if (typeof first.hash !== 'string') return false;
    // recompute hash from block payload to ensure it matches stored hash
    try {
      const recomputedFirst = new Block(first).computeHash();
      if (recomputedFirst !== first.hash) return false;
    } catch (err) {
      return false;
    }
    if (!first.hash.startsWith('0'.repeat(first.difficulty || this.difficulty))) return false;

    // simulate balances while validating to prevent overspend in chain
    const tempBalances = {};
    // apply genesis allocations if present
    const firstBlock = chain[0];
    if (firstBlock.index === 0 && firstBlock.data && Array.isArray(firstBlock.data.allocations)) {
      for (const alloc of firstBlock.data.allocations) {
        tempBalances[alloc.address] = (tempBalances[alloc.address] || 0n) + BigInt(alloc.amount || 0);
      }
    }

    for (let i = 1; i < chain.length; i++) {
      const current = chain[i];
      const previous = chain[i - 1];
      if (current.previousHash !== previous.hash) return false;
      // make sure computeHash reflects stored hash
      const recomputed = new Block(current).computeHash();
      if (recomputed !== current.hash) return false;
      if (!current.hash.startsWith('0'.repeat(current.difficulty || this.difficulty))) return false;

      // If block contains transactions, ensure their signatures are valid and funds exist.
      if (Array.isArray(current.data) && current.data.length) {
        const Transaction = require('./transaction');
        for (const item of current.data) {
          try {
            const tx = new Transaction(item);
            if (!tx.isValid()) return false;
            const amount = BigInt(tx.amount || 0);
            if (!tx.fromAddress) {
              // coinbase -> credit
              if (tx.toAddress) tempBalances[tx.toAddress] = (tempBalances[tx.toAddress] || 0n) + amount;
            } else {
              const fromBal = tempBalances[tx.fromAddress] || 0n;
              if (fromBal < amount) return false; // overspend
              tempBalances[tx.fromAddress] = fromBal - amount;
              tempBalances[tx.toAddress] = (tempBalances[tx.toAddress] || 0n) + amount;
            }
          } catch (err) {
            return false;
          }
        }
      }
    }
    return true;
  }

  replaceChain(newChain) {
    if (!Array.isArray(newChain) || newChain.length === 0) return false;
    if (!this.isValidChain(newChain)) return false;

    const BlockClass = require('./block');
    const incomingWork = newChain.reduce((acc, b) => acc + new BlockClass(b).computeWork(), 0n);
    if (!this.totalWork) this.totalWork = this.chain.reduce((acc, b) => acc + b.computeWork(), 0n);
    if (incomingWork <= this.totalWork) return false;

    this.chain = newChain.map(b => new Block(b));
    this.totalWork = incomingWork;
    this.save();
    return true;
  }

  getCurrentDifficulty() {
    const ADJUST_INTERVAL = 5;
    const TARGET_TIME_MS = 2000; // target time per block in ms

    if (this.chain.length <= ADJUST_INTERVAL) return this.difficulty;
    if ((this.chain.length - 1) % ADJUST_INTERVAL !== 0) return this.difficulty;

    const lastIndex = this.chain.length - 1;
    const startTime = this.chain[lastIndex - ADJUST_INTERVAL].timestamp;
    const endTime = this.chain[lastIndex].timestamp;
    const actualSpan = endTime - startTime;
    const expectedSpan = ADJUST_INTERVAL * TARGET_TIME_MS;
    if (actualSpan <= expectedSpan / 2) return this.difficulty + 1;
    if (actualSpan >= expectedSpan * 2) return Math.max(1, this.difficulty - 1);
    return this.difficulty;
  }

  save() {
    if (!this.persist) return;
    try {
      fs.writeFileSync(CHAIN_FILE, JSON.stringify(this.chain, null, 2), 'utf8');
      // also persist state (balances)
      const stateData = {};
      for (const [addr, bal] of Object.entries(this.balances)) {
        stateData[addr] = bal.toString();
      }
      fs.writeFileSync(STATE_FILE, JSON.stringify(stateData, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to persist chain: ', err.message);
    }
  }

  toJSON() {
    return this.chain;
  }
}

module.exports = Blockchain;
