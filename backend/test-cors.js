const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/purchases/invoices?status=Draft&status=Sent',
  method: 'GET',
  headers: {
    'Origin': 'http://localhost:3000'
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
