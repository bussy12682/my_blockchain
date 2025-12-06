const crypto = require('crypto');

class Block {
  constructor({ index, timestamp, previousHash, data, nonce = 0, difficulty = 4 }) {
    this.index = index;
    this.timestamp = timestamp || Date.now();
    this.previousHash = previousHash || '0'.repeat(64);
    this.data = data || [];
    this.nonce = nonce;
    this.difficulty = difficulty;
    this.hash = this.computeHash();
  }

  computeHash() {
    const payload = `${this.index}|${this.timestamp}|${this.previousHash}|${JSON.stringify(this.data)}|${this.nonce}|${this.difficulty}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  computeWork() {
    // simple deterministic work metric based on difficulty: exponential with difficulty
    // work = 2^difficulty (BigInt) — higher difficulty yields exponentially more work
    return BigInt(1) << BigInt(this.difficulty || 0);
  }

  static genesis({ difficulty = 4, data = [{ genesis: true }] } = {}) {
    // create a properly mined genesis block to satisfy difficulty
    const index = 0;
    const previousHash = '0'.repeat(64);
    let nonce = 0;
    let timestamp = Date.now();
    let b = new Block({ index, timestamp, previousHash, data, nonce, difficulty });
    const target = '0'.repeat(difficulty);
    while (!b.hash.startsWith(target)) {
      nonce++;
      timestamp = Date.now();
      b = new Block({ index, timestamp, previousHash, data, nonce, difficulty });
    }
    return b;
  }
}

module.exports = Block;
