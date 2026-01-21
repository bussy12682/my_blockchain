const Storage = require('../src/storage');
const Block = require('../src/block');
const fs = require('fs');
const path = require('path');

jest.setTimeout(10000);

describe('LevelDB storage', () => {
  const dbPath = path.join(__dirname, '..', 'data', 'chaindb');
  const storage = new Storage(dbPath);

  afterAll(async () => {
    try { await storage.clear(); await storage.close(); } catch (e) { /* ignore */ }
  });

  test('can save and retrieve blocks', async () => {
    await storage.init();
    const b1 = new Block({ index: 0, timestamp: Date.now(), previousHash: '0'.repeat(64), data: [{genesis:true}], nonce: 0, difficulty: 1});
    const b2 = new Block({ index: 1, timestamp: Date.now()+1000, previousHash: b1.hash, data: [{x:1}], nonce: 0, difficulty: 1 });
    await storage.saveBlock(b1);
    await storage.saveBlock(b2);

    const loaded = await storage.getAllBlocks();
    expect(Array.isArray(loaded)).toBe(true);
    expect(loaded.length).toBeGreaterThanOrEqual(2);
    expect(loaded.find(b => b.index === 1).previousHash).toBe(b1.hash);
  });
});
