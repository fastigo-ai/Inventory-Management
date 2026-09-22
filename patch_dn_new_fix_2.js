const fs = require('fs');
const path = 'frontend/src/app/site-portal/demand-notes/new/page.tsx';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(
  /data\.append\('division', formData\.division\);/g,
  `data.append('division', formData.division || '');`
);
content = content.replace(
  /data\.append\('subDivision', formData\.subDivision\);/g,
  `data.append('subDivision', formData.subDivision || '');`
);
content = content.replace(
  /data\.append\('location', formData\.location\);/g,
  `data.append('location', formData.location || '');`
);

// also drawingNumber
content = content.replace(
  /data\.append\('remarks', formData\.remarks\);/g,
  `data.append('remarks', formData.remarks);\n      data.append('drawingNumber', formData.drawingNumber || '');`
);

fs.writeFileSync(path, content, 'utf-8');
