
import * as dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { buildStockSummaryData } from './src/modules/store/store.controller';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('Connected to DB');
    
    // Nahan and A K Contractor
    const summary = await buildStockSummaryData('Nahan', undefined, '6a6345b98f02b0b289f7ecb6');
    
    console.log('Finding item 74 (LOA 407)');
    const item74 = summary.find((s: any) => s.tempCode === '74');
    console.log(item74);
    
    console.log('Finding item 4 (LOA 395)');
    const item4 = summary.find((s: any) => s.tempCode === '4');
    console.log(item4);
    
  } catch(e) { console.error(e) }
  process.exit(0);
};
run();

