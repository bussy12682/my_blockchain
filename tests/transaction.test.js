const { createKeyPair, keyFromPrivate } = require('../src/wallet');
const Transaction = require('../src/transaction');

test('transaction signs and verifies', () => {
  const { privateKey, publicKey } = createKeyPair();
  const key = keyFromPrivate(privateKey);

  const tx = new Transaction({ fromAddress: publicKey, toAddress: 'someone', amount: 10 });
  tx.signTransaction(key);
  expect(typeof tx.signature).toBe('string');
  expect(tx.isValid()).toBe(true);
});

test('tampered transaction fails verification', () => {
  const { privateKey, publicKey } = createKeyPair();
  const key = keyFromPrivate(privateKey);
  const tx = new Transaction({ fromAddress: publicKey, toAddress: 'someone', amount: 10 });
  tx.signTransaction(key);
  // tamper
  tx.amount = 9000;
  expect(tx.isValid()).toBe(false);
});
