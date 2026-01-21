const http = require('http');
const crypto = require('crypto');

function testEndpoint(path, method, body, testName) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: '127.0.0.1',
      port: 3000,
      path,
      method,
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    };
    const req = http.request(opts, (r) => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => {
        try {
          const res = JSON.parse(d);
          resolve({ testName, success: res.success, message: res.message || 'OK', res });
        } catch (e) {
          resolve({ testName, success: false, message: 'Failed to parse response: ' + e.message });
        }
      });
    });
    req.on('error', e => resolve({ testName, success: false, message: 'HTTP Error: ' + e.message }));
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('\n=== AETHRA BLOCKCHAIN SMOKE TESTS ===\n');

  // Test 1: /status
  let result = await testEndpoint('/status', 'GET', {}, 'GET /status');
  console.log(`${result.success ? '✓' : '✗'} ${result.testName}: ${result.message}`);

  // Test 2: /chain
  result = await testEndpoint('/chain', 'GET', {}, 'GET /chain');
  console.log(`${result.success ? '✓' : '✗'} ${result.testName}: chain length = ${result.res?.length || 'unknown'}`);

  // Test 3: Wallet export (encrypt private key)
  const testPrivateKey = crypto.randomBytes(32).toString('hex');
  result = await testEndpoint('/wallet/export', 'POST', { privateKey: testPrivateKey, passphrase: 'test-pass' }, 'POST /wallet/export');
  const encryptedBackup = result.res?.encrypted;
  console.log(`${result.success ? '✓' : '✗'} ${result.testName}: ${result.message}${encryptedBackup ? ' (size: ' + encryptedBackup.length + ' chars)' : ''}`);

  // Test 4: Wallet import (decrypt and verify)
  if (encryptedBackup) {
    result = await testEndpoint('/wallet/import', 'POST', { encrypted: encryptedBackup, passphrase: 'test-pass' }, 'POST /wallet/import');
    console.log(`${result.success ? '✓' : '✗'} ${result.testName}: ${result.message}${result.res?.publicKey ? ' (recovered public key)' : ''}`);
  }

  // Test 5: Input validation (should fail with invalid data)
  result = await testEndpoint('/wallet/export', 'POST', { privateKey: 'x'.repeat(500), passphrase: 'p' }, 'Input Validation (should reject oversized key)');
  console.log(`${!result.success ? '✓' : '✗'} ${result.testName}: ${result.message}`);

  // Test 6: Rate limiter (make rapid requests)
  console.log('\nRate Limit Test: Sending 10 rapid requests...');
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(testEndpoint('/status', 'GET', {}, `Request ${i + 1}`));
  }
  const rateLimitResults = await Promise.all(promises);
  const rateLimited = rateLimitResults.filter(r => !r.success).length;
  console.log(`${rateLimited === 0 ? '✓' : '✗'} Rate limiter: ${rateLimited} requests blocked (expected: 0 within limit)`);

  console.log('\n=== SMOKE TESTS COMPLETE ===\n');
}

runTests().catch(err => console.error('Test error:', err));
