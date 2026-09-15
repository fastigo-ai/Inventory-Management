import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import xlsx from 'xlsx';
import { JmcRegister } from '../modules/jmc/jmc.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const testCol288 = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(MONGO_URI as string);
    console.log('Connected to DB');

    const filePath = 'c:\\Users\\sanjeet kumar\\Desktop\\JMC PORTAL.xlsx';
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });

    const c = 288; // 288 in my analysis is 288, but in 0-indexed it is 288 (col 289 in excel). Let's check!
    
    // Actually, I don't need to parse the whole sheet. I just want to know if `findOne` is finding it, or `create` is failing.
    // The user wants to know why the quantities are missing.
    // Wait, what if in Excel Column 288 is actually entirely empty?!
    // Let me check if there are any quantities in column 288!

    let headerRowIdx = 7; // As found earlier
    let qty = 0;
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
       const cell = rows[r][c];
       if (cell) {
         let val = cell;
         if (typeof val === 'string') val = val.replace(/,/g, '');
         let num = parseFloat(val);
         if (!isNaN(num)) qty += num;
       }
    }
    
    console.log(`Excel Column 288 Total Qty: ${qty}`);

    process.exit(0);
  } catch (error) {
    console.error('Fatal Error during test:', error);
    process.exit(1);
  }
};

testCol288();
