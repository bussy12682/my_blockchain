const crypto = require('crypto');

// Message signer: simple HMAC-based signing to authenticate P2P messages
// Each node generates a shared secret (stored locally) that it uses to sign all messages.
// Peers can verify messages by recomputing the HMAC.
// This is NOT perfect forward secrecy but prevents trivial message tampering/injection.

class MessageSigner {
  constructor(nodeId = null) {
    // nodeId is a unique identifier for this node (e.g., public key, peer ID, etc.)
    // If not provided, we use a random ID.
    this.nodeId = nodeId || crypto.randomBytes(32).toString('hex');
    // sharedSecret: used to HMAC-sign messages. In production, consider deriving this
    // from a long-term node identity or exchange during peer handshake.
    this.sharedSecret = crypto.randomBytes(32);
  }

  // Sign a message object (returns { message, signature, nodeId, timestamp })
  signMessage(messageObj) {
    const timestamp = Date.now();
    const payload = JSON.stringify({ ...messageObj, timestamp });
    const signature = crypto
      .createHmac('sha256', this.sharedSecret)
      .update(payload)
      .digest('hex');
    return { message: messageObj, signature, nodeId: this.nodeId, timestamp };
  }

  // Verify a signed message (requires the signer's shared secret or a pre-shared key mapping)
  // For now, we store a map of nodeId -> sharedSecret (in production, this should be from peer exchange/handshake)
  verifyMessage(signedObj, sharedSecretOrMap) {
    if (!signedObj || !signedObj.signature) return false;
    const { message, signature, nodeId, timestamp } = signedObj;
    if (!message || !nodeId) return false;

    // Prevent replay attacks: reject messages older than 5 minutes
    const now = Date.now();
    const MAX_AGE_MS = 5 * 60 * 1000;
    if (now - timestamp > MAX_AGE_MS) return false;

    // Determine the secret to verify with
    let secret;
    if (sharedSecretOrMap instanceof Map) {
      secret = sharedSecretOrMap.get(nodeId);
    } else if (Buffer.isBuffer(sharedSecretOrMap)) {
      secret = sharedSecretOrMap;
    } else {
      return false;
    }

    if (!secret) return false; // unknown peer

    const payload = JSON.stringify({ ...message, timestamp });
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'));
  }

  getNodeId() {
    return this.nodeId;
  }

  getSharedSecret() {
    return this.sharedSecret;
  }
}

module.exports = MessageSigner;
