const fs = require('fs');
const path = 'frontend/src/app/ho-billing/contractor-work-orders/new/page.tsx';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(
  /\!formData\.division/g,
  `formData.drawings.some(d => !d.drawingNumber)`
);

fs.writeFileSync(path, content, 'utf-8');
