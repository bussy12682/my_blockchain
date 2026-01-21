const axios = require('axios');
const spawn = require('child_process').spawn;

async function wait(ms){ return new Promise(res => setTimeout(res, ms)); }

async function run(){
  console.log('Starting Aethra node (server)...');
  const server = spawn('node',['src/server.js'], { stdio: 'inherit' });

  // wait a little for the server to boot
  await wait(1200);

  try{
    console.log('Sending a sample transaction to node...');
    const tx = { from: 'alice', to: 'bob', amount: 42 };
    await axios.post('http://127.0.0.1:3000/tx/new', tx);

    console.log('Asking node to mine a new block...');
    const res = await axios.post('http://127.0.0.1:3000/mine');
    console.log('Mined block:', (res.data.block || {}).index);

    const chain = await axios.get('http://127.0.0.1:3000/chain');
    console.log('Chain length now:', chain.data.length || chain.data.chain.length);
  } catch (err){
    console.error('Demo error (is server running locally?):', err.message);
  } finally {
    console.log('\nStopping demo. You may CTRL+C the server above if still running.');
    server.kill();
  }
}

run().catch(console.error);
