const axios = require('axios');
(async () => {
  try {
    const loginRes = await axios.post('http://127.0.0.1:5000/api/auth/login', {
      email: 'site@example.com', // wait, I don't know their credentials
      password: 'password123'
    });
    const token = loginRes.data.data.token;
    console.log("Token:", token.substring(0, 10));
  } catch (err) {
    console.log(err.response ? err.response.data : err.message);
  }
})();
