const Blockchain = require('../src/blockchain');
const Block = require('../src/block');
const { createKeyPair, keyFromPrivate } = require('../src/wallet');
const Transaction = require('../src/transaction');

test('genesis allocations are applied to balances', () => {
  const alloc1 = createKeyPair();
  const alloc2 = createKeyPair();
  const allocations = [
    { address: alloc1.publicKey, amount: "1000" },
    { address: alloc2.publicKey, amount: "500" }
  ];

  const chain = new Blockchain({ difficulty: 1, persist: false });
  const genesis = Block.genesis({ difficulty: 1, data: { allocations, totalSupply: "1500" } });
  chain.chain[0] = genesis;
  chain.recomputeState();

  expect(chain.balances[alloc1.publicKey].toString()).toBe('1000');
  expect(chain.balances[alloc2.publicKey].toString()).toBe('500');
});

test('spend from genesis allocation and validate balances', () => {
  const a = createKeyPair();
  const b = createKeyPair();
  const allocations = [ { address: a.publicKey, amount: "1000" } ];

  const chain = new Blockchain({ difficulty: 1, persist: false });
  const genesis = Block.genesis({ difficulty: 1, data: { allocations } });
  chain.chain[0] = genesis;
  chain.recomputeState();

  // create tx from a -> b for 200
  const tx = new Transaction({ fromAddress: a.publicKey, toAddress: b.publicKey, amount: 200 });
  const key = keyFromPrivate(a.privateKey);
  tx.signTransaction(key);

  // create a block containing tx (and coinbase)
  const minerAddr = createKeyPair();
  const coinbase = { fromAddress: null, toAddress: minerAddr.publicKey, amount: 50 };
  const payload = [coinbase, tx];
  const newBlock = require('../src/miner').mineBlock(chain.getLastBlock(), payload, chain.difficulty);
  chain.addBlock(newBlock);

  // recomputed balances
  expect(chain.balances[a.publicKey].toString()).toBe('800');
  expect(chain.balances[b.publicKey].toString()).toBe('200');
  expect(chain.balances[minerAddr.publicKey].toString()).toBe('50');
});
