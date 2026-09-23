const fs = require('fs');
const path = './frontend/src/app/ho-billing/contractor-work-orders/[id]/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Fix contractor fetch array mapping
code = code.replace(
  "setContractors(res.data.data.contractors || []);",
  "setContractors(Array.isArray(res.data.data) ? res.data.data : (res.data.data?.contractors || []));"
);

fs.writeFileSync(path, code);
console.log("Fixed contractor array parse");
