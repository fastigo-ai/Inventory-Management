const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function run() {
  const form = new FormData();
  fs.writeFileSync('test.csv', 'Return Challan No.,Contractor Name,Description of Material,Temp Code,Return QTY.\nCH-1,A K Contractor,Transformer,7,5\n');
  form.append('file', fs.createReadStream('test.csv'));
  
  try {
    const res = await axios.post('http://localhost:5001/api/contractors/returns/import', form, {
      headers: form.getHeaders(),
      // bypass auth for a moment if we can, or just expect 401
    });
    console.log(res.status, res.data);
  } catch (err) {
    console.log(err.response ? err.response.status : err.message);
    console.log(err.response ? err.response.data : '');
  }
  
  process.exit(0);
}
run();
