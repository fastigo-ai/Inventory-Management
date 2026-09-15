import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });
import { ContractorAssignment } from '../modules/contractors/contractorAssignment.schema';

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  
  const assignments = await ContractorAssignment.find({ subcircle: /kumarhatti/i }).lean();
  let totalIssued = 0;
  let itemsCounted = 0;
  let zeroQtyCount = 0;
  let missingKeyCount = 0;
  
  assignments.forEach(doc => {
    (doc.lineItems || []).forEach((line: any) => {
      const qty = Number(line.quantity || line.demandQty || 0);
      if (qty > 0) {
        totalIssued += qty;
        itemsCounted++;
      } else {
        zeroQtyCount++;
      }
    });
  });

  console.log(`Assignments Found: ${assignments.length}`);
  console.log(`Total Issued Qty (sum of all lineItem.quantity > 0): ${totalIssued}`);
  console.log(`Line Items with >0 Qty: ${itemsCounted}`);
  console.log(`Line Items with 0 Qty: ${zeroQtyCount}`);
  
  process.exit(0);
}
check();
