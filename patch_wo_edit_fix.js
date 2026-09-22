const fs = require('fs');
const path = 'frontend/src/app/ho-billing/contractor-work-orders/[id]/edit/page.tsx';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(
  /division: wo\.division \|\| '',\s*subDivision: wo\.subDivision \|\| '',\s*location: wo\.location \|\| '',/,
  `drawings: wo.drawings && wo.drawings.length > 0 ? wo.drawings : [{ drawingNumber: '', division: '', subDivision: '', location: '' }],`
);

fs.writeFileSync(path, content, 'utf-8');
