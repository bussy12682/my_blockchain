const { parentPort, workerData } = require('worker_threads');
const Block = require('./block');

(async () => {
  try {
    const { previousBlock, data, difficulty, minerAddress, reward } = workerData || {};
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
    // send the mined block back to the parent as a plain object
    parentPort.postMessage(Object.assign({}, block));
  } catch (err) {
    parentPort.postMessage({ error: err.message || String(err) });
  }
})();
