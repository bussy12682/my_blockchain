const express = require('express');
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const Transaction = require('./transaction');
const { mineBlock } = require('./miner');
const { validatePayload } = require('./validator');

const app = express();
app.use(bodyParser.json({ limit: '128kb' }));

// simple in-memory rate limiter (per IP) — protects write endpoints
const _rateMap = new Map();
function rateLimiter(req, res, next) {
  try {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const WINDOW_MS = 60 * 1000; // 1 minute
    const MAX = 120; // max requests per window
    let entry = _rateMap.get(key);
    if (!entry || now - entry.start > WINDOW_MS) {
      entry = { count: 1, start: now };
      _rateMap.set(key, entry);
    } else {
      entry.count++;
      if (entry.count > MAX) return res.status(429).json({ success: false, message: 'rate limit exceeded' });
    }
  } catch (e) {
    // on error, don't block request
  }
  next();
}

// apply rate limiter globally
app.use(rateLimiter);

const chain = new Blockchain({ difficulty: 3, persist: true });
// centralize mempool on chain so P2P and HTTP share same mempool instance
chain.mempool = chain.mempool || [];
let mempool = chain.mempool;
const P2P = require('./p2p');
const p2pPort = process.env.P2P_PORT || 7100;
const p2p = new P2P({ blockchain: chain, port: p2pPort });
// start P2P server
p2p.startServer();

app.get('/chain', (req, res) => {
  res.json({ length: chain.chain.length, chain: chain.toJSON() });
});

app.post('/mine', async (req, res) => {
  try {
    validatePayload(req.body || {}, 'mine');
  } catch (err) {
    return res.status(400).json({ success: false, message: 'validation error: ' + err.message });
  }
  const { data, minerAddress } = req.body || {};
  // pick payload: prefer provided data, otherwise use up to 50 txs from mempool
  const payload = Array.isArray(data) && data.length ? data : (mempool.length ? mempool.splice(0, 50) : [{ msg: 'empty' }]);
  const difficulty = chain.getCurrentDifficulty();
  try {
    const block = await mineBlock(chain.getLastBlock(), payload, difficulty, minerAddress || process.env.MINER_ADDRESS || null);
    chain.addBlock(block);
    // broadcast new block to peers
    p2p.broadcast({ type: 'NEW_BLOCK', block });
    res.json({ success: true, block });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || String(err) });
  }
});

app.get('/block/:index', (req, res) => {
  const idx = Number(req.params.index);
  const block = chain.chain.find(b => b.index === idx);
  if (!block) return res.status(404).json({ success: false, message: 'not found' });
  res.json({ success: true, block });
});

app.post('/tx/new', (req, res) => {
  try {
    validatePayload(req.body || {}, 'newTx');
  } catch (err) {
    return res.status(400).json({ success: false, message: 'validation error: ' + err.message });
  }
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

// Wallet backup: export encrypted private key (returns encrypted payload only)
app.post('/wallet/export', (req, res) => {
  try {
    validatePayload(req.body || {}, 'walletExport');
  } catch (err) {
    return res.status(400).json({ success: false, message: 'validation error: ' + err.message });
  }
  const { privateKey, passphrase, options } = req.body || {};
  if (!privateKey || !passphrase) return res.status(400).json({ success: false, message: 'privateKey and passphrase required' });
  try {
    const wallet = require('./wallet');
    const encrypted = wallet.exportEncryptedPrivateKey(privateKey, passphrase, options || {});
    res.json({ success: true, encrypted });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Wallet import: verify encrypted payload with passphrase and return public key (do not return private key in response)
app.post('/wallet/import', (req, res) => {
  try {
    validatePayload(req.body || {}, 'walletImport');
  } catch (err) {
    return res.status(400).json({ success: false, message: 'validation error: ' + err.message });
  }
  const { encrypted, passphrase } = req.body || {};
  if (!encrypted || !passphrase) return res.status(400).json({ success: false, message: 'encrypted and passphrase required' });
  try {
    const wallet = require('./wallet');
    const privateKeyHex = wallet.importEncryptedPrivateKey(encrypted, passphrase);
    const publicKey = wallet.getPublicFromPrivate(privateKeyHex);
    res.json({ success: true, publicKey });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/replace', (req, res) => {
  try {
    validatePayload(req.body || {}, 'replace');
  } catch (err) {
    return res.status(400).json({ success: false, message: 'validation error: ' + err.message });
  }
  const { chain: newChain } = req.body;
  if (!Array.isArray(newChain)) return res.status(400).json({ success: false, message: 'chain must be an array' });
  const ok = chain.replaceChain(newChain);
  res.json({ success: !!ok });
});

app.post('/peer/connect', (req, res) => {
  try {
    validatePayload(req.body || {}, 'peerConnect');
  } catch (err) {
    return res.status(400).json({ success: false, message: 'validation error: ' + err.message });
  }
  const { address } = req.body || {};
  if (!address) return res.status(400).json({ success: false, message: 'address required' });
  p2p.connectToPeer(address);
  res.json({ success: true });
});

app.get('/peers', (req, res) => {
  // return count and masked remote addresses (best-effort)
  function maskAddress(addr) {
    if (!addr || addr === 'unknown') return 'unknown';
    // IPv6
    if (addr.includes(':')) {
      const parts = addr.split(':');
      return parts.slice(0, 3).join(':') + '::';
    }
    // IPv4
    const octets = addr.split('.');
    if (octets.length === 4) return `${octets[0]}.${octets[1]}.${octets[2]}.x`;
    return 'masked';
  }
  const peers = p2p.sockets.map((s) => maskAddress((s._socket && s._socket.remoteAddress) || 'unknown'));
  res.json({ success: true, count: p2p.sockets.length, peers });
});

app.get('/status', (req, res) => {
  res.json({ name: 'Aethra', version: '1.0.0', chainLength: chain.chain.length });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => console.log(`Aethra node running on ${HOST}:${PORT} — (v1.0.0)`));

module.exports = app;
