const Tokenomics = require('../src/tokenomics');

test('create tokenomics with name, symbol, decimals', () => {
  const tok = new Tokenomics('MyToken', 'MTK', 18);
  expect(tok.name).toBe('MyToken');
  expect(tok.symbol).toBe('MTK');
  expect(tok.decimals).toBe(18);
  expect(tok.totalSupply).toBe(BigInt(0));
});

test('add allocations and compute total supply', () => {
  const tok = new Tokenomics('MyToken', 'MTK', 18);
  tok.addAllocation('addr1', '1000000000000000000');
  tok.addAllocation('addr2', '500000000000000000');
  expect(tok.totalSupply.toString()).toBe('1500000000000000000');
  expect(tok.allocations.length).toBe(2);
});

test('export to genesis data format', () => {
  const tok = new Tokenomics('MyToken', 'MTK', 18);
  tok.addAllocation('addr1', '1000');
  const genesisData = tok.toGenesisData();
  expect(genesisData.name).toBe('MyToken');
  expect(genesisData.symbol).toBe('MTK');
  expect(genesisData.decimals).toBe(18);
  expect(genesisData.allocations.length).toBe(1);
  expect(genesisData.allocations[0].address).toBe('addr1');
});

test('serialize and deserialize from JSON', () => {
  const tok1 = new Tokenomics('TestCoin', 'TST', 8);
  tok1.addAllocation('alice', '5000');
  tok1.addAllocation('bob', '3000');
  
  const json = tok1.toJSON();
  const tok2 = Tokenomics.fromJSON(json);
  
  expect(tok2.name).toBe('TestCoin');
  expect(tok2.symbol).toBe('TST');
  expect(tok2.decimals).toBe(8);
  expect(tok2.totalSupply.toString()).toBe('8000');
  expect(tok2.allocations.length).toBe(2);
});
