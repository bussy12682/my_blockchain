const Tokenomics = require('../src/tokenomics');
const Block = require('../src/block');
const Blockchain = require('../src/blockchain');
const { createKeyPair } = require('../src/wallet');

test('complete token launch workflow', () => {
  // Step 1: Design token
  const token = new Tokenomics('LaunchCoin', 'LAUNCH', 18);
  expect(token.name).toBe('LaunchCoin');
  expect(token.symbol).toBe('LAUNCH');

  // Step 2: Add allocations
  const addr1 = createKeyPair();
  const addr2 = createKeyPair();
  token.addAllocation(addr1.publicKey, '1000000000000000000000000');
  token.addAllocation(addr2.publicKey, '500000000000000000000000');

  expect(token.allocations.length).toBe(2);
  expect(token.totalSupply.toString()).toBe('1500000000000000000000000');

  // Step 3: Mine genesis
  const genesis = Block.genesis({
    difficulty: 2,
    data: token.toGenesisData()
  });
  expect(genesis.index).toBe(0);
  expect(genesis.hash.startsWith('00')).toBe(true);

  // Step 4: Create blockchain with genesis
  const chain = new Blockchain({ difficulty: 2, persist: false });
  chain.chain[0] = genesis;
  chain.recomputeState();

  // Verify balances
  expect(chain.balances[addr1.publicKey].toString()).toBe('1000000000000000000000000');
  expect(chain.balances[addr2.publicKey].toString()).toBe('500000000000000000000000');

  // Step 5: Verify genesis data
  const genesisData = genesis.data;
  expect(genesisData.name).toBe('LaunchCoin');
  expect(genesisData.totalSupply).toBe('1500000000000000000000000');
  expect(genesisData.allocations.length).toBe(2);
});

test('token launch prevents overspend during chain validation', () => {
  const token = new Tokenomics('SafeCoin', 'SAFE', 18);
  const addr = createKeyPair();
  token.addAllocation(addr.publicKey, '100');

  const genesis = Block.genesis({ difficulty: 1, data: token.toGenesisData() });
  const chain = new Blockchain({ difficulty: 1, persist: false });
  chain.chain[0] = genesis;

  // Create a chain that tries to overspend
  const invalidChain = [
    genesis,
    {
      index: 1,
      hash: '00abc',
      previousHash: genesis.hash,
      timestamp: Date.now(),
      nonce: 0,
      difficulty: 1,
      data: [
        {
          fromAddress: addr.publicKey,
          toAddress: '0x999',
          amount: 150,
          signature: 'fake'
        }
      ]
    }
  ];

  // Validation should fail due to overspend
  const isValid = chain.isValidChain(invalidChain);
  expect(isValid).toBe(false);
});
