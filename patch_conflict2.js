const fs = require('fs');
const filePath = 'backend/src/modules/contractors/contractor.controller.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  `<<<<<<< HEAD\n\n\n=======\n>>>>>>> c80e203 (fix: resolve esbuild regex parsing bug and remove duplicate cache declaration)\n`,
  ``
);

fs.writeFileSync(filePath, content);
console.log("Resolved conflict");
