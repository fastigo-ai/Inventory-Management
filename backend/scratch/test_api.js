const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@fastigo.com', // guess
      password: 'password' // guess
    });
    console.log("Logged in!");
    const token = res.data.token || res.data.data.token;
    
    const stockRes = await axios.get('http://localhost:5000/api/store/stock-summary?circle=Rohru&package=Package%202(R/R)', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const item87 = stockRes.data.data.find(i => i.tempCode == '87');
    console.log("Item 87:", JSON.stringify(item87, null, 2));
  } catch (e) {
    console.log("Error:", e.message);
  }
}
test();
