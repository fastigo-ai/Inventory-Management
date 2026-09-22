const fs = require('fs');
const path = 'backend/src/modules/contractors/contractor.controller.ts';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(
  /const unit = row\['Unit'\] \|\| row\['unit'\] \|\| '';/g,
  `const unit = row['Unit'] || row['UNIT'] || row['unit'] || '';`
);

fs.writeFileSync(path, content, 'utf-8');
