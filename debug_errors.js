const fs = require('fs');
const path = 'backend/src/modules/contractors/contractor.controller.ts';
let content = fs.readFileSync(path, 'utf-8');

content = content.replace(
  /if \(errors\.length > 0\) \{\n\s*return res\.status\(400\)/g,
  `if (errors.length > 0) {\n    console.error("Bulk Import Errors:", errors);\n    return res.status(400)`
);

fs.writeFileSync(path, content, 'utf-8');
