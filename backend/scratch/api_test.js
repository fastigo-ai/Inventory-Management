const axios = require('axios');

async function run() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'admin@fastigo.com',
      password: 'password'
    });
    const token = loginRes.data.token;
    
    const res = await axios.get('http://localhost:5000/api/v1/reports/store-contractor-summary?contractorName=Jai+prakash&circle=Rohru&search=1&hideZero=true', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
run();
