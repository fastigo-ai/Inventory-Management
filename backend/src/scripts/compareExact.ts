import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import xlsx from 'xlsx';
import { JmcRegister } from '../modules/jmc/jmc.schema';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const compareExact = async () => {
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
        else if (cell.includes('division') && !cell.includes('sub')) metaRows[r] = 'Division';
        else if (cell.includes('sub') && cell.includes('division')) metaRows[r] = 'SubDivision';
        else if (cell.includes('circle') && !cell.includes('sub')) metaRows[r] = 'Circle';
        else if (cell.includes('contractor')) metaRows[r] = 'Contractor';
      }
    }

    const excelQuantities: Record<string, number> = {};

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

      const key = `${meta.Location}|${meta.SubStation}|${meta.Feeder}`;
      
      let colQty = 0;
      for (let r = headerRowIdx + 1; r < rows.length; r++) {
        const qty = parseFloat(rows[r][c]);
        if (!isNaN(qty)) {
          colQty += qty;
        }
      }

      excelQuantities[key] = (excelQuantities[key] || 0) + colQty;
    }

    // Read DB
    const dbJmcs = await JmcRegister.find({ circle: /nahan/i }).lean();
    const dbQuantities: Record<string, number> = {};

    for (const jmc of dbJmcs) {
      const key = `${String(jmc.location || '').trim().toLowerCase()}|${String(jmc.subStation || '').trim().toLowerCase()}|${String(jmc.feeder || '').trim().toLowerCase()}`;
      let jmcQty = 0;
      for (const item of jmc.items) {
        jmcQty += item.claimedQty || 0;
      }
      dbQuantities[key] = (dbQuantities[key] || 0) + jmcQty;
    }

    let diffCount = 0;
    console.log('--- Discrepancies ---');
    for (const key of Object.keys(excelQuantities)) {
      const eq = Number(excelQuantities[key].toFixed(2));
      const dq = Number((dbQuantities[key] || 0).toFixed(2));
      if (Math.abs(eq - dq) > 0.01) {
        console.log(`Mismatch for ${key}:`);
        console.log(`  Excel Qty: ${eq}`);
        console.log(`  DB Qty:    ${dq}`);
        console.log(`  Diff:      ${eq - dq}`);
        diffCount++;
      }
    }
    
    // Check if any DB keys are missing from Excel
    for (const key of Object.keys(dbQuantities)) {
      if (!excelQuantities[key]) {
        console.log(`DB has extra data for ${key}: ${dbQuantities[key]}`);
      }
    }

    console.log(`\nTotal Discrepancies: ${diffCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

compareExact();
