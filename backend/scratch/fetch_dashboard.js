const http = require('http');
http.get('http://localhost:5000/api/v1/store/mhrov/dashboard/data', (res) => {
  let data = '';
  res.on('data', (c) => data += c);
  res.on('end', () => {
    console.log(data.substring(0, 500));
  });
}).on('error', (err) => console.log('Error: ' + err.message));
