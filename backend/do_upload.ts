import 'dotenv/config';
import connectDB from './src/core/database';
import { uploadJmcExcel } from './src/modules/jmc/jmc.controller';
import fs from 'fs';
import mongoose from 'mongoose';

async function run() {
  await connectDB();
  console.log("Connected to DB...");
  const buffer = fs.readFileSync('c:\\Users\\sanjeet kumar\\Desktop\\jmc nahan.xlsx');
  const req = {
    files: [{ buffer, originalname: 'jmc nahan.xlsx' }],
    user: { _id: new mongoose.Types.ObjectId() }
  };
  
  const res = {
    status: (code: number) => ({
      json: (data: any) => {
        console.log('Status', code, 'Response:', JSON.stringify(data, null, 2));
        mongoose.connection.close();
        process.exit(0);
      }
    })
  };

  try {
    uploadJmcExcel(req as any, res as any, (err: any) => { if(err) console.error("Next error:", err); });
    console.log("Upload started...");
  } catch (e) {
    console.error(e);
  }
}
run();
