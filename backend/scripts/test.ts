import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { ContractorWorkOrder } from '../src/modules/contractors/contractorWorkOrder.schema';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const wo = await ContractorWorkOrder.find({ contractorId: "6a6345b98f02b0b289f7ecb6" });
  console.log("Total Work Orders:", wo.length);
  if (wo.length > 0) {
    console.log("WO Package:", wo[0].package, "Circle:", wo[0].circle);
    console.log("Items:", wo[0].items.length);
    wo[0].items.slice(0, 5).forEach((i: any) => console.log(`itemId: ${i.itemId}, tempCode: ${i.tempCode}, loaSrNo: ${i.loaSrNo}`));
  }
  process.exit(0);
}
run();
