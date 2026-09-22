const fs = require('fs');
const path = './backend/src/modules/reports/summary/summary.controller.ts';

let code = fs.readFileSync(path, 'utf8');

// 1. Add imports
const importsToAdd = `
import { JmcRegister } from '../../jmc/jmc.schema';
import { WipRegister } from '../../wip/wip.schema';
`;
if (!code.includes('import { JmcRegister }')) {
  code = code.replace("import { ContractorAssignment } from '../../contractors/contractorAssignment.schema';", `${importsToAdd}\nimport { ContractorAssignment } from '../../contractors/contractorAssignment.schema';`);
}

// 2. Update groupMap initialization
code = code.replace(/totalReturnQty: 0,\n\s*totalBalanceQty: 0,/g, `totalReturnQty: 0,
        totalBalanceQty: 0,
        totalJmcDone: 0,
        totalWipConsumed: 0,
        contractorBalance: 0,`);

// 3. Fetch and aggregate Jmc and Wip
const aggLogic = `

  // Aggregate JMC Done
  const jmcRecords = await JmcRegister.find(assignFilter).lean();
  jmcRecords.forEach(doc => {
    (doc.items || []).forEach((line: any) => {
      const qty = Number(line.approvedQty || line.claimedQty || line.quantity || 0);
      const targetKeys = getTargetKeys(line.itemId, line.tempCode, line.loaSerialNo || line.loaSrNo, doc.circle || doc.location);
      targetKeys.forEach(key => {
        if (groupMap.has(key)) {
          groupMap.get(key)!.totalJmcDone += qty;
        }
      });
    });
  });

  // Aggregate WIP Consumed
  const wipRecords = await WipRegister.find(assignFilter).lean();
  wipRecords.forEach(doc => {
    (doc.items || []).forEach((line: any) => {
      const qty = Number(line.approvedQty || line.claimedQty || line.quantity || 0);
      const targetKeys = getTargetKeys(line.itemId, line.tempCode, line.loaSerialNo || line.loaSrNo, doc.circle || doc.location);
      targetKeys.forEach(key => {
        if (groupMap.has(key)) {
          groupMap.get(key)!.totalWipConsumed += qty;
        }
      });
    });
  });

  // Calculate Balances
`;

code = code.replace(`  // 4. Transform to Array and Pagination`, aggLogic + `  // 4. Transform to Array and Pagination`);

// 4. Map the fields to the response
code = code.replace(/totalBalanceQty: val.totalIssuedQty - val.totalReturnQty/g, `totalBalanceQty: val.totalIssuedQty - val.totalReturnQty,
            totalJmcDone: val.totalJmcDone,
            totalWipConsumed: val.totalWipConsumed,
            contractorBalance: (val.totalIssuedQty - val.totalReturnQty) - val.totalJmcDone - val.totalWipConsumed`);

fs.writeFileSync(path, code);
console.log("Patched summary.controller.ts");
