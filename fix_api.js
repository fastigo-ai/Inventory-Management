const fs = require('fs');
const path = './frontend/src/app/ho-billing/contractor-work-orders/[id]/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Fix api import
code = code.replace(
  "import api from '@/lib/api';",
  "import api from '@/shared/api/axios';"
);

fs.writeFileSync(path, code);
console.log("Fixed API import");
