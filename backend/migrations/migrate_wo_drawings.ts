import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { ContractorWorkOrder } from '../src/modules/contractors/contractorWorkOrder.schema';

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI as string);
  console.log("Connected to MongoDB.");

  const workOrders = await ContractorWorkOrder.find({ drawings: { $exists: false } }).lean();
  console.log(`Found ${workOrders.length} work orders to migrate.`);

  let count = 0;
  for (const wo of workOrders as any[]) {
    const defaultDrawing = {
      drawingNumber: "MIGRATED-" + wo.workOrderNumber,
      division: wo.division || '',
      subDivision: wo.subDivision || '',
      location: wo.location || ''
    };
    
    await ContractorWorkOrder.updateOne(
      { _id: wo._id },
      { 
        $set: { 
          drawings: [defaultDrawing],
          originalWorkOrderId: wo._id,
          handoverStatus: 'Active'
        },
        $unset: { division: "", subDivision: "", location: "" }
      }
    );
    count++;
  }

  console.log(`Migration complete. Migrated ${count} Work Orders.`);
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
