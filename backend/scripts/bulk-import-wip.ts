import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { uploadWipExcel } from '../src/modules/wip/wip.controller';
import { uploadWipRequiredExcel } from '../src/modules/wip-required/wipRequired.controller';
import { WipRegister } from '../src/modules/wip/wip.schema';
import { WipRequiredRegister } from '../src/modules/wip-required/wipRequired.schema';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventory-management');
  console.log('Connected to DB');

  // Purge ALL Nahan Division data safely
  const w = await WipRegister.find({});
  let wids = [];
  for(const r of w) {
    if (r.division?.toLowerCase().includes('nahan') || r.circle?.toLowerCase().includes('nahan') || r.remarks?.toLowerCase().includes('nahan')) wids.push(r._id);
  }
  await WipRegister.deleteMany({ _id: { $in: wids } });
  console.log(`Deleted ${wids.length} existing WIP records for Nahan.`);

  const wr = await WipRequiredRegister.find({});
  let wrids = [];
  for(const r of wr) {
    if (r.division?.toLowerCase().includes('nahan') || r.circle?.toLowerCase().includes('nahan') || r.remarks?.toLowerCase().includes('nahan')) wrids.push(r._id);
  }
  await WipRequiredRegister.deleteMany({ _id: { $in: wrids } });
  console.log(`Deleted ${wrids.length} existing WIP Required records for Nahan.`);

  // Dummy user for creation
  const mockUser = { _id: new mongoose.Types.ObjectId(), assignedPackage: '', assignedCircle: '' };

  const createMockReqRes = (files: any[]) => {
    const req = {
      files,
      user: mockUser,
      headers: { "x-forwarded-for": "127.0.0.1" },
      ip: "127.0.0.1",
      originalUrl: "/bulk-import"
    } as any;
    
    let resolveRes: any;
    const resPromise = new Promise((res) => { resolveRes = res; });
    const res = {
      status: function(code: number) {
        return this;
      },
      json: function(data: any) {
        resolveRes(data);
      }
    } as any;
    return { req, res, resPromise };
  };

  // Import WIP Consumed
  const wipDir = '/Users/Apple/Desktop/WIP CONSUMED';
  const wipFiles = fs.readdirSync(wipDir).filter(f => f.endsWith('.xlsx'));
  console.log(`Found ${wipFiles.length} WIP files.`);
  
  const multerWipFiles = wipFiles.map(f => ({
    originalname: f,
    buffer: fs.readFileSync(path.join(wipDir, f))
  }));

  if (multerWipFiles.length > 0) {
    const { req, res, resPromise } = createMockReqRes(multerWipFiles);
    const next = (err: any) => { console.error('Error in controller:', err); };
    await (uploadWipExcel as any)(req, res, next);
    const result = await resPromise;
    console.log('WIP Upload Result:', JSON.stringify(result, null, 2));
  }

  // Import WIP Required
  const reqDir = '/Users/Apple/Desktop/WIP TO BE REQUIRED';
  const reqFiles = fs.readdirSync(reqDir).filter(f => f.endsWith('.xlsx'));
  console.log(`Found ${reqFiles.length} WIP Required files.`);
  
  const multerReqFiles = reqFiles.map(f => ({
    originalname: f,
    buffer: fs.readFileSync(path.join(reqDir, f))
  }));

  if (multerReqFiles.length > 0) {
    const { req, res, resPromise } = createMockReqRes(multerReqFiles);
    const next = (err: any) => { console.error('Error in controller:', err); };
    await (uploadWipRequiredExcel as any)(req, res, next);
    const result = await resPromise;
    console.log('WIP Required Upload Result:', JSON.stringify(result, null, 2));
  }

  // Report on missing items
  console.log('\n--- Checking for Unmapped Items in the Database ---');
  
  const unmappedItems: any[] = [];
  
  const allWips = await WipRegister.find({}).lean();
  for (const doc of allWips) {
    for (const it of doc.items as any) {
      if (!it.itemId) {
        unmappedItems.push({
          source: 'WIP Consumed',
          contractor: doc.remarks, // Has filename
          description: it.description,
          activity: it.activity,
          tempCodeProvided: it.tempCode,
          loaProvided: it.loaSerialNo
        });
      }
    }
  }

  const allReqs = await WipRequiredRegister.find({}).lean();
  for (const doc of allReqs) {
    for (const it of doc.items as any) {
      if (!it.itemId) {
        unmappedItems.push({
          source: 'WIP Required',
          contractor: doc.remarks,
          description: it.description,
          activity: it.activity,
          tempCodeProvided: it.tempCode,
          loaProvided: it.loaSerialNo
        });
      }
    }
  }

  fs.writeFileSync(path.join(__dirname, 'unmapped_items_report.json'), JSON.stringify(unmappedItems, null, 2));
  console.log(`Wrote ${unmappedItems.length} unmapped items to backend/scripts/unmapped_items_report.json`);

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(console.error);
