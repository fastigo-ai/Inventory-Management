import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../.env' });

const jmcSchema = new mongoose.Schema({}, { strict: false, collection: 'jmcregisters' });
const JmcRegister = mongoose.models.JmcRegister || mongoose.model('JmcRegister', jmcSchema);

async function check() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected to MongoDB.");

  const contractorId = "66f7f2d3d927c62bb1e82ef6";
  const records = await JmcRegister.find({ contractorId }).lean();
  
  let totalJmcByItem: Record<string, number> = {};

  records.forEach((r: any) => {
    (r.items || []).forEach((item: any) => {
      const tc = item.tempCode || item.materialCode;
      if (!totalJmcByItem[tc]) totalJmcByItem[tc] = 0;
      totalJmcByItem[tc] += (Number(item.approvedQty) || Number(item.claimedQty) || Number(item.quantity) || 0);
    });
  });

  console.log("Aggregated JMC Done for Gian Chand Contractor by Item:");
  console.log(totalJmcByItem);
  
  process.exit(0);
}

check();
