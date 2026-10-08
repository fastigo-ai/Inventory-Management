import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { computeItemMatrixSummary } from './src/modules/reports/summary/summary.controller';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/erp').then(async () => {
  console.log("Fetching summary...");
  // Need to mock express request/response
  const req = { query: {} };
  let responseData: any = null;
  const res = {
    status: () => res,
    json: (data: any) => { responseData = data; }
  };
  
  await computeItemMatrixSummary(req as any, res as any);
  
  if (responseData && responseData.success) {
    const items = responseData.data.items;
    console.log(`Got ${items.length} items`);
    for (const item of items) {
      const supply60 = (item.supplyBilledSolan_60 || 0) + (item.supplyBilledNahan_60 || 0) + (item.supplyBilledRampur_60 || 0) + (item.supplyBilledRohru_60 || 0);
      if (supply60 >= 8200 && supply60 <= 8300) {
        console.log(`FOUND ROW! TempCode: ${item.tempCode}, ItemName: ${item.itemName}`);
        console.log(`  Solan60: ${item.supplyBilledSolan_60}, Nahan60: ${item.supplyBilledNahan_60}, Rampur60: ${item.supplyBilledRampur_60}, Rohru60: ${item.supplyBilledRohru_60}`);
        console.log(`  JmcTotal: ${(item.imcSolan || 0) + (item.imcNahan || 0) + (item.imcRampur || 0) + (item.imcRohru || 0)}`);
      }
    }
  } else {
    console.log("Failed to get response data");
  }
  
  process.exit(0);
}).catch(console.error);
