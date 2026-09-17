const axios = require('axios');
const fs = require('fs');

async function test() {
  try {
    // 1. Get token
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@fastigo.com',
      password: 'password123'
    });
    const token = loginRes.data.data.accessToken;

    // 2. Export
    const res = await axios.get('http://localhost:5000/api/contractors/assignments/export', {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    });
    
    console.log('Status:', res.status);
    console.log('Type of data:', typeof res.data);
    fs.writeFileSync('test_export.csv', res.data);
    console.log('Wrote file with length:', res.data.length);
  } catch (err) {
    console.error('Error:', err.response ? err.response.status : err.message);
  }
}
test();
