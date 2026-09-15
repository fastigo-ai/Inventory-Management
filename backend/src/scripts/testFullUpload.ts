import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import xlsx from 'xlsx';
import { JmcRegister } from '../modules/jmc/jmc.schema';
// @ts-ignore
import { uploadJmcExcel } from '../modules/jmc/jmc.controller';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const testFullUpload = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(MONGO_URI as string);
    console.log('Connected to DB');

    const filePath = 'c:\\Users\\sanjeet kumar\\Desktop\\JMC PORTAL.xlsx';
    const fileBuffer = fs.readFileSync(filePath);

    // Mock Express Req/Res
    const req: any = {
      files: [{
        buffer: fileBuffer,
        originalname: 'JMC PORTAL.xlsx',
      }],
      body: {
        conflictStrategy: 'skip'
      },
      user: {
        _id: new mongoose.Types.ObjectId()
      }
    };

    const res: any = {
      status: (code: number) => ({
        json: (data: any) => {
          console.log(`Response ${code}:`, data);
        }
      }),
      json: (data: any) => {
        console.log('Response 200:', data);
      }
    };

    console.log('Running upload logic...');
    await uploadJmcExcel(req, res, () => {});
    
    console.log('Upload logic finished.');
    process.exit(0);
  } catch (error) {
    console.error('Fatal Error during upload:', error);
    process.exit(1);
  }
};

testFullUpload();
