const fs = require('fs');
const path = 'frontend/src/app/site-portal/demand-notes/new/page.tsx';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(/getItemMetrics\(\{\}\)/g, 'getItemMetrics()');
fs.writeFileSync(path, content, 'utf-8');
