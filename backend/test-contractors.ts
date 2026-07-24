import mongoose from 'mongoose';
import Contractor from './src/modules/contractors/contractor.model';

async function test() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect('mongodb+srv://fastigopvtltd_db_user:UpDQdSn25IPRy94R@cluster0.lgbl4nv.mongodb.net/?appName=Cluster0');
  console.log("Connected. Running getContractors...");
  
  const startTime = Date.now();
  const contractors = await Contractor.find({ status: 'Active' }).sort({ createdAt: -1 });
  const duration = Date.now() - startTime;
  
  console.log(`Success! Took ${duration}ms. Contractors count: ${contractors.length}`);
  
  process.exit(0);
}

test().catch(err => {
  console.error("FAILED:", err);
  process.exit(1);
});
