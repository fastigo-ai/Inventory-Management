import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import xlsx from 'xlsx';
import { Contractor } from '../modules/contractors/contractor.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const resolveAll = async () => {
  try {
    const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL;
    await mongoose.connect(MONGO_URI as string);
    
    // Read Excel
    const filePath = 'c:\\Users\\sanjeet kumar\\Desktop\\JMC PORTAL.xlsx';
    const workbook = xlsx.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });

    let headerRowIdx = -1;
    for (let r = 0; r < 50; r++) {
      if (rows[r] && rows[r].some(c => String(c).toLowerCase().includes('loa'))) {
        headerRowIdx = r;
        break;
      }
    }

    const metaRows: Record<number, string> = {};
    for (let r = 0; r < headerRowIdx; r++) {
      const row = rows[r];
      if (!row) continue;
      for (let c = 0; c < 5; c++) {
        const cell = String(row[c] || '').toLowerCase();
        if (cell.includes('contractor')) metaRows[r] = 'Contractor';
      }
    }

    const targetCols = [144, 286, 288, 289, 290];
    
    for (const c of targetCols) {
      let contractorName = '';
      for (const [rIdx, field] of Object.entries(metaRows)) {
        contractorName = String(rows[Number(rIdx)][c] || '').trim();
      }
      
      if (!contractorName) {
        for (const [rIdx, field] of Object.entries(metaRows)) {
          for (let left = c - 1; left >= 5; left--) {
             if (rows[Number(rIdx)][left]) {
                 contractorName = String(rows[Number(rIdx)][left]).trim();
                 break;
             }
          }
        }
      }

      console.log(`Column ${c}: raw contractor name = "${contractorName}"`);
      
      let contractorId = null;
      if (contractorName) {
        const exactMatch = await Contractor.findOne({ name: new RegExp(`^${contractorName}$`, 'i') }).select('_id');
        if (exactMatch) {
           contractorId = exactMatch._id;
        } else {
           const fuzzyMatch = await Contractor.findOne({ name: new RegExp(contractorName.split(' ')[0], 'i') }).select('_id');
           if (fuzzyMatch) contractorId = fuzzyMatch._id;
        }
      }
      console.log(`Column ${c}: resolved ID = ${contractorId}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

resolveAll();
