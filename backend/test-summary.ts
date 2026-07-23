import mongoose from 'mongoose';
import { buildStockSummaryData } from './src/modules/store/store.controller';

async function test() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  console.log("Connected. Running buildStockSummaryData...");
  
  const startTime = Date.now();
  const summary = await buildStockSummaryData();
  const duration = Date.now() - startTime;
  
  console.log(`Success! Took ${duration}ms. Summary keys count: ${Object.keys(summary).length}`);
  
  process.exit(0);
}

test().catch(err => {
  console.error("FAILED:", err);
  process.exit(1);
});
