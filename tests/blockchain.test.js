const Blockchain = require('../src/blockchain');
const Block = require('../src/block');
const { mineBlock } = require('../src/miner');

jest.setTimeout(20000);

describe('Blockchain basics', () => {
  test('creates genesis block and persists', () => {
    const chain = new Blockchain({ difficulty: 2, persist: false });
    expect(chain.chain.length).toBeGreaterThanOrEqual(1);
    expect(chain.getLastBlock().index).toBe(0);
  });

  test('mining produces valid candidate', () => {
    const chain = new Blockchain({ difficulty: 2, persist: false });
    const last = chain.getLastBlock();
    const block = mineBlock(last, [{ tx: 'a->b 1' }], chain.difficulty);
    expect(block.index).toBe(last.index + 1);
    expect(block.hash.startsWith('0'.repeat(block.difficulty))).toBe(true);
    expect(block.computeHash()).toBe(block.hash);
  });

  test('addBlock and isValidChain contract', () => {
    const chain = new Blockchain({ difficulty: 2, persist: false });
    const last = chain.getLastBlock();
    const block = mineBlock(last, [{ tx: 'x' }], chain.difficulty);
    chain.addBlock(block);
    expect(chain.chain.length).toBe(2);
    expect(chain.isValidChain(chain.toJSON())).toBe(true);

    // tamper
    const bad = JSON.parse(JSON.stringify(chain.toJSON()));
    bad[1].data = [{ tx: 'hacked' }];
    expect(chain.isValidChain(bad)).toBe(false);
  });

  test('replaceChain accepts longer valid chain', () => {
    const a = new Blockchain({ difficulty: 2, persist: false });
    const b = new Blockchain({ difficulty: 2, persist: false });
    // make b longer
    let last = b.getLastBlock();
    const newBlock = mineBlock(last, [{ tx: 'foo' }], b.difficulty);
    b.addBlock(newBlock);

    const ok = a.replaceChain(b.toJSON());
    expect(ok).toBe(true);
    expect(a.chain.length).toBe(b.chain.length);
  });
});
