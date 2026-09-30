import mongoose from 'mongoose';
import * as xlsx from 'xlsx';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/erp_db';

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true }
});
const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);

function escapeRegex(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
}

async function checkItems() {
  try {
    await mongoose.connect(MONGO_URI);
    
    // Check the CSV
    const filePath = 'C:\\Users\\sanjeet kumar\\Desktop\\New Microsoft Excel Worksheetboq.csv';
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    const headers = data[0] as string[];
    
    let nameColIdx = headers.findIndex(h => {
        if (!h) return false;
        const lower = h.toString().toLowerCase();
        return lower.includes('item') || lower.includes('description') || lower.includes('material');
    });

    if (nameColIdx === -1) {
        nameColIdx = 1; // Fallback to column 1
    }

    console.log('Using column:', headers[nameColIdx]);

    const excelItems = [];
    for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (row && row[nameColIdx]) {
            excelItems.push(row[nameColIdx].toString().trim());
        }
    }

    const uniqueExcelItems = [...new Set(excelItems)].filter(Boolean);

    const missingItems = [];
    
    for (const itemName of uniqueExcelItems) {
        const safeRegex = escapeRegex(itemName);
        const exists = await Item.findOne({ name: { $regex: new RegExp('^' + safeRegex + '$', 'i') } });
        if (!exists) {
            missingItems.push(itemName);
        }
    }

    console.log('Total unique in CSV:', uniqueExcelItems.length);
    console.log('Missing items:', missingItems.length);
    console.log('--------------------------');
    missingItems.forEach(m => console.log(m));

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkItems();
