import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { JmcRegister } from '../modules/jmc/jmc.schema';
// @ts-ignore
import { uploadJmcExcel } from '../modules/jmc/jmc.controller';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const mockUpload = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(MONGO_URI as string);
    console.log('Connected to DB');

    const filePath = 'c:\\Users\\sanjeet kumar\\Desktop\\JMC PORTAL.xlsx';
    const fileBuffer = fs.readFileSync(filePath);

    // Provide a valid Contractor ID in body, just in case
    const contractor = await mongoose.models.Contractor.findOne().lean();

    const req: any = {
      files: [{
        buffer: fileBuffer,
        originalname: 'JMC PORTAL.xlsx',
      }],
      body: {
        conflictStrategy: 'update',
        contractorId: contractor ? contractor._id.toString() : ''
      },
      user: {
        _id: new mongoose.Types.ObjectId(),
        assignedCircle: 'nahan'
      },
      headers: {}, // to prevent "reading 'x-forwarded-for'" error
      connection: { remoteAddress: '127.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' }
    };

    const res: any = {
      status: (code: number) => ({
        json: (data: any) => {
          console.log(`Response ${code}:`, JSON.stringify(data, null, 2));
          process.exit(code === 200 ? 0 : 1);
        }
      }),
      json: (data: any) => {
        console.log('Response 200:', JSON.stringify(data, null, 2));
        process.exit(0);
      }
    };

    console.log('Running upload logic...');
    await uploadJmcExcel(req, res, (err: any) => {
        if (err) console.error('Next called with error:', err);
    });
    
  } catch (error) {
    console.error('Fatal Error during upload:', error);
    process.exit(1);
  }
};

mockUpload();
