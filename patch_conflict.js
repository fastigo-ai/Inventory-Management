const fs = require('fs');

const filePath = 'frontend/src/features/contractors/api/contractors.api.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  `<<<<<<< HEAD\n    timeout: 120000 // 2 minutes for bulk import\n=======\n    timeout: 300000\n>>>>>>> 80ef37e (fix(axios): increase global timeout to 5 minutes to prevent bulk import failures)`,
  `    timeout: 300000`
);

content = content.replace(
  `<<<<<<< HEAD\n    timeout: 120000, // 2 minutes for bulk import\n    onUploadProgress\n=======\n    timeout: 300000\n>>>>>>> 80ef37e (fix(axios): increase global timeout to 5 minutes to prevent bulk import failures)`,
  `    timeout: 300000,\n    onUploadProgress`
);

fs.writeFileSync(filePath, content);
console.log("Resolved conflict");
