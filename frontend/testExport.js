const axios = require('axios');
axios.get('http://localhost:5000/api/contractors/assignments/export', { responseType: 'blob' })
  .then(res => console.log(typeof res.data, res.data))
  .catch(err => console.error(err.response?.status));
