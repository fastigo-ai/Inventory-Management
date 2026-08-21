import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { ContractorAssignment } from '../src/modules/contractors/contractorAssignment.schema';
import Item from '../src/modules/items/item.model';
import { ContractorWorkOrder } from '../src/modules/contractors/contractorWorkOrder.schema';

async function migrate() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_system';
    console.log(`Connecting to database...`);
    await mongoose.connect(uri);
    console.log('Connected to MongoDB.');

    // Fetch all MINs (Contractor Assignments)
    const assignments = await ContractorAssignment.find({});
    console.log(`Found ${assignments.length} assignments to process.`);

    let updatedCount = 0;
    let missingCount = 0;

    for (const assignment of assignments) {
      let needsSave = false;
      const circle = assignment.location || assignment.circle || ''; // Often stored in location
      
      for (const lineItem of assignment.lineItems || []) {
        if (!lineItem.loaSrNo || lineItem.loaSrNo.trim() === '') {
          let foundLoaSrNo = '';

          // 1. Try Item Master First
          if (lineItem.itemId) {
            const item = await Item.findById(lineItem.itemId);
            if (item && item.dynamicData) {
              foundLoaSrNo = item.dynamicData.loaSrNo || item.dynamicData.loaSerialNo || item.dynamicData.loaSerialNumber || item.dynamicData.sku || '';
            }
          }

          if (!foundLoaSrNo && lineItem.tempCode) {
            const item = await Item.findOne({ 'dynamicData.tempCode': lineItem.tempCode, isDeleted: false });
            if (item && item.dynamicData) {
              foundLoaSrNo = item.dynamicData.loaSrNo || item.dynamicData.loaSerialNo || item.dynamicData.loaSerialNumber || item.dynamicData.sku || '';
            }
          }

          // 2. Try Contractor Work Orders if still not found
          if (!foundLoaSrNo && assignment.contractorId) {
            const woQuery: any = { contractorId: assignment.contractorId };
            if (circle) woQuery.circle = circle;
            
            const workOrders = await ContractorWorkOrder.find(woQuery).lean() as any[];
            for (const wo of workOrders) {
              for (const wi of wo.items || []) {
                const matchTempCode = lineItem.tempCode && wi.tempCode && String(wi.tempCode).trim().toLowerCase() === String(lineItem.tempCode).trim().toLowerCase();
                const matchName = lineItem.itemName && wi.itemName && String(wi.itemName).trim().toLowerCase() === String(lineItem.itemName).trim().toLowerCase();
                const matchActivity = lineItem.activity && wi.activity && String(wi.activity).trim().toLowerCase() === String(lineItem.activity).trim().toLowerCase();
                
                // If it matches temp code or (name AND activity)
                if (matchTempCode || (matchName && matchActivity)) {
                  if (wi.loaSrNo) {
                    foundLoaSrNo = wi.loaSrNo;
                    break;
                  }
                }
              }
              if (foundLoaSrNo) break;
            }
          }

          // Apply if found
          if (foundLoaSrNo) {
            lineItem.loaSrNo = foundLoaSrNo;
            needsSave = true;
          } else {
            missingCount++;
            console.log(`Could not find LOA Sr No for MIN: ${assignment.assignmentNumber}, Item: ${lineItem.itemName} (TempCode: ${lineItem.tempCode}, Activity: ${lineItem.activity})`);
          }
        }
      }

      if (needsSave) {
        await assignment.save();
        updatedCount++;
        console.log(`Updated MIN: ${assignment.assignmentNumber}`);
      }
    }

    console.log(`Migration Complete. Updated ${updatedCount} MINs. Could not find LOA Sr No for ${missingCount} items.`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

migrate();
