const Block = require('./block');

function mineBlock(previousBlock, data, difficulty, minerAddress = null, reward = 50) {
  const index = previousBlock.index + 1;
  let nonce = 0;
  let timestamp = Date.now();
  // if minerAddress provided, add a coinbase tx as first transaction
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

  return block;
}

module.exports = { mineBlock };
