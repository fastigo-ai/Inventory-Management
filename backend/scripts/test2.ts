import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { WipRequiredRegister } from '../src/modules/wip-required/wipRequired.schema';
import { JmcRegister } from '../src/modules/jmc/jmc.schema';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const wipReq = await WipRequiredRegister.findOne({ wipRequiredNumber: "WIP/26/0001" });
  if (wipReq) {
    console.log("WIP Req Items:");
    wipReq.items.slice(0, 5).forEach((i: any) => console.log(`itemId: ${i.itemId}, loaSerialNo: ${i.loaSerialNo}, activity: ${i.activity}`));
  }
  process.exit(0);
}
run();
