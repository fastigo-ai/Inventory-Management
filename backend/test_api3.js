const http = require('http');

const payload = JSON.stringify({
  vendorName: 'Vendor',
  purchaseOrderNumber: 'PO-TEST-API-3',
  date: new Date().toISOString(),
  lineItems: [{ itemName: 'Item', quantity: 1, rate: 100 }],
  cgstPercentage: 9,
  sgstPercentage: 9,
  igstPercentage: 0,
  subTotal: 100,
  status: 'Sent'
});

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/purchases/orders',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('RESPONSE:', data));
});

req.write(payload);
req.end();
