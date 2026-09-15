import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import xlsx from 'xlsx';
import { JmcRegister } from '../modules/jmc/jmc.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const investigate = async () => {
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
        if (cell.includes('sub') && cell.includes('station')) metaRows[r] = 'SubStation';
        else if (cell.includes('feeder')) metaRows[r] = 'Feeder';
        else if (cell.includes('location')) metaRows[r] = 'Location';
      }
    }

    const excelItems: any[] = [];
    
    for (let c = 5; c < rows[headerRowIdx].length; c++) {
      if (!rows[headerRowIdx][c]) continue;
      
      const meta: any = {};
      for (const [rIdx, field] of Object.entries(metaRows)) {
        meta[field] = String(rows[Number(rIdx)][c] || '').trim().toLowerCase();
      }
      
      for (const [rIdx, field] of Object.entries(metaRows)) {
        if (!meta[field]) {
          for (let left = c - 1; left >= 5; left--) {
             if (rows[Number(rIdx)][left]) {
                 meta[field] = String(rows[Number(rIdx)][left]).trim().toLowerCase();
                 break;
             }
          }
        }
      }

      if (meta.Location === 'bhagwanpur') {
        let colQty = 0;
        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          let val = rows[r][c];
          if (val) {
             if (typeof val === 'string') val = val.replace(/,/g, '');
             const qty = parseFloat(val);
             if (!isNaN(qty)) {
               colQty += qty;
               excelItems.push({
                 col: c,
                 row: r,
                 desc: rows[r][3], // description col
                 qty: qty
               });
             }
          }
        }
        console.log(`Column ${c} (Bhagwanpur) Contractor: ${meta.Contractor}, Total Qty in Excel: ${colQty}`);
      }
    }

    // Read DB
    const dbJmcs = await JmcRegister.find({ location: /bhagwanpur/i }).lean();
    console.log(`\nFound ${dbJmcs.length} JMCs for Bhagwanpur in DB.`);
    
    for (const jmc of dbJmcs) {
      let jmcQty = 0;
      for (const item of jmc.items) {
        jmcQty += item.claimedQty || 0;
      }
      console.log(`JMC ${jmc.jmcNumber} (Contractor: ${jmc.contractorId}) Total Qty: ${jmcQty}. Items count: ${jmc.items.length}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

investigate();
