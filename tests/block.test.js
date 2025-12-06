const Block = require('../src/block');

test('block computes hash deterministically', () => {
  const b = new Block({ index: 1, timestamp: 12345, previousHash: 'abc', data: [{ x: 1 }], nonce: 5, difficulty: 2 });
  const h1 = b.computeHash();
  const h2 = b.computeHash();
  expect(h1).toBe(h2);
  expect(typeof h1).toBe('string');
  expect(h1.length).toBe(64);
});

test('genesis is valid zero-prefixed', () => {
  const g = Block.genesis({ difficulty: 2 });
  expect(g.hash.startsWith('00')).toBe(true);
  expect(g.index).toBe(0);
});
