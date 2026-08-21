const fs = require('fs');
const path = './backend/src/modules/contractors/contractor.controller.ts';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(
  `      return res.status(400).json(`,
  `      require('fs').writeFileSync('last_upload_error.txt', JSON.stringify(errors, null, 2));\n      return res.status(400).json(`
);
fs.writeFileSync(path, code);
