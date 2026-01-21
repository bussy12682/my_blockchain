const crypto = require('crypto');

class Transaction {
  constructor({ fromAddress, toAddress, amount, timestamp, signature } = {}) {
    this.fromAddress = fromAddress || null; // public key hex
    this.toAddress = toAddress || null;
    this.amount = amount || 0;
    this.timestamp = timestamp || Date.now();
    this.signature = signature || null; // hex
  }

  computeHash() {
    return crypto.createHash('sha256').update(`${this.fromAddress}|${this.toAddress}|${this.amount}|${this.timestamp}`).digest('hex');
  }

  signTransaction(signingKey) {
    // signingKey: object with sign method (elliptic keypair) OR privateKey hex string
    // We'll assume the caller passes an elliptic keypair
    if (!signingKey) throw new Error('No signing key provided');
    const pub = signingKey.getPublic('hex');
    if (pub !== this.fromAddress) throw new Error('Cannot sign transactions for other wallets');
    const hashTx = this.computeHash();
    const sig = signingKey.sign(hashTx, 'hex');
    this.signature = Buffer.from(sig.toDER()).toString('hex');
  }

  isValid() {
    // mining reward or system transactions can have null fromAddress
    if (!this.fromAddress) return true;
    if (!this.signature) throw new Error('No signature in this transaction');

    const EC = require('elliptic').ec;
    const ec = new EC('secp256k1');
    const key = ec.keyFromPublic(this.fromAddress, 'hex');
    return key.verify(this.computeHash(), this.signature);
  }
}

module.exports = Transaction;
