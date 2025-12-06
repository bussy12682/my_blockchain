const express = require('express');
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const Transaction = require('./transaction');
const { mineBlock } = require('./miner');

const app = express();
app.use(bodyParser.json());

const chain = new Blockchain({ difficulty: 3, persist: true });
let mempool = chain.mempool || [];
const P2P = require('./p2p');
const p2pPort = process.env.P2P_PORT || 7100;
const p2p = new P2P({ blockchain: chain, port: p2pPort });
// start P2P server
p2p.startServer();

app.get('/chain', (req, res) => {
  res.json({ length: chain.chain.length, chain: chain.toJSON() });
});

app.post('/mine', (req, res) => {
  const { data, minerAddress } = req.body || {};
  // pick payload: prefer provided data, otherwise use up to 50 txs from mempool
  const payload = Array.isArray(data) && data.length ? data : (mempool.length ? mempool.splice(0, 50) : [{ msg: 'empty' }]);
  const difficulty = chain.getCurrentDifficulty();
  const block = mineBlock(chain.getLastBlock(), payload, difficulty, minerAddress || process.env.MINER_ADDRESS || null);
  try {
    chain.addBlock(block);
    // broadcast new block to peers
    p2p.broadcast({ type: 'NEW_BLOCK', block });
    res.json({ success: true, block });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.get('/block/:index', (req, res) => {
  const idx = Number(req.params.index);
  const block = chain.chain.find(b => b.index === idx);
  if (!block) return res.status(404).json({ success: false, message: 'not found' });
  res.json({ success: true, block });
});

app.post('/tx/new', (req, res) => {
  const raw = req.body;
  if (!raw) return res.status(400).json({ success: false, message: 'empty payload' });
  try {
    const tx = new Transaction(raw);
    if (!tx.isValid()) return res.status(400).json({ success: false, message: 'invalid tx signature' });
    // dedupe mempool by tx hash
    const id = tx.computeHash();
    if (mempool.find(t => t.computeHash() === id)) return res.status(200).json({ success: true, mempoolLength: mempool.length, message: 'duplicate' });
    mempool.push(tx);
    // also broadcast transaction
    p2p.broadcast({ type: 'NEW_TX', tx });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  res.json({ success: true, mempoolLength: mempool.length });
});

app.post('/replace', (req, res) => {
  const { chain: newChain } = req.body;
  if (!Array.isArray(newChain)) return res.status(400).json({ success: false, message: 'chain must be an array' });
  const ok = chain.replaceChain(newChain);
  res.json({ success: !!ok });
});

app.post('/peer/connect', (req, res) => {
  const { address } = req.body || {};
  if (!address) return res.status(400).json({ success: false, message: 'address required' });
  p2p.connectToPeer(address);
  res.json({ success: true });
});

app.get('/peers', (req, res) => {
  // return count and remote addresses (best-effort)
  const peers = p2p.sockets.map((s) => (s._socket && s._socket.remoteAddress) || 'unknown');
  res.json({ success: true, count: p2p.sockets.length, peers });
});

app.get('/status', (req, res) => {
  res.json({ name: 'Aethra', version: '1.0.0', chainLength: chain.chain.length });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`Aethra node running on ${HOST}:${PORT} — (v1.0.0)`));

module.exports = app;
