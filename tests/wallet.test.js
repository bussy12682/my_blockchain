const { createKeyPair, getPublicFromPrivate, keyFromPrivate } = require('../src/wallet');

test('createKeyPair returns keys that match', () => {
  const { privateKey, publicKey } = createKeyPair();
  const derived = getPublicFromPrivate(privateKey);
  expect(derived).toBe(publicKey);
});

test('keyFromPrivate yields usable key object', () => {
  const { privateKey, publicKey } = createKeyPair();
  const k = keyFromPrivate(privateKey);
  expect(k.getPublic('hex')).toBe(publicKey);
});
