const Blockchain = require('../src/blockchain');
const { mineBlock } = require('../src/miner');

test('mined block includes coinbase transaction when minerAddress provided', () => {
  const chain = new Blockchain({ persist: false, difficulty: 1 });
  const miner = 'abcdef1234';
  const block = mineBlock(chain.getLastBlock(), [{ msg: 'tx' }], chain.getCurrentDifficulty(), miner, 100);
  // coinbase should be first transaction
  expect(Array.isArray(block.data)).toBe(true);
  expect(block.data[0].fromAddress).toBeNull();
  expect(block.data[0].toAddress).toBe(miner);
  expect(block.data[0].amount).toBe(100);
});