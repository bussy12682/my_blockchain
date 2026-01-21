const path = require('path');

// Prefer worker_threads for non-blocking mining; fall back to synchronous mining
function mineBlock(previousBlock, data, difficulty, minerAddress = null, reward = 50) {
  // try to use worker thread
  try {
    const { Worker } = require('worker_threads');
    const Block = require('./block');
    const workerPath = path.join(__dirname, 'miner_worker.js');
    return new Promise((resolve, reject) => {
      const worker = new Worker(workerPath, { workerData: { previousBlock, data, difficulty, minerAddress, reward } });
      worker.on('message', (blockObj) => {
        // Convert plain object returned from worker back to Block instance
        const block = new Block(blockObj);
        resolve(block);
      });
      worker.on('error', (err) => reject(err));
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error('Mining worker stopped with exit code ' + code));
      });
    });
  } catch (err) {
    // worker_threads not available — fall back to synchronous mining (blocking)
    console.warn('worker_threads not available — running blocking miner');
    const Block = require('./block');
    const index = previousBlock.index + 1;
    let nonce = 0;
    let timestamp = Date.now();
    let payload = data || [];
    if (minerAddress) {
      const coinbase = { fromAddress: null, toAddress: minerAddress, amount: reward, timestamp: Date.now() };
      payload = [coinbase].concat(payload);
    }
    let block = new Block({ index, timestamp, previousHash: previousBlock.hash, data: payload, nonce, difficulty });
    const target = '0'.repeat(difficulty);
    while (!block.hash.startsWith(target)) {
      nonce++;
      timestamp = Date.now();
      block = new Block({ index, timestamp, previousHash: previousBlock.hash, data: payload, nonce, difficulty });
    }
    return Promise.resolve(block);
  }
}

module.exports = { mineBlock };
