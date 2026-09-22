const fs = require('fs');
const path = './backend/src/modules/contractors/contractorWorkOrder.controller.ts';
let code = fs.readFileSync(path, 'utf8');

// Fix DemandNote date
code = code.replace(
  "          demandNoteNumber: `DN-${Date.now()}`,\n          date: new Date(),",
  "          demandNoteNumber: `DN-${Date.now()}`,"
);

fs.writeFileSync(path, code);
console.log("Fixed date error");
