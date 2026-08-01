const axios = require('axios');

async function test() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@admin.com',
      password: 'admin123'
    });
    
    console.log("Login res:", loginRes.data);
    const token = loginRes.data.data.accessToken;
    
    const metricsRes = await axios.get('http://localhost:5000/api/items/metrics', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log("Metrics:", JSON.stringify(metricsRes.data, null, 2));
  } catch (e) {
    console.error("Error at:", e.config.url);
    console.error(e.response ? e.response.data : e.message);
  }
}

test();
