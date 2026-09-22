const fs = require('fs');
const path = './backend/src/modules/contractors/contractorWorkOrder.controller.ts';

let code = fs.readFileSync(path, 'utf8');

// 1. Add DemandNote import
if (!code.includes("import { DemandNote }")) {
  code = code.replace(
    "import { ContractorAssignment } from './contractorAssignment.schema';",
    `import { ContractorAssignment } from './contractorAssignment.schema';\nimport { DemandNote } from '../demand-notes/demandNote.schema';\nimport { Contractor } from './contractor.model';`
  );
}

// 2. Fetch the new contractor to get their name
const newContractorLogic = `
      // Draft Demand Note for New Contractor
      const newContractor = await Contractor.findById(newContractorId).lean();
      if (transferItems.length > 0 && newContractor) {
        await DemandNote.create([{
          demandNoteNumber: \`DN-\${Date.now()}\`,
          date: new Date(),
          createdBy: req.user?._id,
          contractorId: newContractorId,
          contractorName: newContractor.dynamicData?.companyName || 'Unknown',
          circle: oldWo.circle,
          package: oldWo.package,
          drawingNumber: oldWo.drawings[0]?.drawingNumber || 'MIGRATED',
          workOrderId: newWo[0]._id, // Attach to the new draft WO
          status: 'Draft',
          items: transferItems.map((item: any) => ({
            itemId: item.itemId,
            itemName: item.itemName,
            tempCode: item.tempCode,
            activity: item.activity,
            loaSrNo: item.loaSrNo,
            demandQty: item.quantity,
            contractorErectionRate: item.rate,
            amount: item.amount,
            alreadyIssuedQty: 0,
            wipConsumed: 0,
            jmcDone: 0,
            stockBal: item.quantity // Because they are receiving it directly on site
          }))
        }], { session });
      }`;

// 3. Replace ContractorAssignment with DemandNote
code = code.replace(
  /\/\/ Draft MIN\n\s*if \(transferItems\.length > 0\) {[\s\S]*?}\n\s*}/,
  newContractorLogic + '\n    }'
);

fs.writeFileSync(path, code);
console.log("Patched contractorWorkOrder.controller.ts");
