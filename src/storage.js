const fs = require('fs');
const path = require('path');
let level;
try {
  level = require('level');
} catch (err) {
  // level not available in this environment — we'll fall back to a simple filesystem-backed store
  level = null;
}

const DB_PATH = path.join(__dirname, '..', 'data', 'chaindb');

class Storage {
  constructor(dir = DB_PATH) {
    this.dir = dir;
    this.db = null;
  }

  async init() {
    if (this.db) return;
    if (level) {
      this.db = level(this.dir, { valueEncoding: 'json' });
      return;
    }
    // fallback: ensure directory exists
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
    this.db = { fallback: true };
  }

  async close() {
    if (!this.db) return;
    await this.db.close();
    this.db = null;
  }

  async saveBlock(block) {
    if (!this.db) await this.init();
    if (!this.db.fallback) {
      const key = `block:${block.index}`;
      await this.db.put(key, block);
      return;
    }
    // fallback write: write a JSON file per block for simplicity
    const file = path.join(this.dir, `block_${block.index}.json`);
    fs.writeFileSync(file, JSON.stringify(block, null, 2), 'utf8');
  }

  async getBlock(index) {
    if (!this.db) await this.init();
    if (!this.db.fallback) {
      try { return await this.db.get(`block:${index}`); } catch (err) { if (err.notFound) return null; throw err; }
    }
    const file = path.join(this.dir, `block_${index}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  async getAllBlocks() {
    if (!this.db) await this.init();
    const blocks = [];
    if (!this.db.fallback) {
      return new Promise((resolve, reject) => {
        this.db.createReadStream({ gt: 'block:', lt: 'block;'} )
          .on('data', ({ key, value }) => blocks.push(value))
          .on('error', (err) => reject(err))
          .on('end', () => resolve(blocks.sort((a,b) => a.index - b.index)));
      });
    }
    // fallback: read files named block_<idx>.json
    const files = fs.readdirSync(this.dir).filter(f => f.startsWith('block_') && f.endsWith('.json'));
    for (const f of files) {
      try {
        const p = path.join(this.dir, f);
        const content = JSON.parse(fs.readFileSync(p, 'utf8'));
        blocks.push(content);
      } catch (e) { /* ignore bad files */ }
    }
    return blocks.sort((a,b) => a.index - b.index);
  }

  async clear() {
    if (!this.db) await this.init();
    if (!this.db.fallback) {
      return new Promise((resolve, reject) => {
        const ops = [];
        this.db.createKeyStream({ gt: 'block:', lt: 'block;' })
          .on('data', (k) => ops.push({ type: 'del', key: k }))
          .on('error', (err) => reject(err))
          .on('end', async () => {
            try { await this.db.batch(ops); resolve(); } catch (e) { reject(e); }
          });
      });
    }
    // fallback: remove files
    const files = fs.readdirSync(this.dir).filter(f => f.startsWith('block_') && f.endsWith('.json'));
    for (const f of files) fs.unlinkSync(path.join(this.dir, f));
    return;
  }
}

module.exports = Storage;
