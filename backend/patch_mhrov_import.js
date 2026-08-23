const fs = require('fs');
const file = 'src/modules/store/store.controller.ts';
let code = fs.readFileSync(file, 'utf8');

const originalBlock = `    for (const item of mhrovData.items) {
      const query: any = {};
      if (item.invoiceNo) query.invoiceNumber = item.invoiceNo;
      if (item.diNo) query.diRefNo = item.diNo;
      if (item.loaSerialNo) query.serialNumber = item.loaSerialNo;
      if (item.itemName) query.itemName = item.itemName;
      if (item.tempCode) query.tempCode = item.tempCode;

      const entries = await StoreInwardEntry.find(query);
      if (entries.length === 0) {
         errors.push(\`Row \${item.rowNumber}: Could not find StoreInwardEntry matching Invoice "\${item.invoiceNo}", DI "\${item.diNo}", Item "\${item.itemName}", Serial "\${item.loaSerialNo}"\`);
      } else if (entries.length > 1) {
         errors.push(\`Row \${item.rowNumber}: Multiple StoreInwardEntries found matching the criteria. Please provide more specific data (e.g., Invoice No).\`);
      } else {
         const entryId = entries[0]._id;
         inwardEntriesArray.push(entryId);
         finalItems.push({ inwardEntryId: entryId, mhrovDoneQty: item.mhrovDoneQty });
      }
    }`;

const newBlock = `    // Bulk fetch to prevent N+1 query problem and DB timeouts
    const allQueryOpts: any[] = [];
    for (const item of mhrovData.items) {
      const condition: any = {};
      if (item.invoiceNo) condition.invoiceNumber = item.invoiceNo;
      if (item.diNo) condition.diRefNo = item.diNo;
      if (item.loaSerialNo) condition.serialNumber = item.loaSerialNo;
      if (item.itemName) condition.itemName = item.itemName;
      if (item.tempCode) condition.tempCode = item.tempCode;
      if (Object.keys(condition).length > 0) {
         allQueryOpts.push(condition);
      }
    }
    
    // If no specific criteria, we can't match anything
    let bulkEntries: any[] = [];
    if (allQueryOpts.length > 0) {
        bulkEntries = await StoreInwardEntry.find({ $or: allQueryOpts, circle: mhrovData.circle }).lean();
        if (bulkEntries.length === 0) {
           bulkEntries = await StoreInwardEntry.find({ $or: allQueryOpts }).lean();
        }
    }

    for (const item of mhrovData.items) {
      // Find matches in memory instead of hitting the DB sequentially
      const entries = bulkEntries.filter(entry => {
         let match = true;
         if (item.invoiceNo && entry.invoiceNumber !== item.invoiceNo) match = false;
         if (item.diNo && entry.diRefNo !== item.diNo) match = false;
         if (item.loaSerialNo && entry.serialNumber !== item.loaSerialNo) match = false;
         if (item.itemName && entry.itemName !== item.itemName) match = false;
         if (item.tempCode && entry.tempCode !== item.tempCode) match = false;
         return match;
      });

      if (entries.length === 0) {
         errors.push(\`Row \${item.rowNumber}: Could not find StoreInwardEntry matching Invoice "\${item.invoiceNo}", DI "\${item.diNo}", Item "\${item.itemName}", Serial "\${item.loaSerialNo}"\`);
      } else if (entries.length > 1) {
         errors.push(\`Row \${item.rowNumber}: Multiple StoreInwardEntries found matching the criteria. Please provide more specific data (e.g., Invoice No).\`);
      } else {
         const entryId = entries[0]._id;
         inwardEntriesArray.push(entryId);
         finalItems.push({ inwardEntryId: entryId, mhrovDoneQty: item.mhrovDoneQty });
      }
    }`;

if (code.includes(originalBlock)) {
    code = code.replace(originalBlock, newBlock);
    fs.writeFileSync(file, code);
    console.log('Performance fix patched successfully!');
} else {
    console.log('Failed to find original block for patching.');
}
