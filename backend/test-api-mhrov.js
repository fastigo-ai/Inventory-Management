const axios = require('axios');
axios.post('http://localhost:5000/api/auth/login', {
  email: 'admin@fastigo.com',
  password: 'password123'
}).then(res => {
  const token = res.data.data.accessToken;
  return axios.get('http://localhost:5000/api/store/mhrov', {
    headers: { Authorization: `Bearer ${token}` }
  });
}).then(res => {
  console.log("MHROV Data (first element):");
  console.log(JSON.stringify(res.data.data[0], null, 2));
}).catch(err => {
  console.error(err.message);
});
