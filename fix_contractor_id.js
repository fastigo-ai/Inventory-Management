const fs = require('fs');
const path = './backend/src/modules/contractors/contractorWorkOrder.controller.ts';
let code = fs.readFileSync(path, 'utf8');

// Fix contractorId
code = code.replace(
  "          contractorId: newContractorId,\n          contractorName:",
  "          contractorName:"
);

fs.writeFileSync(path, code);
console.log("Fixed contractorId error");
