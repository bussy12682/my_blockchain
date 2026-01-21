const axios = require('axios');

(async () => {
  try {
    const r = await axios.get('http://127.0.0.1:3000/status', { timeout: 2000 });
    console.log('OK:', r.data);
  } catch (err) {
    console.error('ERR:', err.message);
    process.exitCode = 1;
  }
})();
