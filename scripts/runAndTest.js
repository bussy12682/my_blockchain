const axios = require('axios');
console.log('Requiring server module and starting server (this process)...');
require('../src/server');

async function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }

(async () => {
  await wait(1000);
  try{
    console.log('Posting transaction...');
    const tx = { from: 'demo', to: 'user', amount: 5 };
    const txRes = await axios.post('http://127.0.0.1:3000/tx/new', tx);
    console.log('txRes:', txRes.data);

    console.log('Asking node to mine a block...');
    const mineRes = await axios.post('http://127.0.0.1:3000/mine');
    console.log('mineRes:', mineRes.data && mineRes.data.block ? `mined index=${mineRes.data.block.index}` : JSON.stringify(mineRes.data));

    const c = await axios.get('http://127.0.0.1:3000/chain');
    console.log('chain length after:', c.data.length || c.data.chain.length);
  } catch (err) {
    console.error('Test failed:', err.message);
  } finally {
    console.log('Done — tests complete. Exiting process.');
    process.exit(0);
  }
})();
