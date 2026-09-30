const http = require('http');
http.get('http://localhost:8000/api/v1/di/6abbaeed6dd4d2eb14371fc8', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('DI Number:', parsed.data?.diNumber);
      console.log('Line Items Count:', parsed.data?.lineItems?.length);
    } catch (e) {
      console.error(e.message);
    }
  });
}).on('error', (err) => {
  console.log("Error: " + err.message);
});
