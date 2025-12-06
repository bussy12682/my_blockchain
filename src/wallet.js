const { ec: EC } = require('elliptic');
const ec = new EC('secp256k1');

function createKeyPair() {
  const key = ec.genKeyPair();
  return {
    privateKey: key.getPrivate('hex'),
    publicKey: key.getPublic('hex'),
  };
}

function keyFromPrivate(privateKeyHex) {
  return ec.keyFromPrivate(privateKeyHex, 'hex');
}

function getPublicFromPrivate(privateKeyHex) {
  return keyFromPrivate(privateKeyHex).getPublic('hex');
}

module.exports = { createKeyPair, keyFromPrivate, getPublicFromPrivate };
