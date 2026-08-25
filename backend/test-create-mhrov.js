const http = require('http');
const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/store/mhrov',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Body: ${data}`);
  });
});
req.on('error', e => console.error(e));
req.write(JSON.stringify({
  mhrovNumber: 'TEST-123',
  mhrovDate: '2026-08-22',
  status: 'pending',
  items: '{invalid_json['
}));
req.end();
