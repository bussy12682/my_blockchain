const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const genPath = path.join(dataDir, 'genesis-export.json');
const chainPath = path.join(dataDir, 'chain.json');

if (!fs.existsSync(genPath)) {
  console.error('genesis-export.json not found in data/');
  process.exit(1);
}

const g = JSON.parse(fs.readFileSync(genPath, 'utf8'));
if (!g.genesis_block) {
  console.error('invalid genesis-export.json: missing genesis_block');
  process.exit(1);
}

// write chain as an array containing the genesis block
fs.writeFileSync(chainPath, JSON.stringify([g.genesis_block], null, 2), 'utf8');
console.log('Imported genesis into data/chain.json');
