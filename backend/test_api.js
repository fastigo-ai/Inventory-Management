const axios = require('axios');

async function check() {
  try {
    console.log('Sending request to Next.js Proxy...');
    const res = await axios.get('http://localhost:3000/api/reports/item-matrix-summary', {
      params: {
        search: 'STP 9 mtr',
        targetCircle: 'ALL',
        page: 1,
        limit: 50
      }
    });
    console.log('Success!', res.status);
    console.log('Items:', res.data.data.items.length);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Data:', err.response.data);
    }
  }
}

check();
