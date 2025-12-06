const P2P = require('../src/p2p');
const Blockchain = require('../src/blockchain');
const { mineBlock } = require('../src/miner');

function wait(ms){ return new Promise(r => setTimeout(r, ms)); }

jest.setTimeout(20000);

test('two nodes sync a mined block over P2P', async () => {
  const aChain = new Blockchain({ persist: false, difficulty: 1 });
  const bChain = new Blockchain({ persist: false, difficulty: 1 });

  const aPort = 7101;
  const bPort = 7102;

  const aP2P = new P2P({ blockchain: aChain, port: aPort });
  const bP2P = new P2P({ blockchain: bChain, port: bPort });

  aP2P.startServer();
  bP2P.startServer();

  // connect A -> B
  aP2P.connectToPeer(`ws://127.0.0.1:${bPort}`);

  // allow time for connection handshake
  await wait(500);

  // mine a block on A
  const minerAddr = 'miner-test';
  const block = mineBlock(aChain.getLastBlock(), [{ hello: 'world' }], aChain.getCurrentDifficulty(), minerAddr, 10);
  aChain.addBlock(block);
  // broadcast new block
  aP2P.broadcast({ type: 'NEW_BLOCK', block });

  // give B some time to receive and process
  await wait(500);

  expect(bChain.chain.length).toBeGreaterThanOrEqual(aChain.chain.length);
  // check that B has at least one block with the coinbase to miner-test
  const found = bChain.chain.some(b => Array.isArray(b.data) && b.data[0] && b.data[0].toAddress === minerAddr);
  expect(found).toBe(true);

  // cleanup: shutdown P2P servers and sockets
  try { aP2P.shutdown(); } catch (e) {}
  try { bP2P.shutdown(); } catch (e) {}
});
