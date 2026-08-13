import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Contractor } from './src/modules/contractors/contractor.schema';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Connected");
  
  try {
    const doc = new Contractor({
      dynamicData: { companyName: "Test" },
      isActive: true
    });
    const error = doc.validateSync();
    if (error) {
      console.log("Validation error:", error.message);
    } else {
      console.log("Validation successful");
    }
  } catch (e: any) {
    console.error(e.message);
  }
  process.exit(0);
}
run();
