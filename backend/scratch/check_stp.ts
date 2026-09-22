import mongoose from 'mongoose';
import { ContractorAssignment } from '../src/modules/contractors/contractorAssignment.schema';

const run = async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/inventory-management');
  
  const assignments = await ContractorAssignment.find({
    status: { $ne: 'Cancelled' },
    $or: [{ circle: /Rohru/i }, { location: /Rohru/i }, { 'lineItems.circle': /Rohru/i }]
  }).lean();
  
  let stpQty = 0;
  for (const a of assignments) {
    for (const item of a.lineItems) {
      if (item.itemName && item.itemName.toLowerCase().includes('stp')) {
        const qty = Number(item.quantity || item.demandQty || 0);
        console.log(`Found ${qty} of ${item.itemName} in MIN ${a.assignmentNumber} (LOA: ${item.loaSerialNo || item.loaSrNo}, TempCode: ${item.tempCode})`);
        stpQty += qty;
      }
    }
  }
  console.log('Total MIN Qty for STP 9 Meter Pole:', stpQty);
  
  await mongoose.disconnect();
};

run().catch(console.error);
