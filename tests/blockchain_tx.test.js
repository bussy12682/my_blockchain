const Blockchain = require('../src/blockchain');
const Block = require('../src/block');
const { createKeyPair, keyFromPrivate } = require('../src/wallet');
const Transaction = require('../src/transaction');

test('blocks with invalid transactions are rejected', () => {
  const chain = new Blockchain({ persist: false, difficulty: 2 });
  const last = chain.getLastBlock();
  const { privateKey, publicKey } = createKeyPair();
  const key = keyFromPrivate(privateKey);

  const tx = new Transaction({ fromAddress: publicKey, toAddress: 'bob', amount: 5 });
  tx.signTransaction(key);

  const b2 = new Block({ index: last.index + 1, previousHash: last.hash, data: [tx], difficulty: chain.difficulty });

  // tamper signature
  b2.data[0].signature = 'deadbeef';
  // compute hash after tamper
  b2.hash = b2.computeHash();

  expect(() => chain.addBlock(b2)).toThrow();
});
