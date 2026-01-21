const WebSocket = require('ws');
const MessageSigner = require('./message_signer');

class P2P {
  constructor({ blockchain, port = 7100 } = {}) {
    this.blockchain = blockchain;
    this.port = port;
    this.sockets = [];
    this.server = null;
    this.autoRecoveryIntervalMs = process.env.AUTO_RECOVERY_INTERVAL_MS ? Number(process.env.AUTO_RECOVERY_INTERVAL_MS) : 60000;
    this._autoRecoveryTimer = null;
    
    // Message signing: create a signer for this node and track peer secrets
    this.messageSigner = new MessageSigner();
    this.peerSecrets = new Map(); // nodeId -> sharedSecret (Buffer)
  }

  startServer() {
    const host = process.env.HOST || '0.0.0.0';
    this.server = new WebSocket.Server({ host, port: this.port });
    this.server.on('connection', ws => this.initConnection(ws));
    console.log(`Aethra P2P listening on ws://${host}:${this.port}`);

    // start an automatic recovery loop: if local chain becomes invalid or missing,
    // request chains from peers so the node can recover state automatically.
    try {
      this._autoRecoveryTimer = setInterval(() => {
        try {
          const isValid = this.blockchain && this.blockchain.isValidChain && this.blockchain.isValidChain(this.blockchain.chain);
          if (!isValid) {
            console.warn('AutoRecovery: local chain invalid — requesting chains from peers');
            this.broadcast({ type: 'REQUEST_CHAIN' });
          }
        } catch (e) {
          // if any unexpected error, still try to request chain
          this.broadcast({ type: 'REQUEST_CHAIN' });
        }
      }, this.autoRecoveryIntervalMs);
    } catch (e) {
      // ignore timer setup failures
    }
  }

  initConnection(ws) {
    this.sockets.push(ws);
    ws.on('message', message => this.handleMessage(ws, message));
    ws.on('close', () => this.closeConnection(ws));
    ws.on('error', () => this.closeConnection(ws));

    // Peer key exchange: send our nodeId and sharedSecret so peer can verify our messages
    const peerKey = {
      type: 'PEER_KEY_EXCHANGE',
      nodeId: this.messageSigner.getNodeId(),
      sharedSecret: this.messageSigner.getSharedSecret().toString('hex'),
    };
    try { ws.send(JSON.stringify(peerKey)); } catch (err) { /* ignore */ }

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
    if (this._autoRecoveryTimer) {
      clearInterval(this._autoRecoveryTimer);
      this._autoRecoveryTimer = null;
    }
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
    // sign the message before broadcasting
    const signed = this.messageSigner.signMessage(obj);
    const raw = JSON.stringify(signed);
    this.sockets.forEach(s => s.readyState === WebSocket.OPEN && s.send(raw));
  }

  send(ws, obj) {
    // sign the message before sending
    try {
      const signed = this.messageSigner.signMessage(obj);
      ws.send(JSON.stringify(signed));
    } catch (err) { /* ignore */ }
  }

  handleMessage(ws, raw) {
    let signedObj;
    try { signedObj = JSON.parse(raw); } catch (e) { return; }
    
    // Handle peer key exchange (unverified, used to initialize peer secrets)
    if (signedObj.type === 'PEER_KEY_EXCHANGE') {
      const { nodeId, sharedSecret } = signedObj;
      if (nodeId && sharedSecret) {
        try {
          this.peerSecrets.set(nodeId, Buffer.from(sharedSecret, 'hex'));
          console.log(`P2P: registered peer ${nodeId}`);
        } catch (e) { /* ignore */ }
      }
      return;
    }

    // For all other messages, verify signature
    if (!this.messageSigner.verifyMessage(signedObj, this.peerSecrets)) {
      console.warn('P2P: received message with invalid signature or from unknown peer — ignoring');
      return;
    }

    const msg = signedObj.message;
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
