const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function test() {
  const form = new FormData();
  form.append('file', fs.createReadStream('C:\\\\Users\\\\sanjeet kumar\\\\Downloads\\\\di_registration_sample 3009 Rampur (1).csv'));
  form.append('mode', 'merge');
  try {
    const res = await axios.post('http://localhost:5000/api/v1/di/import', form, {
      headers: {
        ...form.getHeaders()
      }
    });
    console.log('Success:', res.data);
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}
test();
