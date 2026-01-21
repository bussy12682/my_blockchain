const Blockchain = require('../src/blockchain');
const Block = require('../src/block');
const { mineBlock } = require('../src/miner');

test('replaceChain prefers higher total work over length', () => {
  const a = new Blockchain({ persist: false, difficulty: 1 });
  // Add 3 low-difficulty blocks to chain A
  let last = a.getLastBlock();
  for (let i = 0; i < 3; i++) {
    const b = mineBlock(last, [{ x: i }], 1);
    a.addBlock(b);
    last = a.getLastBlock();
  }

  const bChain = new Blockchain({ persist: false, difficulty: 3 });
  // Add 2 higher-difficulty blocks to chain B (shorter but higher work)
  last = bChain.getLastBlock();
  for (let i = 0; i < 2; i++) {
    const b = mineBlock(last, [{ y: i }], 3);
    bChain.addBlock(b);
    last = bChain.getLastBlock();
  }

  // Ensure chain lengths: a longer than b
  expect(a.chain.length).toBeGreaterThan(bChain.chain.length);
  // But bChain totalWork should be larger
  const workA = a.chain.reduce((acc, x) => acc + x.computeWork(), 0n);
  const workB = bChain.chain.reduce((acc, x) => acc + x.computeWork(), 0n);
  expect(workB).toBeGreaterThan(workA);

  // Replace a with bChain JSON — should succeed because total work is greater
  const ok = a.replaceChain(bChain.toJSON());
  expect(ok).toBe(true);
  expect(a.chain.length).toBe(bChain.chain.length);
});

test('difficulty adjusts up or down based on recent timestamps', () => {
  const bc = new Blockchain({ persist: false, difficulty: 2 });
  // create ADJUST_INTERVAL (5) blocks manually with very small span to force difficulty up
  const ADJUST_INTERVAL = 5;
  let last = bc.getLastBlock();
  const now = Date.now();
  for (let i = 1; i <= ADJUST_INTERVAL; i++) {
    // timestamps artificially close
    const ts = now + i * 10; // very fast
    const block = new Block({ index: last.index + 1, timestamp: ts, previousHash: last.hash, data: [], nonce: 0, difficulty: bc.difficulty });
    // compute a proper hash that respects difficulty by mining small nonces
    let nonce = 0;
    const target = '0'.repeat(bc.difficulty);
    let candidate = block;
    while (!candidate.hash.startsWith(target)) {
      nonce++;
      candidate = new Block({ index: block.index, timestamp: ts, previousHash: block.previousHash, data: [], nonce, difficulty: block.difficulty });
    }
    bc.addBlock(candidate);
    last = bc.getLastBlock();
  }

  // now difficulty should increase by 1
  const next = bc.getCurrentDifficulty();
  expect(next).toBe(bc.difficulty + 1);
});
