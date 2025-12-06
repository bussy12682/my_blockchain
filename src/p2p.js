const WebSocket = require('ws');

class P2P {
  constructor({ blockchain, port = 7100 } = {}) {
    this.blockchain = blockchain;
    this.port = port;
    this.sockets = [];
    this.server = null;
  }

  startServer() {
    const host = process.env.HOST || '0.0.0.0';
    this.server = new WebSocket.Server({ host, port: this.port });
    this.server.on('connection', ws => this.initConnection(ws));
    console.log(`Aethra P2P listening on ws://${host}:${this.port}`);
  }

  initConnection(ws) {
    this.sockets.push(ws);
    ws.on('message', message => this.handleMessage(ws, message));
    ws.on('close', () => this.closeConnection(ws));
    ws.on('error', () => this.closeConnection(ws));

    // send our chain length
    this.send(ws, { type: 'CHAIN_LENGTH', length: this.blockchain.chain.length });
  }

  closeConnection(ws) {
    this.sockets = this.sockets.filter(s => s !== ws);
  }

  shutdown() {
    // close sockets
    for (const s of this.sockets) {
      try { s.terminate && s.terminate(); } catch (e) {}
    }
    this.sockets = [];
    // close server
    try {
      if (this.server) {
        this.server.close();
        this.server = null;
      }
    } catch (e) {}
  }

  connectToPeer(address) {
    try {
      const ws = new WebSocket(address);
      ws.on('open', () => this.initConnection(ws));
      ws.on('error', err => console.warn('WS connect error', err.message));
    } catch (err) {
      console.warn('connectToPeer failed', err.message);
    }
  }

  broadcast(obj) {
    const raw = JSON.stringify(obj);
    this.sockets.forEach(s => s.readyState === WebSocket.OPEN && s.send(raw));
  }

  send(ws, obj) {
    try { ws.send(JSON.stringify(obj)); } catch (err) { /* ignore */ }
  }

  handleMessage(ws, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    const type = msg.type;

    if (type === 'CHAIN_LENGTH') {
      // peer telling us chain length—if peer is longer, request full chain
      if (msg.length > this.blockchain.chain.length) {
        this.send(ws, { type: 'REQUEST_CHAIN' });
      }
    }

    if (type === 'REQUEST_CHAIN') {
      this.send(ws, { type: 'CHAIN', chain: this.blockchain.toJSON() });
    }

    if (type === 'CHAIN') {
      if (!Array.isArray(msg.chain)) return;
      // if longer and valid, replace
      if (msg.chain.length > this.blockchain.chain.length && this.blockchain.isValidChain(msg.chain)) {
        console.log('P2P: replacing local chain with received chain');
        this.blockchain.replaceChain(msg.chain);
      }
    }

    if (type === 'NEW_BLOCK') {
      // when a peer broadcasts a new block, try adding or request chain
      const block = msg.block;
      try {
        this.blockchain.addBlock(block);
        console.log('P2P: added remote block', block.index);
      } catch (err) {
        // could not add, ask for chain
        this.send(ws, { type: 'REQUEST_CHAIN' });
      }
    }

    if (type === 'NEW_TX') {
      // add tx to mempool (if the payload looks ok)
      const tx = msg.tx;
      if (!tx) return;
      // simple check: transaction must have signature or be system tx
      try {
        const Transaction = require('./transaction');
        const t = new Transaction(tx);
        if (t.isValid()) {
          // push to blockchain's external mempool if present
          if (!this.blockchain.mempool) this.blockchain.mempool = [];
          this.blockchain.mempool.push(t);
        }
      } catch (err) {
        // ignore invalid
      }
    }
  }
}

module.exports = P2P;
