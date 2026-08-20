import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { HoWorkOrder } from '../src/modules/contractor-billing/hoWorkOrder.schema';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI as string);
  const ho = await HoWorkOrder.findOne({ "lineItems.loaSerialNo": "2098" });
  console.log("HO Work Order:", ho ? ho.workOrderNumber : "Not found");
  if (ho) {
    const item = ho.lineItems.find((i: any) => String(i.loaSerialNo) === "2098");
    console.log("HO Item:", item);
  }
  process.exit(0);
}
run();
