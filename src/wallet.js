const { ec: EC } = require('elliptic');
const crypto = require('crypto');
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

// Export a private key encrypted with a passphrase using scrypt + AES-256-GCM
function exportEncryptedPrivateKey(privateKeyHex, passphrase, opts = {}) {
  if (!privateKeyHex || !passphrase) throw new Error('privateKey and passphrase required');
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12); // GCM recommended 12 bytes
  const N = opts.N || 16384; // work factor (scrypt) - reasonable default
  const r = opts.r || 8;
  const p = opts.p || 1;
  const keyLen = 32; // 256-bit
  const derived = crypto.scryptSync(passphrase, salt, keyLen, { N, r, p });
  const cipher = crypto.createCipheriv('aes-256-gcm', derived, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(privateKeyHex, 'hex')), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return JSON.stringify({
    kdf: 'scrypt',
    kdfparams: { salt: salt.toString('hex'), N, r, p, dklen: keyLen },
    cipher: 'aes-256-gcm',
    iv: iv.toString('hex'),
    ciphertext: ciphertext.toString('hex'),
    tag: authTag.toString('hex'),
  });
}

// Import encrypted private key (reverse of export)
function importEncryptedPrivateKey(encryptedJson, passphrase) {
  if (!encryptedJson || !passphrase) throw new Error('encrypted payload and passphrase required');
  const obj = typeof encryptedJson === 'string' ? JSON.parse(encryptedJson) : encryptedJson;
  if (obj.kdf !== 'scrypt') throw new Error('unsupported kdf');
  const salt = Buffer.from(obj.kdfparams.salt, 'hex');
  const N = obj.kdfparams.N;
  const r = obj.kdfparams.r;
  const p = obj.kdfparams.p;
  const dklen = obj.kdfparams.dklen;
  const derived = crypto.scryptSync(passphrase, salt, dklen, { N, r, p });
  const iv = Buffer.from(obj.iv, 'hex');
  const ciphertext = Buffer.from(obj.ciphertext, 'hex');
  const tag = Buffer.from(obj.tag, 'hex');
  const decipher = crypto.createDecipheriv(obj.cipher, derived, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('hex');
}

module.exports = { createKeyPair, keyFromPrivate, getPublicFromPrivate, exportEncryptedPrivateKey, importEncryptedPrivateKey };
