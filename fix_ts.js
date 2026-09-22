const fs = require('fs');
const path = './backend/src/modules/contractors/contractorWorkOrder.controller.ts';
let code = fs.readFileSync(path, 'utf8');

// Fix DemandNote import
code = code.replace(
  "import { DemandNote } from '../demand-notes/demandNote.schema';",
  "import DemandNote from '../demand-notes/demandNote.schema';"
);

// Fix Contractor import
code = code.replace(
  "import { Contractor } from './contractor.model';\n",
  ""
);

fs.writeFileSync(path, code);
console.log("Fixed TS errors");
