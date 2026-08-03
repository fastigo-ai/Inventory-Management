const axios = require('axios');
axios.get('http://localhost:5000/api/purchases/invoices')
  .then(res => console.log("Success", res.status))
  .catch(err => console.error(err.message, err.response?.status));
